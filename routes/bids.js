const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const Bid = require('../models/Bid')
const Job = require('../models/Job')
const User = require('../models/User')
const TechnicianProfile = require('../models/TechnicianProfile')
const { sendNotification } = require('../utils/notifications')
const { placeBidRules, validate } = require('../middleware/validator')

// POST /bids/:job_id
// Technician places a bid on an open job
router.post('/:job_id', auth, placeBidRules, validate, async (req, res) => {
  try {
    if (req.user.user_type !== 'technician') {
      return res.status(403).json({ success: false, message: 'Only technicians can bid' })
    }

    // Check if technician is approved
    const techProfile = await TechnicianProfile.findOne({ where: { user_id: req.user.id } })
    if (!techProfile || !techProfile.approved) {
      return res.status(403).json({
        success: false,
        message: 'Your profile is not yet approved by admin. Please complete your verification first.'
      })
    }

    const { price, estimated_time, message } = req.body
    const job_id = req.params.job_id

    // Check if job is still open
    const job = await Job.findByPk(job_id)
    if (!job || job.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Job is no longer open for bidding' })
    }

    // Security: Prevent bidding on own job
    if (job.homeowner_id === req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot bid on your own job' })
    }

    // Create the bid
    const bid = await Bid.create({
      job_id,
      technician_id: req.user.id,
      price,
      estimated_time,
      message
    })

    // Notify homeowner
    const homeowner = await User.findByPk(job.homeowner_id)
    if (homeowner && homeowner.fcm_token) {
      await sendNotification(
        homeowner.fcm_token,
        'New Bid Received! 💰',
        `A technician offered ₹${price} for your repair`,
        { type: 'new_bid', job_id: job_id.toString() }
      )
    }

    res.json({ success: true, bid })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /bids/my
// Technician sees their own pending bids
router.get('/my', auth, async (req, res) => {
  try {
    if (req.user.user_type !== 'technician') {
        return res.status(403).json({ success: false, message: 'Only technicians have bids' })
    }
    const bids = await Bid.findAll({
      where: { technician_id: req.user.id, status: 'pending' },
      include: [{ model: Job, attributes: ['category', 'description', 'status'] }]
    })
    res.json({ success: true, bids })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /bids/job/:job_id
// Homeowner sees all bids for their job
router.get('/job/:job_id', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.job_id)
    if (!job || job.homeowner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    const bids = await Bid.findAll({
      where: { job_id: req.params.job_id },
      include: [{
        model: User,
        as: 'technician',
        attributes: ['id', 'name', 'phone', 'city', 'is_verified']
      }],
      order: [['price', 'ASC']] // Show cheapest first
    })

    res.json({ success: true, bids })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /bids/:id/accept
// Homeowner accepts a specific bid
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const bid = await Bid.findByPk(req.params.id, { include: [Job] })
    if (!bid || bid.Job.homeowner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    // Update job
    const job = bid.Job
    await job.update({
      technician_id: bid.technician_id,
      status: 'matched',
      price: bid.price
    })

    // Mark this bid as accepted
    await bid.update({ status: 'accepted' })

    // Reject other bids for this job
    await Bid.update(
      { status: 'rejected' },
      {
        where: {
          job_id: job.id,
          id: { [require('sequelize').Op.ne]: bid.id }
        }
      }
    )

    // Notify technician
    const technician = await User.findByPk(bid.technician_id)
    if (technician && technician.fcm_token) {
      await sendNotification(
        technician.fcm_token,
        'Bid Accepted! 🎉',
        'Your bid was chosen. Contact the customer to start.',
        { type: 'bid_accepted', job_id: job.id }
      )
    }

    res.json({ success: true, message: 'Bid accepted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// DELETE /bids/:id
// Technician withdraws a bid
router.delete('/:id', auth, async (req, res) => {
  try {
    const bid = await Bid.findByPk(req.params.id)
    if (!bid) return res.status(404).json({ success: false, message: 'Bid not found' })

    if (bid.technician_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot withdraw an accepted or rejected bid' })
    }

    await bid.destroy()
    res.json({ success: true, message: 'Bid withdrawn' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
