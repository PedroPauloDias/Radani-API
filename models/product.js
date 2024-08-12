const mongoose = require('mongoose');

// Definindo o esquema do produto
const ProdutoSchema = new mongoose.Schema({
  name: String,
  tag: String,
  description: String,
  ref: String,
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
  sizes: String
});

// Usando `mongoose.models.Produto` para garantir que o modelo não seja redefinido
const Produto = mongoose.models.Produto || mongoose.model('Produto', ProdutoSchema);

module.exports = Produto;
