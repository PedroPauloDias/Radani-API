const express = require("express");
const Produto = require("../models/product");
const cloudinary = require("../utils/cloudinary");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const streamifier = require('streamifier');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image.jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  }
});



// Endpoint para criar um produto
router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'cores', maxCount: 10 }]), async (req, res) => {
  try {
    const { name, tag, description, ref, cod, sizes } = req.body;
    const coresFiles = req.files['cores'] || [];  

    if (!req.files || !req.files['image']) {
      return res.status(400).send({ message: 'Nenhum arquivo principal enviado' });
    }

    // Processar o arquivo principal
    const mainFile = req.files['image'][0];
    const mainFileStream = streamifier.createReadStream(mainFile.buffer);

    const uploadResMain = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'produtos', upload_preset: 'radani_conf' }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
      mainFileStream.pipe(stream);
    });

    const mainImage = {
      public_id: uploadResMain.public_id,
      url: uploadResMain.secure_url,
    };

    // Processar os arquivos das cores, se existirem
    const coresUploads = await Promise.all(coresFiles.map(async (file, index) => {
      console.log(`Processando arquivo de cores ${index + 1}`);
      
      const fileStream = streamifier.createReadStream(file.buffer);
      const uploadRes = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'produtos', upload_preset: 'radani_conf' },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );
        fileStream.pipe(stream);
      });

      return {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
      };
    }));

    // Log para verificar coresUploads
    console.log('Cores uploads:', coresUploads);

    // Criar uma nova instância do modelo Produto com os dados fornecidos
    const produto = new Produto({
      name,
      tag,
      description,
      ref,
      image: mainImage,
      cores: coresUploads,
      cod,
      sizes
    });

    // Salvar o produto no banco de dados
    const savedProduto = await produto.save();

    res.status(201).json({ message: 'Produto criado com sucesso', produto: savedProduto });
  } catch (error) {
    console.error("Erro ao salvar produto:", error);
    res.status(500).json({ message: 'Erro ao salvar produto', error });
  }
});
// Endpoint PUT para atualizar um produto existente

router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'cores', maxCount: 10 }]), async (req, res) => {
  try {
    const produtoId = req.params.id;
    const { name, tag, description, ref, cod, sizes } = req.body;

    if (!produtoId) {
      return res.status(400).send({ message: 'ID do produto não fornecido' });
    }

    // Atualizar o produto
    const produto = await Produto.findById(produtoId);

    if (!produto) {
      return res.status(404).send({ message: 'Produto não encontrado' });
    }

    // Processar o arquivo principal se presente
    if (req.files && req.files['image']) {
      const mainFile = req.files['image'][0];
      const mainFileStream = streamifier.createReadStream(mainFile.buffer);

      const uploadResMain = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: 'produtos', upload_preset: 'radani_conf' }, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
        mainFileStream.pipe(stream);
      });

      produto.image = {
        public_id: uploadResMain.public_id,
        url: uploadResMain.secure_url,
      };
    }

    // Processar os arquivos das cores se presentes
    if (req.files && req.files['cores']) {
      const coresFiles = req.files['cores'];
      const coresUploads = await Promise.all(coresFiles.map(async (file) => {
        const fileStream = streamifier.createReadStream(file.buffer);
        const uploadRes = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ folder: 'produtos', upload_preset: 'radani_conf' }, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
          fileStream.pipe(stream);
        });
        return {
          public_id: uploadRes.public_id,
          url: uploadRes.secure_url,
        };
      }));
      produto.cores = coresUploads;
    }

    // Atualizar outros campos
    produto.name = name || produto.name;
    produto.tag = tag || produto.tag;
    produto.description = description || produto.description;
    produto.ref = ref || produto.ref;
    produto.cod = cod || produto.cod;
    produto.sizes = sizes || produto.sizes;

    // Salvar as alterações no banco de dados
    const updatedProduto = await produto.save();

    res.status(200).json({ message: 'Produto atualizado com sucesso', produto: updatedProduto });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ message: 'Erro ao atualizar produto', error });
  }
});


// Endpoint GET para listar produtos
router.get('/', async (req, res) => {
  try {
    const produtos = await Produto.find().sort({ ref: 1 });
    res.status(200).json(produtos);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar produtos" });
  }
});

// Endpoint GET para buscar produtos por query
router.get('/busca/:query', async (req, res) => {
  const query = req.params.query;
  let page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;

  try {
    if (!query) {
      return res.status(400).json({ message: 'A consulta não pode ser vazia' });
    }

    let produtosQuery;
    let totalProdutos;

    [produtosQuery, totalProdutos] = await Promise.all([
      Produto.find({ ref: query }).sort({ ref: 1 }).skip((page - 1) * pageSize).limit(pageSize),
      Produto.countDocuments({ ref: query })
    ]);

    if (produtosQuery.length === 0) {
      const regexQuery = new RegExp(query, 'i');
      [produtosQuery, totalProdutos] = await Promise.all([
        Produto.find({
          $or: [
            { name: { $regex: regexQuery } },
            { tag: { $regex: regexQuery } }
          ]
        }).skip((page - 1) * pageSize).limit(pageSize),
        Produto.countDocuments({
          $or: [
            { name: { $regex: regexQuery } },
            { tag: { $regex: regexQuery } }
          ]
        })
      ]);
    }

    if (produtosQuery.length === 0) {
      return res.status(404).json({ message: `Nenhum produto encontrado com a busca '${query}'` });
    }

    const totalPages = Math.ceil(totalProdutos / pageSize);
    if (page < 1) page = 1;
    else if (page > totalPages) page = totalPages;

    res.json({
      produtos: produtosQuery,
      totalPages,
      currentPage: page,
      totalItems: totalProdutos,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    });

  } catch (error) {
    console.error("Erro ao buscar produtos por query:", error);
    res.status(500).json({ message: "Erro ao buscar produtos por query" });
  }
});

// Endpoint GET para buscar um produto pelo ID
router.get('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const produto = await Produto.findById(id);
    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado pelo ID" });
    }
    res.json(produto);
  } catch (error) {
    console.error("Erro ao buscar produto pelo ID:", error);
    res.status(500).json({ message: "Erro ao buscar produto pelo ID" });
  }
});


router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Encontrar e remover o produto pelo ID
    const produto = await Produto.findByIdAndDelete(id);

    if (!produto) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    res.status(200).json({ message: 'Produto removido com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao remover o produto' });
  }
});




// Rota DELETE para remover um item específico de cores
router.delete('/api/products/:productId/cores/:coreId', async (req, res) => {
  const { productId, coreId } = req.params;

  try {
    // Encontrar o produto pelo ID
    const produto = await Produto.findById(productId);

    if (!produto) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Filtrar a array cores para remover o item com o coreId
    produto.cores = produto.cores.filter(cor => cor._id.toString() !== coreId);

    // Salvar as alterações no produto
    await produto.save();

    res.status(200).json({ message: 'Item de cores removido com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao remover item de cores' });
  }
});

module.exports = router;
