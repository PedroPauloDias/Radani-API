const express = require("express");
const mongoose = require("mongoose");
require('dotenv').config();
const cors = require('cors');

const app = express();


 

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:3000','http://localhost:3001', 'https://radani.vercel.app'];
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido CORS'));
    }
  },
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));



const port = process.env.PORT || 3000;

const mongoDbUri = process.env.MONGODB_URI;
console.log('MongoDB URI:', mongoDbUri);

// Conectar ao MongoDB
mongoose.connect(mongoDbUri, {
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Erro de conexão com o MongoDB:'));
db.once('open', () => {
  console.log('Conectado ao MongoDB.');
});

// Scheema produtos
const Produto = mongoose.model('Produto', {
  name: String,
  tag: String,
  description: String,
  ref: Number,
  image: {
    cores: {
      amarelo: String,
      azul: String,
      branco: String,
      rosa: String,
      verde: String
    },
  },
  cod: String,
  sizes:String 
 
});

// Scheema produtos
const Categoria = mongoose.model('Categoria', {
  name: String,
  image: String,
 
});



app.get('/produtos',async (req, res) => {
  const Produtos = await Produto.find()
  res.send(Produtos);
})


app.get("/produtos/:id", async (req, res) => {
  try {
    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).send({ message: "Produto não encontrado" });
    }
    return res.send(produto);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    return res.status(500).send({ message: "Erro ao buscar produto pelo id " });
  }
});



// BUSCA DOS  ITENS POR TAG / NOME OU REF
app.get('/produtos/busca/:query', async (req, res) => {
  const query = req.params.query;
  let page = parseInt(req.query.page) || 1; // Página atual, padrão: 1
  const pageSize = parseInt(req.query.pageSize) || 10; // Tamanho da página, padrão: 10

  try {
    // Consulta os produtos que correspondem ao nome, tag ou ref
    const produtosQuery = Produto.find({
      $or: [
        { name: { $regex: query, $options: 'i' } }, // Busca por nome (case insensitive)
        { tag: { $regex: query, $options: 'i' } },  // Busca por tag (case insensitive)
        { ref: query }                             // Busca por referência exata
      ]
    });

    // Conta o total de produtos encontrados
    const totalProdutos = await Produto.countDocuments({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { tag: { $regex: query, $options: 'i' } },
        { ref: query }
      ]
    });

    // Verifica se há produtos encontrados
    if (totalProdutos === 0) {
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

    // Aplica a paginação
    const produtos = await produtosQuery
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    // Verifica se há uma próxima página
    let nextPage = null;
    if (page < totalPages) {
      nextPage = page + 1;
    }

    // Verifica se há uma página anterior
    let prevPage = null;
    if (page > 1) {
      prevPage = page - 1;
    }

    // Retorna os produtos encontrados e informações de paginação
    return res.json({
      produtos,
      totalPages,
      currentPage: page,
      nextPage,
      prevPage
    });

  } catch (error) {
    console.error("Erro ao buscar produtos por nome, tag ou ref:", error);
    // Retorna um erro 500 em caso de falha na consulta
    return res.status(500).json({ message: "Erro ao buscar produtos por nome, tag ou ref" });
  }
});



app.get('/categorias', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Página atual, padrão é 1
    const pageSize = parseInt(req.query.pageSize) || 10; // Tamanho da página, padrão é 10

    // Consultar categorias com paginação usando Mongoose
    const categorias = await Categoria.find()
      .skip((page - 1) * pageSize) // Pular itens da página anterior
      .limit(pageSize); // Limitar a quantidade de resultados por página

    // Contar o total de categorias (para calcular totalPages)
    const totalItems = await Categoria.countDocuments();

    // Calcular totalPages
    const totalPages = Math.ceil(totalItems / pageSize);

    // Retornar os dados e metadados de paginação
    res.json({
      data: categorias,
      totalPages: totalPages,
      totalItems: totalItems
    });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/categorias/:tag', async (req, res) => {
  const tag = req.params.tag;
  let page = parseInt(req.query.page) || 1; // Página atual, padrão: 1
  const pageSize = parseInt(req.query.pageSize) || 10; // Tamanho da página, padrão: 10

  try {
    // Consulta os produtos com base na tag e aplica a paginação
    const produtosQuery = Produto.find({ tag: tag });

    // Conta o total de produtos com a tag especificada
    const totalProdutos = await Produto.countDocuments({ tag: tag });

    // Verifica se há produtos encontrados
    if (totalProdutos === 0) {
      return res.status(404).json({ message: `Nenhum produto encontrado com a tag '${tag}'` });
    }

    // Calcula o número total de páginas
    const totalPages = Math.ceil(totalProdutos / pageSize);

    // Verifica se a página solicitada é válida
    if (page < 1) {
      page = 1;
    } else if (page > totalPages) {
      page = totalPages;
    }

    // Aplica a paginação
    const produtos = await produtosQuery
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    // Verifica se há uma próxima página
    let nextPage = null;
    if (page < totalPages) {
      nextPage = page + 1;
    }

    // Verifica se há uma página anterior
    let prevPage = null;
    if (page > 1) {
      prevPage = page - 1;
    }

    // Retorna os produtos encontrados e informações de paginação
    return res.json({
      produtos,
      totalPages,
      currentPage: page,
      nextPage,
      prevPage
    });

  } catch (error) {
    console.error("Erro ao buscar produtos por tag:", error);
    // Retorna um erro 500 em caso de falha na consulta
    return res.status(500).json({ message: "Erro ao buscar produtos por tag" });
  }
});





app.listen(3000, () => {
  console.log('Server is running on port 3000');
})