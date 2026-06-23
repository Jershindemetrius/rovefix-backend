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
    const { name, city, category, address } = req.body

    await User.update(
      { name, city, address },
      { where: { id: req.user.id } }
    )

    if (req.user.user_type === 'technician' && category) {
      const existing = await TechnicianProfile.findOne({
        where: { user_id: req.user.id }
      })
      if (existing) {
        await existing.update({ category })
      } else {
        await TechnicianProfile.create({
          user_id: req.user.id,
          category,
          approved: false
        })
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
      attributes: ['id', 'name', 'phone', 'city', 'user_type', 'is_verified']
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

module.exports = router