const express = require("express");
const mongoose = require("mongoose");
require('dotenv').config();
const cors = require('cors');
const { ObjectId } = require('mongoose').Types;
const Produto = require("./models/product");
const  productsRoute = require("./routes/products");


const app = express();

app.use(express.json()); // Para manipular JSON
app.use(express.urlencoded({ extended: true })); 
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:3000','http://localhost:3001', 'https://radani.vercel.app','https://adm-radani.vercel.app', 'https://radani-conf.vercel.app']
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido CORS'));
    }
  },
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));


// ROTAS
app.use("/produtos", productsRoute)



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
// const Produto = mongoose.model('Produto', {
//   name: String,
//   tag: String,
//   description: String,
//   ref: String,
//   image: {
//     cores: {
//       amarelo: String,
//       azul: String,
//       branco: String,
//       rosa: String,
//       verde: String
//     },
//   },
//   cod: String,
//   sizes:String 
 
// });

// Scheema produtos
const Categoria = mongoose.model('Categoria', {
  name: String,
  image: String,
 
});









app.get('/produtos/busca/:query', async (req, res) => {
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
app.get('/produtos/:id', async (req, res) => {
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
app.get('/produtos/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const produto = await Produto.findById(id);

    if (!produto) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    // Retorna o produto encontrado
    res.json(produto);

  } catch (error) {
    console.error("Erro ao buscar produto pelo ID:", error);
    // Retorna um erro 500 em caso de falha na consulta
    res.status(500).json({ message: "Erro ao buscar produto pelo ID" });
  }
});


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
    const produtosQuery = Produto.find({ tag: tag }).sort({ ref: 1 });
    ;

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

    // Aplica a paginação e ordenação
    const produtos = await Produto.aggregate([
      { $match: { tag: tag } }, // Filtra os produtos pela tag
      {
        $addFields: {
          refNum: { $toInt: "$ref" } // Converte o campo ref de string para número
        }
      },
      { $sort: { refNum: 1 } }, // Ordena pelo campo refNum
      { $skip: (page - 1) * pageSize }, // Pula documentos para a página
      { $limit: pageSize } // Limita o número de documentos por página
    ]);

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