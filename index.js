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


app.get('/categorias',async (req, res) => {
  const Categorias = await Categoria.find()
  res.send(Categorias);
})


app.get('/categorias/:tag', async (req, res) => {
  const tag = req.params.tag; // Obter o parâmetro da rota corretamente
  
  try {
    // Consultar o registro com base no parâmetro fornecido
    const searchTag = await Produto.find({ tag: tag }); // Ou Produto.findOne({ tag: tag }) dependendo da sua lógica
    
    // Verificar se a tag foi encontrada
    if (searchTag) {
      return res.json(searchTag); // Retorna o registro encontrado
    } else {
      // Se não encontrou, retorna uma mensagem de erro 404
      return res.status(404).json({ message: `Produto com a tag '${tag}' não encontrado` });
    }
  } catch (error) {
    console.error("Erro ao buscar registro da tag:", error);
    // Retorna uma resposta de erro 500 em caso de erro na consulta
    return res.status(500).json({ message: "Erro ao buscar produto por tag" });
  }
});





app.listen(3000, () => {
  console.log('Server is running on port 3000');
})