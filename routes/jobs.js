// This file handles everything related to jobs
// Posting a job, viewing jobs, accepting a job, marking done

const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')  // protects routes — must be logged in
const reviewCheck = require('../middleware/reviewCheck')
const { Job, User, TechnicianProfile, JobInvitation } = require('../models/associations')
const { sendNotification } = require('../utils/notifications')
const { postJobRules, validate } = require('../middleware/validator')


// POST /jobs
// Homeowner posts a new repair job
router.post('/', auth, reviewCheck, postJobRules, validate, async (req, res) => {
  try {
    // auth middleware already verified the token
    // req.user.id is the homeowner's ID from the token
    const { category, description, location, latitude, longitude, photo_url, is_emergency } = req.body

    const lat = latitude ? parseFloat(latitude) : null
    const lng = longitude ? parseFloat(longitude) : null

    // Generate a random 4-digit PIN for site arrival verification
    const startPin = Math.floor(1000 + Math.random() * 9000).toString()

    const job = await Job.create({
      homeowner_id: req.user.id,
      category,
      description,
      location,
      latitude: lat,
      longitude: lng,
      photo_url,
      status: 'open',
      start_pin: startPin,
      is_emergency: is_emergency || false
    })

    // Notify technicians matching category, online status AND within 20km radius
    const query = {
      user_type: 'technician'
    }

    const technicians = await User.findAll({
      where: query,
      include: [{
        model: TechnicianProfile,
        where: {
          category: category,
          is_online: true
        }
      }]
    })

    for (const tech of technicians) {
      let isNearby = true

      // If job has coordinates and tech has last known location, filter by distance
      if (lat && lng && tech.TechnicianProfile && tech.TechnicianProfile.last_lat && tech.TechnicianProfile.last_lng) {
        const distance = calculateDistance(lat, lng, tech.TechnicianProfile.last_lat, tech.TechnicianProfile.last_lng)
        if (distance > 20) isNearby = false
      }

      if (isNearby && tech.fcm_token) {
        await sendNotification(
          tech.id,
          tech.fcm_token,
          is_emergency ? '🚨 EMERGENCY Job Request' : 'New Job Request 🔧',
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
// Technician sees all open jobs (Filtered by 20km radius)
router.get('/open', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const offset = parseInt(req.query.offset) || 0
    const techLat = req.query.lat ? parseFloat(req.query.lat) : null
    const techLng = req.query.lng ? parseFloat(req.query.lng) : null

    // Update technician's last known location if provided
    if (techLat && techLng) {
      await TechnicianProfile.update(
        { last_lat: techLat, last_lng: techLng },
        { where: { user_id: req.user.id } }
      )
    }

    let jobs = await Job.findAll({
      where: { status: 'open' },
      order: [
        ['is_emergency', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit,
      offset,
      include: [{
        model: User,
        as: 'homeowner',
        attributes: ['name', 'city', 'homeowner_avg_rating']
      }]
    })

    // Filter by 20km radius if tech coordinates are available
    if (techLat && techLng) {
      jobs = jobs.filter(job => {
        if (!job.latitude || !job.longitude) return true // Show jobs without coordinates to everyone
        const distance = calculateDistance(techLat, techLng, job.latitude, job.longitude)
        return distance <= 20
      })
    }

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
        job.homeowner_id,
        homeowner.fcm_token,
        'Technician Hired! 🛠️',
        'A technician has accepted your repair request. Open to chat.',
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

    // Notify technician that they've been paid
    const tech = await User.findByPk(job.technician_id)
    if (tech && tech.fcm_token) {
      await sendNotification(
        job.technician_id,
        tech.fcm_token,
        'Service Confirmed! 🏠',
        `The homeowner has confirmed completion for your service.`,
        { type: 'job_completed', job_id: job.id.toString() }
      )
    }

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
    const { completion_photo_url } = req.body

    if (!completion_photo_url) {
      return res.status(400).json({ success: false, message: 'Completion photo is required to mark work as completed' })
    }

    const job = await Job.findByPk(req.params.id)

    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

    // Only the assigned technician can mark it as completed
    if (job.technician_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    if (job.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Job must be in progress to complete work' })
    }

    await job.update({
      status: 'work_completed',
      completion_photo_url
    })

    // Notify homeowner
    const homeowner = await User.findByPk(job.homeowner_id)
    if (homeowner?.fcm_token) {
      await sendNotification(
        job.homeowner_id,
        homeowner.fcm_token,
        'Work Completed! 📸',
        'Technician has finished the work and uploaded a proof photo. Please verify and confirm.',
        { type: 'job_finished', job_id: job.id.toString() }
      )
    }

    res.json({ success: true, message: 'Work marked as completed', job })
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
        job.homeowner_id,
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
router.put('/:id/approve-quote', auth, reviewCheck, async (req, res) => {
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
      status: 'matched' // Changed from 'in_progress' to wait for PIN verification at site
    })

    // Notify technician
    const tech = await User.findByPk(job.technician_id)
    if (tech?.fcm_token) {
      await sendNotification(
        job.technician_id,
        tech.fcm_token,
        'Quote Approved! ✅',
        'Customer approved your price. Please visit the site and enter the 4-digit PIN to start work.',
        { type: 'quote_approved', job_id: job.id.toString() }
      )
    }

    res.json({ success: true, message: 'Quote approved. Waiting for technician arrival.', start_pin: job.start_pin })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /jobs/:id/start
// Technician enters PIN at site to start the work
router.put('/:id/start', auth, async (req, res) => {
  try {
    const { pin } = req.body
    if (!pin) return res.status(400).json({ success: false, message: 'PIN is required to start work' })

    const job = await Job.findByPk(req.params.id)
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

    if (job.technician_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You are not the assigned technician' })
    }

    if (job.status !== 'matched') {
      return res.status(400).json({ success: false, message: 'Job must be in matched state to start' })
    }

    if (job.start_pin !== pin.toString()) {
      return res.status(401).json({ success: false, message: 'Invalid Verification PIN. Please ask the homeowner for the correct 4-digit code.' })
    }

    await job.update({ status: 'in_progress' })

    // Notify homeowner
    const homeowner = await User.findByPk(job.homeowner_id)
    if (homeowner?.fcm_token) {
      await sendNotification(
        job.homeowner_id,
        homeowner.fcm_token,
        'Work Started! ⚡',
        'Technician has verified the PIN and started the work.',
        { type: 'job_started', job_id: job.id.toString() }
      )
    }

    res.json({ success: true, message: 'Work started successfully', job })
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

// POST /jobs/:id/invite
// Homeowner invites a specific technician to bid
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { technician_id } = req.body
    const job = await Job.findByPk(req.params.id)

    if (!job || job.homeowner_id !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Job not found or unauthorized' })
    }

    if (job.status !== 'open') {
        return res.status(400).json({ success: false, message: 'Can only invite to open jobs' })
    }

    const technician = await User.findByPk(technician_id)
    if (!technician || technician.user_type !== 'technician') {
        return res.status(404).json({ success: false, message: 'Technician not found' })
    }

    // Create invitation record
    await JobInvitation.create({
      job_id: job.id,
      technician_id
    })

    // Notify technician
    if (technician.fcm_token) {
        await sendNotification(
            technician_id,
            technician.fcm_token,
            'Job Invitation! 🤝',
            `A homeowner has personally invited you to bid on their ${job.category} job.`,
            { type: 'job_invitation', job_id: job.id.toString() }
        )
    }

    res.json({ success: true, message: 'Invitation sent successfully' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /jobs/:id
// Homeowner cancels an open request
router.delete('/:id', auth, async (req, res) => {
  try {
    const { reason } = req.body
    const job = await Job.findByPk(req.params.id)
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

    // Security: Only the owner can delete
    if (job.homeowner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    // Logic: Only "open" or "matched" jobs can be deleted/cancelled by homeowner
    if (job.status !== 'open' && job.status !== 'matched' && job.status !== 'work_completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel an active job' })
    }

    if (reason) {
      await job.update({ cancellation_reason: reason })
    }

    await job.destroy()
    res.json({ success: true, message: 'Job cancelled and removed' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router

// --- HELPERS ---
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
