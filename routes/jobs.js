// This file handles everything related to jobs
// Posting a job, viewing jobs, accepting a job, marking done

const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')  // protects routes — must be logged in
const Job = require('../models/Job')
const User = require('../models/User')
const TechnicianProfile = require('../models/TechnicianProfile')
const { sendNotification } = require('../utils/notifications')
const { postJobRules, validate } = require('../middleware/validator')


// POST /jobs
// Homeowner posts a new repair job
router.post('/', auth, postJobRules, validate, async (req, res) => {
  try {
    // auth middleware already verified the token
    // req.user.id is the homeowner's ID from the token
    const { category, description, location, latitude, longitude, photo_url } = req.body

    const job = await Job.create({
      homeowner_id: req.user.id,
      category,
      description,
      location,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      photo_url,
      status: 'open'
    })

    // Notify technicians matching category and online status
    const technicians = await User.findAll({
      where: { user_type: 'technician' },
      include: [{
        model: TechnicianProfile,
        where: {
          category: category,
          is_online: true
        }
      }]
    })

    for (const tech of technicians) {
      if (tech.fcm_token) {
        await sendNotification(
          tech.fcm_token,
          'New Job Request 🔧',
          `New ${category} job near you`,
          { type: 'new_job', job_id: job.id.toString() }
        )
      }
    }

    res.json({ success: true, job })

  } catch (error) {
    console.log('Post job error:', error)
    res.status(500).json({ success: false, message: 'Failed to post job' })
  }
})

// GET /jobs/open
// Technician sees all open jobs
router.get('/open', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const offset = parseInt(req.query.offset) || 0

    const jobs = await Job.findAll({
      where: { status: 'open' },         // only show open jobs
      order: [['createdAt', 'DESC']],    // newest first
      limit,
      offset,
      include: [{
        model: User,
        as: 'homeowner',
        attributes: ['name', 'city']     // only send name and city, not password etc
      }]
    })

    res.json({ success: true, jobs })

  } catch (error) {
    console.log('Get jobs error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch jobs' })
  }
})

// GET /jobs/my
// User sees their own jobs (homeowner sees jobs they posted, technician sees jobs they accepted)
router.get('/my', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const offset = parseInt(req.query.offset) || 0
    let jobs

    if (req.user.user_type === 'homeowner') {
      jobs = await Job.findAll({
        where: { homeowner_id: req.user.id },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      })
    } else {
      jobs = await Job.findAll({
        where: { technician_id: req.user.id },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      })
    }

    res.json({ success: true, jobs })

  } catch (error) {
    console.log('My jobs error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch your jobs' })
  }
})

// GET /jobs/:id
// Get a single job by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [
        { model: User, as: 'homeowner', attributes: ['name', 'city'] },
        { model: User, as: 'technician', attributes: ['name', 'city', 'is_verified'] }
      ]
    })
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })
    res.json({ success: true, job })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /jobs/:id/accept
// Technician accepts an open job
router.put('/:id/accept', auth, async (req, res) => {
  try {
    if (req.user.user_type !== 'technician') {
      return res.status(403).json({ success: false, message: 'Only technicians can accept jobs' })
    }

    // Check if technician is approved
    const techProfile = await TechnicianProfile.findOne({ where: { user_id: req.user.id } })
    if (!techProfile || !techProfile.approved) {
      return res.status(403).json({
        success: false,
        message: 'Your profile is not yet approved by admin. Please complete your verification first.'
      })
    }

    const job = await Job.findByPk(req.params.id)  // find job by ID from the URL

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' })
    }

    if (job.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Job is already assigned to a technician' })
    }

    // Get price
    const bidPrice = parseFloat(req.body.price)
    if (isNaN(bidPrice)) {
        return res.status(400).json({ success: false, message: 'Invalid price' })
    }

    // Update the job — assign this technician and change status
    await job.update({
      technician_id: req.user.id,
      status: 'matched',
      price: bidPrice
    })

    // Notify homeowner
    const homeowner = await User.findByPk(job.homeowner_id)
    if (homeowner?.fcm_token) {
      await sendNotification(
        homeowner.fcm_token,
        'Technician Found! 🎉',
        'A technician has accepted your repair request',
        { type: 'job_accepted', job_id: job.id.toString() }
      )
    }

    res.json({ success: true, job })

  } catch (error) {
    console.log('Accept job error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to accept job',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// PUT /jobs/:id/complete
// Homeowner marks the job as done (triggers payment release)
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id)

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' })
    }

    // Only the homeowner who posted this job can mark it done
    if (job.homeowner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised' })
    }

    await job.update({ status: 'done' })

    res.json({ success: true, message: 'Job marked as complete', job })

  } catch (error) {
    console.log('Complete job error:', error)
    res.status(500).json({ success: false, message: 'Failed to complete job' })
  }
})

