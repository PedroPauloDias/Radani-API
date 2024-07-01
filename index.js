const express = require("express");
const mongoose = require("mongoose");
require('dotenv').config();
const cors = require('cors');

const app = express();

// Configuração do CORS
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ["http://localhost:3000", "https://radani.vercel.app", "https://radani-api.vercel.app/categorias", "https://radani-api.vercel.app/produtos"];
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
  image: String,
 
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

app.get('/produtos', async (req, res) => {
  // Obter parâmetros de consulta da requisição
  const tag = req.query.tag;
  try {
    // Consultar o registro da  tag com base nos parâmetros fornecidos
    const searchTag = await tag.findOne({ 
      tagName: tag, 
      
    });
    // Se a tag foi encontrada, retorna o registro
    if (tag) {
      return res.json(tag);
    } else {
      // Se a tag não foi encontrada, retorna uma mensagem de erro
      return res.status(404).json({ message: "Registro não encontrado para a tag fornecida" });
    }
  } catch (error) {
    console.error("Erro ao buscar registro da tag:", error);
    // Retornar uma resposta de erro com status 500 e uma mensagem personalizada
    return res.status(500).json({ message: "Erro ao buscar registro da tag" });
  }
});


// Buscar por Id
app.get("/produtos/:id",  async (req, res) => {
  const Produtos = await Produto.findById(req.params.id);
  return res.send(Produto);  
});

app.get('/categorias',async (req, res) => {
  const Categorias = await Categoria.find()
  res.send(Categorias);
})

app.listen(3000, () => {
  console.log('Server is running on port 3000');
})