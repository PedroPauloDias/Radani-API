const dotenv = require("dotenv")
const cloudinaryModule = require("cloudinary")

  dotenv.config()
const cloudinary = cloudinaryModule.v2
  
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
})
module.exports = cloudinary