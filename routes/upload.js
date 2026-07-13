const express = require('express')
const router = express.Router()
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const auth = require('../middleware/auth')
const { CloudinaryStorage } = require('multer-storage-cloudinary')

// 🚀 ROVEFIX CLOUD ENGINE - PRODUCTION V3.1
// Optimized for Reliability and Scalability
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dxynv9x1b',
  api_key: process.env.CLOUDINARY_API_KEY || '519656121422341',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'P8E7UfB7N8U8V-P_I8vI8eP8I8U'
})

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'rovefix_assets',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Added webp for more reliability
      transformation: [{ width: 1200, quality: 'auto', fetch_format: 'auto' }],
      public_id: `rf_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    }
  },
})

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 } // Increased to 15MB for high-res photos
}).single('image')

// POST /upload/image
// Returns a public link (URL) for any image file sent from the phone
router.post('/image', auth, (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('[Upload] Multer Error:', err.message)
      return res.status(400).json({
        success: false,
        message: `Upload Limit/Format Error: ${err.message}`
      })
    } else if (err) {
      console.error('[Upload] Cloud Engine Error:', err.message)
      return res.status(500).json({
        success: false,
        message: 'Cloud Storage Connection Failed',
        error: err.message
      })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided in request' })
    }

    console.log(`[Upload] Success: ${req.file.path}`)

    // This URL is the "link" that should be saved in the database
    res.json({
      success: true,
      url: req.file.path,
      public_id: req.file.filename
    })
  })
})

module.exports = router
