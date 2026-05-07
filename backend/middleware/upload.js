const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (file) => {
  if (!file) return null;
  const result = await cloudinary.uploader.upload(file.tempFilePath || file, {
    folder: 'bakufix',
    transformation: [{ width: 1200, quality: 'auto', fetch_format: 'auto' }],
  });
  return result.secure_url;
};

module.exports = { uploadToCloudinary };
