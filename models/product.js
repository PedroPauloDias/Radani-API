const mongoose = require('mongoose')
// Scheema produtos

const productSchema = new mongoose.Schema({
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
  sizes:String 
 
});

export const Product = mongoose.models.Product ?? mongoose.model("Product", userSchema);