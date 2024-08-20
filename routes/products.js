const express = require("express");
const Produto = require("../models/product");
const cloudinary = require("../utils/cloudinary");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const uploadDir = 'uploads/';

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

const upload = multer({ storage: storage });

// Endpoint POST para criar um novo produto

router.post('/pedro', async (req, res) => {
  res.status(400).json({ error: 'pedro' })
})

router.post('/', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'cores', maxCount: 10 } // Ajuste maxCount conforme necessário
]), async (req, res) => {
  const { name, tag, description, ref, cod, sizes } = req.body;
  const image = req.files['image'] ? req.files['image'][0] : null;
  const coresFiles = req.files['cores'] || []; // Pode ser um array vazio se não houver arquivos

  if (!image) {
    return res.status(400).json({ message: 'Imagem é obrigatória' });
  }

  try {
    // Upload da imagem principal para o Cloudinary
    const uploadRes = await cloudinary.uploader.upload(image.path, {
      folder: "produtos",
      upload_preset: "radani_conf"
    });

    // Upload das imagens adicionais (cores) para o Cloudinary, se existirem
    const coresUploads = coresFiles.length > 0 ? await Promise.all(coresFiles.map(async (file) => {
      const uploadRes = await cloudinary.uploader.upload(file.path, {
        folder: "produtos",
        upload_preset: "radani_conf"
      });
      fs.unlinkSync(file.path);
      return {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
      };
    })) : [];

    const novoProduto = new Produto({
      name,
      tag,
      description,
      ref,
      cod,
      sizes,
      image: {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
      },
      cores: coresUploads,
    });

    const savedProduct = await novoProduto.save();

    fs.unlinkSync(image.path);

    res.status(201).json(savedProduct);

  } catch (error) {
    console.error("Error ao salvar produto:", error);
    res.status(500).json({ message: "Erro ao salvar produto" });
  }
});


// Endpoint PUT para atualizar um produto existente

router.put('/:id', upload.fields([{ name: 'image' }, { name: 'cores' }]), async (req, res) => {
  const id = req.params.id;
  const { name, tag, description, ref, cod, sizes } = req.body;
  const image = req.files['image'] ? req.files['image'][0] : null;
  const coresFiles = req.files['cores'] || []; // Pode ser um array vazio se `cores` não for enviado

  try {
    // Verificar se o produto existe
    const produto = await Produto.findById(id);
    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado pelo ID" });
    }

    // Se há uma imagem principal enviada, faça o upload para o Cloudinary
    if (image) {
      const uploadRes = await cloudinary.uploader.upload(image.path, {
        folder: "produtos",
        upload_preset: "radani_conf"
      });

      produto.image = {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
      };

      // Remover o arquivo local após o upload para o Cloudinary
      fs.unlinkSync(image.path);
    }

    // Se há imagens adicionais (cores) enviadas, faça o upload para o Cloudinary e atualize o array cores
    if (coresFiles.length > 0) {
      const coresUploads = await Promise.all(coresFiles.map(async (file) => {
        const uploadRes = await cloudinary.uploader.upload(file.path, {
          folder: "produtos",
          upload_preset: "radani_conf"
        });

        // Remover o arquivo local após o upload para o Cloudinary
        fs.unlinkSync(file.path);

        return {
          public_id: uploadRes.public_id,
          url: uploadRes.secure_url,
        };
      }));

      produto.cores = coresUploads;
    }

    // Atualizar os outros campos
    if (name) produto.name = name;
    if (tag) produto.tag = tag;
    if (description) produto.description = description;
    if (ref) produto.ref = ref;
    if (cod) produto.cod = cod;
    if (sizes) produto.sizes = sizes;

    // Salvar o produto atualizado no MongoDB
    await produto.save();

    // Retornar o produto atualizado
    res.json({ message: "Produto atualizado com sucesso", produto });

  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ message: "Erro ao atualizar o produto" });
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
