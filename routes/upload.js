const express = require('express')
const router = express.Router()
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const auth = require('../middleware/auth')
const { CloudinaryStorage } = require('multer-storage-cloudinary')

// 🚀 ROVEFIX CLOUD ENGINE - PRODUCTION V3
// This engine handles professional image link generation
cloudinary.config({
  cloud_name: 'dxynv9x1b',
  api_key: '519656121422341',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'P8E7UfB7N8U8V-P_I8vI8eP8I8U'
})

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rovefix_assets',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 1200, quality: 'auto' }]
  },
})

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

// POST /upload/image
// Returns a public link (URL) for any image file sent from the phone
router.post('/image', auth, (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err) {
      console.error('[Upload] Error generating link:', err.message)
      return res.status(500).json({
        success: false,
        message: 'Cloud Storage Error',
        error: err.message
      })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' })
    }

    // This URL is the "link" that should be saved in the database
    res.json({
      success: true,
      url: req.file.path,
      public_id: req.file.filename
    })
  })
})

module.exports = router
