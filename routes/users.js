const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const User = require('../models/User')
const TechnicianProfile = require('../models/TechnicianProfile')
const Job = require('../models/Job')
const Review = require('../models/Review')
const Report = require('../models/Report')
const { profileUpdateRules, validate } = require('../middleware/validator')

// PUT /users/profile
router.put('/profile', auth, profileUpdateRules, validate, async (req, res) => {
  try {
    const fields = ['name', 'city', 'address', 'photo_url']
    const userUpdate = {}
    fields.forEach(f => { if (req.body[f] !== undefined) userUpdate[f] = req.body[f] })

    if (Object.keys(userUpdate).length > 0) {
      await User.update({ ...userUpdate, is_profile_complete: true }, { where: { id: req.user.id } })
    }

    if (req.user.user_type === 'technician') {
      const techFields = ['category', 'id_doc_url', 'license_doc_url', 'bio', 'years_experience', 'is_online']
      const techUpdate = {}
      techFields.forEach(f => { if (req.body[f] !== undefined) techUpdate[f] = req.body[f] })

      if (Object.keys(techUpdate).length > 0) {
        // Use findOrCreate + update to ensure only provided fields are changed (partial update)
        const [profile, created] = await TechnicianProfile.findOrCreate({
          where: { user_id: req.user.id },
          defaults: { category: req.body.category || 'electrician', ...techUpdate }
        })

        if (!created) {
          await profile.update(techUpdate)
        }
      }
    }

    res.json({ success: true, message: 'Profile updated' })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ success: false, message: 'Failed to update profile' })
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

    // Security: Only the homeowner who posted the job can review it
    if (job.homeowner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Only the homeowner can review this job' })
    }

    if (job.status !== 'done') {
      return res.status(400).json({
        success: false, message: 'Job must be completed first' })
    }

    // Integrity: Ensure no duplicate reviews for the same job
    const existingReview = await Review.findOne({ where: { job_id } })
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'Job already reviewed' })
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
    if (req.user.user_type !== 'technician') {
      return res.status(403).json({ success: false, message: 'Only technicians can have a work portfolio' })
    }
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

// POST /users/report
// Submit a report against a user
router.post('/report', auth, async (req, res) => {
  try {
    const { reported_id, job_id, reason, description } = req.body

    if (!reported_id || !reason) {
      return res.status(400).json({ success: false, message: 'Missing reported ID or reason' })
    }

    const report = await Report.create({
      reporter_id: req.user.id,
      reported_id,
      job_id,
      reason,
      description
    })

    res.json({ success: true, report })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /users/profile
// Allow user to delete their own account
router.delete('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.id

    // Cleanup: Delete technician profile if it exists
    await TechnicianProfile.destroy({ where: { user_id: userId } })

    // Delete the user record
    await User.destroy({ where: { id: userId } })

    res.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete account' })
  }
})

module.exports = router
