const express = require('express')
const router = express.Router()
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const auth = require('../middleware/auth')
const { CloudinaryStorage } = require('multer-storage-cloudinary')

// Professional Setup: Use environment variables
// FALLBACK: Using a temporary Zanvis Dev key for immediate testing
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dxynv9x1b',
  api_key: process.env.CLOUDINARY_API_KEY || '519656121422341',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'P8E7UfB7N8U8V-P_I8vI8eP8I8U'
})

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rovefix_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
})

// POST /upload/image
router.post('/image', auth, (req, res) => {
  if (!process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({
        success: false,
        message: 'Cloudinary not configured. Please set CLOUDINARY_API_SECRET in Render Environment Variables.'
    })
  }

  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Multer error: ${err.message}` })
    } else if (err) {
      return res.status(500).json({ success: false, message: `Cloudinary error: ${err.message}` })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received in request' })
    }

    res.json({
      success: true,
      url: req.file.path,
      public_id: req.file.filename
    })
  })
})

module.exports = router
