const express = require("express");
const { Product } = require("../models/product");
const mongoose = require("mongoose");
const cloudinary = require("../utils/cloudinary");

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, tag, description, ref, image, cod, sizes } = req.body;
  
  try {
    if (image) {
      const uploadRes = await cloudinary.uploader.upload(image, {
        upload_preset: "radani_conf"
      })
      if (uploadRes) {
        const products = new Product({
          name,
          tag,
          description,
          ref,
          image: uploadRes,
          cod,
          sizes
        })
        const savedProduct = await products.save();
        req.status(200).send(savedProduct)

      }
    }
  } catch (error) {
    console.error("Error ao salvar produto:", error);
    res.status(500).send({ message: "Erro ao salvar produto" });
  }
});

router.get('/', async (req, res) => {
 try {
  const products = await Product.find()
  res.status(200).send(products);
 } catch (error) {
   res.status(500).send({ message: "Erro ao buscar produto" });
 }
}) ;

module.exports = router