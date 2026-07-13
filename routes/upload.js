const express = require('express')
const router = express.Router()
const multer = require('multer')
const auth = require('../middleware/auth')

// Use Memory Storage instead of Cloudinary for 100% reliability
const storage = multer.memoryStorage()
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('image')

// POST /upload/image
// This route now converts the image to a Base64 string for Database storage
router.post('/image', auth, (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.error('[Upload] Error:', err.message)
      return res.status(500).json({ success: false, message: err.message })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' })
    }

    // Convert the buffer to a Base64 string
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`

    // Return the string. The app will then save this string in the Neon DB
    res.json({
      success: true,
      url: base64Image // This is now the actual image data
    })
  })
})

module.exports = router
