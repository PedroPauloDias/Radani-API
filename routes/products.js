const express = require("express");
const Produto = require("../models/product");
const cloudinary = require("../utils/cloudinary");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Certificar-se de que a pasta 'uploads' existe
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

router.post('/', upload.single('image'), async (req, res) => {
  const { name, tag, description, ref, cod, sizes } = req.body;
  const image = req.file;

  if (!image) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  try {
    // Upload para o Cloudinary
    const uploadRes = await cloudinary.uploader.upload(image.path, {
      folder: "produtos",
      upload_preset: "radani_conf"
    });

    // Criação do produto
    const novoProduto = new Produto({
      name,
      tag,
      description,
      ref,
      image: {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
      },
      cod,
      sizes
    });

    // Salvar no MongoDB
    const savedProduct = await novoProduto.save();
    
    // Responder com o produto salvo
    res.status(201).json(savedProduct);

    // Remover o arquivo local após o upload para o Cloudinary
    fs.unlinkSync(image.path);

  } catch (error) {
    console.error("Error ao salvar produto:", error);
    res.status(500).json({ message: "Erro ao salvar produto" });
  }
});

router.get('/', async (req, res) => {
  try {
    const produtos = await Produto.find().sort({ ref: 1 });
    res.status(200).send(produtos);
  } catch (error) {
    res.status(500).send({ message: "Erro ao buscar produto" });
  }
});


router.get('/:query', async (req, res) => {
  const query = req.params.query;
  let page = parseInt(req.query.page) || 1; // Página atual, padrão é 1
  const pageSize = parseInt(req.query.pageSize) || 10; // Tamanho da página, padrão é 10

  try {
    let produtosQuery;
    let totalProdutos;

    if (!query) {
      return res.status(400).json({ message: 'A consulta não pode ser vazia' });
    }

    // Tenta encontrar produtos pelo ref
    [produtosQuery, totalProdutos] = await Promise.all([
      Produto.find({ ref: query }).sort({ ref: 1 }).skip((page - 1) * pageSize).limit(pageSize),
      Produto.countDocuments({ ref: query })
    ]);

    // Se não encontrou produtos pelo ref, tenta buscar por nome ou tag
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

    // Verifica se encontrou produtos
    if (produtosQuery.length === 0) {
      return res.status(404).json({ message: `Nenhum produto encontrado com a busca '${query}'` });
    }

    // Calcula o número total de páginas
    const totalPages = Math.ceil(totalProdutos / pageSize);

    // Verifica se a página solicitada é válida
    if (page < 1) {
      page = 1;
    } else if (page > totalPages) {
      page = totalPages;
    }

    // Retorna os produtos encontrados e informações de paginação
    return res.json({
      produtos: produtosQuery,
      totalPages,
      currentPage: page,
      totalItems: totalProdutos,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    });

  } catch (error) {
    console.error("Erro ao buscar produtos por query:", error);
    // Retorna um erro 500 em caso de falha na consulta
    return res.status(500).json({ message: "Erro ao buscar produtos por query" });
  }
});


// Rota para buscar um produto pelo ID
router.get('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const produto = await Produto.findById(id);
    ;

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado pelo ID" });
    }

    // Retorna o produto encontrado
    res.json(produto);

  } catch (error) {
    console.error("Erro ao buscar produto pelo ID:", error);
    // Retorna um erro 500 em caso de falha na consulta
    res.status(500).json({ message: "Erro ao buscar produto pelo ID" });
  }
});




router.get('/produtos/busca/:query', async (req, res) => {
  const query = req.params.query;
  let page = parseInt(req.query.page) || 1; // Página atual, padrão é 1
  const pageSize = parseInt(req.query.pageSize) || 10; // Tamanho da página, padrão é 10

  try {
    let produtosQuery;
    let totalProdutos;

    if (!query) {
      return res.status(400).json({ message: 'A consulta não pode ser vazia' });
    }

    // Tenta encontrar produtos pelo ref
    [produtosQuery, totalProdutos] = await Promise.all([
      Produto.find({ ref: query }).sort({ ref: 1 }).skip((page - 1) * pageSize).limit(pageSize),
      Produto.countDocuments({ ref: query })
    ]);

    // Se não encontrou produtos pelo ref, tenta buscar por nome ou tag
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

    // Verifica se encontrou produtos
    if (produtosQuery.length === 0) {
      return res.status(404).json({ message: `Nenhum produto encontrado com a busca '${query}'` });
    }

    // Calcula o número total de páginas
    const totalPages = Math.ceil(totalProdutos / pageSize);

    // Verifica se a página solicitada é válida
    if (page < 1) {
      page = 1;
    } else if (page > totalPages) {
      page = totalPages;
    }

    // Retorna os produtos encontrados e informações de paginação
    return res.json({
      produtos: produtosQuery,
      totalPages,
      currentPage: page,
      totalItems: totalProdutos,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    });

  } catch (error) {
    console.error("Erro ao buscar produtos por query:", error);
    // Retorna um erro 500 em caso de falha na consulta
    return res.status(500).json({ message: "Erro ao buscar produtos por query" });
  }
});


// Rota para buscar um produto pelo ID
router.get('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const produto = await Produto.findById(id);
    ;

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado pelo ID" });
    }

    // Retorna o produto encontrado
    res.json(produto);

  } catch (error) {
    console.error("Erro ao buscar produto pelo ID:", error);
    // Retorna um erro 500 em caso de falha na consulta
    res.status(500).json({ message: "Erro ao buscar produto pelo ID" });
  }
});





// Rota para buscar um produto pelo ID
// app.get('/produtos/:id', async (req, res) => {
//   const id = req.params.id;

//   try {
//     const produto = await Produto.findById(id);

//     if (!produto) {
//       return res.status(404).json({ message: "Produto não encontrado" });
//     }

//     // Retorna o produto encontrado
//     res.json(produto);

//   } catch (error) {
//     console.error("Erro ao buscar produto pelo ID:", error);
//     // Retorna um erro 500 em caso de falha na consulta
//     res.status(500).json({ message: "Erro ao buscar produto pelo ID" });
//   }
// });


// app.get("/produtos/:id", async (req, res) => {
//   try {
//     const produto = await Produto.findById(req.params.id);
//     if (!produto) {
//       return res.status(404).send({ message: "Produto não encontrado" });
//     }
//     return res.send(produto);
//   } catch (error) {
//     console.error("Erro ao buscar produto:", error);
//     return res.status(500).send({ message: "Erro ao buscar produto pelo id " });
//   }
// });




module.exports = router;
