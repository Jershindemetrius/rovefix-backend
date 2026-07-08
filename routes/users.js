const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const User = require('../models/User')
const TechnicianProfile = require('../models/TechnicianProfile')
const Job = require('../models/Job')
const Review = require('../models/Review')

// PUT /users/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, city, category, address, photo_url, id_doc_url } = req.body

    // Update User table fields
    const userUpdateData = {}
    if (name) userUpdateData.name = name
    if (city) userUpdateData.city = city
    if (address) userUpdateData.address = address
    if (photo_url) userUpdateData.photo_url = photo_url

    if (Object.keys(userUpdateData).length > 0) {
      await User.update(userUpdateData, { where: { id: req.user.id } })
    }

    // Update TechnicianProfile if applicable
    if (req.user.user_type === 'technician') {
      const techUpdateData = {}
      if (category) techUpdateData.category = category
      if (id_doc_url) techUpdateData.id_doc_url = id_doc_url

      if (Object.keys(techUpdateData).length > 0) {
        const [profile, created] = await TechnicianProfile.findOrCreate({
          where: { user_id: req.user.id },
          defaults: techUpdateData
        })

        if (!created) {
          await profile.update(techUpdateData)
        }
      }
    }

    res.json({ success: true, message: 'Profile updated' })

  } catch (error) {
    console.log('Update profile error:', error)
    res.status(500).json({
      success: false, message: 'Failed to update profile' })
  }
})

// GET /users/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'phone', 'city', 'user_type', 'is_verified', 'photo_url']
    })

    let techProfile = null
    if (req.user.user_type === 'technician') {
      techProfile = await TechnicianProfile.findOne({
        where: { user_id: req.user.id }
      })
    }

    res.json({ success: true, user, techProfile })

  } catch (error) {
    console.log('Get profile error:', error)
    res.status(500).json({ success: false, message: 'Failed to get profile' })
  }
})

// POST /users/review
router.post('/review', auth, async (req, res) => {
  try {
    const { job_id, rating, comment, work_photo_url } = req.body

    const job = await Job.findByPk(job_id)

    if (!job) {
      return res.status(404).json({
        success: false, message: 'Job not found' })
    }

    if (job.status !== 'done') {
      return res.status(400).json({
        success: false, message: 'Job must be completed first' })
    }

    const review = await Review.create({
      job_id,
      reviewer_id: req.user.id,
      technician_id: job.technician_id,
      rating: parseInt(rating),
      comment,
      work_photo_url
    })

    const allReviews = await Review.findAll({
      where: { technician_id: job.technician_id }
    })

    const avgRating = allReviews.reduce((sum, r) =>
      sum + r.rating, 0) / allReviews.length

    await TechnicianProfile.update(
      {
        avg_rating: avgRating,
        total_jobs: allReviews.length
      },
      { where: { user_id: job.technician_id } }
    )

    res.json({ success: true, review })

  } catch (error) {
    console.log('Review error:', error)
    res.status(500).json({
      success: false, message: 'Failed to submit review' })
  }
})
// POST /users/fcm-token
// Save FCM token for push notifications
router.post('/fcm-token', auth, async (req, res) => {
  try {
    const { fcm_token } = req.body

    await User.update(
      { fcm_token },
      { where: { id: req.user.id } }
    )

    res.json({ success: true })
  } catch (error) {
    console.log('FCM token error:', error)
    res.status(500).json({ success: false })
  }
})

// PUT /users/portfolio
// Update technician portfolio
router.put('/portfolio', auth, async (req, res) => {
  try {
    const { portfolio_urls } = req.body
    const profile = await TechnicianProfile.findOne({ where: { user_id: req.user.id } })

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Technician profile not found' })
    }

    await profile.update({ portfolio_urls })
    res.json({ success: true, message: 'Portfolio updated' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
