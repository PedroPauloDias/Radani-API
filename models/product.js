const mongoose = require('mongoose');

// Definindo o esquema do produto
const ProdutoSchema = new mongoose.Schema({
  name: String,
  tag: String,
  description: String,
  ref: String,
  image: {
    public_id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    }

  },
  cores: [
    {
      public_id: String,
      url: String,
    }
  ],
  cod: String,
  sizes: String
});

// Usando `mongoose.models.Produto` para garantir que o modelo não seja redefinido
const Produto = mongoose.models.Produto || mongoose.model('Produto', ProdutoSchema);

module.exports = Produto;
