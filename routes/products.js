const express = require("express");
const Produto = require("../models/product"); // Importa o modelo diretamente
const cloudinary = require("../utils/cloudinary");

const router = express.Router();




router.createProduct = async (req, res, next) => {
  const { name, tag, description, ref, image, cod, sizes } = req.body;
  try {
      const result = await cloudinary.uploader.upload(image, {
          folder: "produtos",
          // width: 300,
          // crop: "scale"
      })
      const produto = await Produto.create({
        name,
        tag,
        description,
        ref,
        image: {
          public_id: result.public_id,
          url: result.secure_url,      
        },
        cod,
        sizes
      });
      res.status(201).json({
          success: true,
          produto
      })

  } catch (error) {
      console.log(error);
      next(error);

  }

}


router.post('/produtos', async (req, res) => {
  const { name, tag, description, ref, image, cod, sizes } = req.body;
  
  try {
    if (image) {
      const uploadRes = await cloudinary.uploader.upload(image, {
        upload_preset: "radani_conf"
      });
      if (uploadRes) {
        const novoProduto = new Produto({
          name,
          tag,
          description,
          ref,
          image: {
            public_id: result.public_id,
            url: result.secure_url,      
          },
          cod,
          sizes
        });
        const savedProduct = await novoProduto.save();
        res.status(200).send(savedProduct);
      }
    }
  } catch (error) {
    console.error("Error ao salvar produto:", error);
    res.status(500).send({ message: "Erro ao salvar produto" });
  }
});

router.get('/', async (req, res) => {
  try {
    const produtos = await Produto.find();
    console.log(produtos); 
    res.status(200).send(produtos);
  } catch (error) {
    res.status(500).send({ message: "Erro ao buscar produto" });
  }
});

module.exports = router;
