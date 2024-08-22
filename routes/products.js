const express = require("express");
const Produto = require("../models/product");
const cloudinary = require("../utils/cloudinary");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const streamifier = require('streamifier');


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
