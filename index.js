const express = require("express");
const mongoose = require("mongoose");
require('dotenv').config();
const cors = require('cors');

const app = express();

// Configuração do CORS
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ["http://localhost:3000", "https://radani.vercel.app","https://radani-api.vercel.app/categorias","https://radani-api.vercel.app/produtos"];
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
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

app.get('/categorias',async (req, res) => {
  const Categorias = await Categoria.find()
  res.send(Categorias);
})

app.listen(3000, () => {
  console.log('Server is running on port 3000');
})