// PUT /jobs/:id/finish
// Technician marks the job as finished (awaiting homeowner confirmation)
router.put('/:id/finish', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id)

    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

    // Only the assigned technician can mark it as finished
    if (job.technician_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    if (job.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Job must be in progress to finish' })
    }

    await job.update({ status: 'finished' })

    // Notify homeowner
    const homeowner = await User.findByPk(job.homeowner_id)
    if (homeowner?.fcm_token) {
      await sendNotification(
        homeowner.fcm_token,
        'Work Finished! 🏠',
        'Technician has marked the work as finished. Please confirm.',
        { type: 'job_finished', job_id: job.id.toString() }
      )
    }

    res.json({ success: true, message: 'Job marked as finished', job })
  } catch (error) {
    console.log('Finish job error:', error)
    res.status(500).json({ success: false, message: 'Failed to finish job' })
  }
})

// PUT /jobs/:id/quote
// Technician sends a new quote (after inspection)
router.put('/:id/quote', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id)
    if (!job || job.technician_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    await job.update({
      quoted_price: req.body.price,
      is_price_approved: false
    })

    // Notify homeowner
    const homeowner = await User.findByPk(job.homeowner_id)
    if (homeowner?.fcm_token) {
      await sendNotification(
        homeowner.fcm_token,
        'New Price Quote 💰',
        `Technician has quoted ₹${req.body.price} for the repair`,
        { type: 'new_quote', job_id: job.id.toString() }
      )
    }

    res.json({ success: true, message: 'Quote sent' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /jobs/:id/approve-quote
// Homeowner approves the technician's quote
router.put('/:id/approve-quote', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id)
    if (!job || job.homeowner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    const newPrice = parseFloat(job.quoted_price)
    if (isNaN(newPrice)) {
        return res.status(400).json({ success: false, message: 'Invalid quoted price' })
    }

    await job.update({
      price: newPrice,
      is_price_approved: true,
      status: 'in_progress'
    })

    // Notify technician
    const tech = await User.findByPk(job.technician_id)
    if (tech?.fcm_token) {
      await sendNotification(
        tech.fcm_token,
        'Quote Approved! ✅',
        'Customer approved your price. You can start the work.',
        { type: 'quote_approved', job_id: job.id.toString() }
      )
    }

    res.json({ success: true, message: 'Quote approved' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /jobs/:id/dispute
// Homeowner or Technician marks a job as disputed
router.put('/:id/dispute', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id)
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

    await job.update({
      status: 'disputed',
      dispute_reason: req.body.reason
    })

    res.json({ success: true, message: 'Dispute registered' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /jobs/:id
// Homeowner cancels an open request
router.delete('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id)
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

    // Security: Only the owner can delete
    if (job.homeowner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    // Logic: Only "open" jobs can be deleted/cancelled
    if (job.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an assigned or finished job' })
    }

    await job.destroy()
    res.json({ success: true, message: 'Job cancelled and removed' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /jobs/:id
// Homeowner cancels an open request
router.delete('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id)
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

    // Security: Only the owner can delete
    if (job.homeowner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    // Logic: Only "open" jobs can be deleted/cancelled
    if (job.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an assigned or finished job' })
    }

    await job.destroy()
    res.json({ success: true, message: 'Job cancelled and removed' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
