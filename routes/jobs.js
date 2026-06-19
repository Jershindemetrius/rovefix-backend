// This file handles everything related to jobs
// Posting a job, viewing jobs, accepting a job, marking done

const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')  // protects routes — must be logged in
const Job = require('../models/Job')
const User = require('../models/User')

// POST /jobs
// Homeowner posts a new repair job
router.post('/', auth, async (req, res) => {
  try {
    // auth middleware already verified the token
    // req.user.id is the homeowner's ID from the token
    const { category, description, location, latitude, longitude, photo_url } = req.body

    const job = await Job.create({
      homeowner_id: req.user.id,  // automatically use the logged-in user's ID
      category,
      description,
      location,
      latitude,
      longitude,
      photo_url,
      status: 'open'
    })

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
    const jobs = await Job.findAll({
      where: { status: 'open' },         // only show open jobs
      order: [['createdAt', 'DESC']],    // newest first
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
    let jobs

    if (req.user.user_type === 'homeowner') {
      jobs = await Job.findAll({
        where: { homeowner_id: req.user.id },
        order: [['createdAt', 'DESC']]
      })
    } else {
      jobs = await Job.findAll({
        where: { technician_id: req.user.id },
        order: [['createdAt', 'DESC']]
      })
    }

    res.json({ success: true, jobs })

  } catch (error) {
    console.log('My jobs error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch your jobs' })
  }
})

// PUT /jobs/:id/accept
// Technician accepts an open job
router.put('/:id/accept', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id)  // find job by ID from the URL

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' })
    }

    if (job.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Job is no longer available' })
    }

    // Update the job — assign this technician and change status
    await job.update({
      technician_id: req.user.id,
      status: 'matched',
      price: req.body.price   // technician sets the price when accepting
    })

    res.json({ success: true, job })

  } catch (error) {
    console.log('Accept job error:', error)
    res.status(500).json({ success: false, message: 'Failed to accept job' })
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

module.exports = router