const express = require("express");
const Produto = require("../models/product"); // Importa o modelo diretamente
const cloudinary = require("../utils/cloudinary");
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });


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


router.post('/', upload.single('image'), async (req, res) => {
  const { name, tag, description, ref, cod, sizes } = req.body;
  const image = req.file;

  if (!image) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  try {
    const uploadRes = await cloudinary.uploader.upload(image.path, {
      upload_preset: "radani_conf"
    });
    
    const novoProduto = new Produto({
      name,
      tag,
      description,
      ref,
      image: {
        public_id: uploadRes.public_id,
        url: uploadRes.secure_url,
      },
      cod,
      sizes
    });

    const savedProduct = await novoProduto.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Error ao salvar produto:", error);
    res.status(500).json({ message: "Erro ao salvar produto" });
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
