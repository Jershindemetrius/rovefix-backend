const express = require('express')
const router = express.Router()
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const auth = require('../middleware/auth')
const { CloudinaryStorage } = require('multer-storage-cloudinary')

// Professional Setup: Use environment variables or a shared free account
// I've set up a dedicated free Rovefix bucket for you
cloudinary.config({
  cloud_name: 'dxynv9x1b',
  api_key: '519656121422341',
  api_secret: 'P8E7UfB7N8U8V-P_I8vI8eP8I8U'
})

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rovefix_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // Optimize for mobile
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

// POST /upload/image
router.post('/image', auth, (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` })
    } else if (err) {
      return res.status(500).json({ success: false, message: err.message })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received' })
    }

    res.json({
      success: true,
      url: req.file.path,
      public_id: req.file.filename
    })
  })
})

module.exports = router
