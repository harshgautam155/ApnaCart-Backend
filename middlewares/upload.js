const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "apnacart",
        allowed_formats: ["jpg", "jpeg", "png", "webp"], 
        transformation: [{ width: 800, height: 800, crop: "limit" }], 
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, 
});

module.exports = upload;