const express = require('express')
const router = express.Router()
const adminAuth = require('../middleware/adminAuth')
const User = require('../models/User')
const TechnicianProfile = require('../models/TechnicianProfile')
const Job = require('../models/Job')
const Payment = require('../models/Payment')
const Review = require('../models/Review')

// GET /admin/dashboard
// Overview stats
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.count({
      where: { user_type: 'homeowner' }
    })
    const totalTechnicians = await User.count({
      where: { user_type: 'technician' }
    })
    const pendingApprovals = await TechnicianProfile.count({
      where: { approved: false }
    })
    const totalJobs = await Job.count()
    const activeJobs = await Job.count({
      where: { status: ['matched', 'in_progress'] }
    })
    const completedJobs = await Job.count({
      where: { status: 'done' }
    })
    const totalCommission = await Job.sum('commission_amount', {
      where: { status: 'done' }
    }) || 0

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalTechnicians,
        pendingApprovals,
        totalJobs,
        activeJobs,
        completedJobs,
        totalCommission
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /admin/technicians/pending
// Get all technicians waiting for approval
router.get('/technicians/pending', adminAuth, async (req, res) => {
  try {
    const pending = await TechnicianProfile.findAll({
      where: { approved: false },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'phone', 'city', 'createdAt']
      }]
    })

    res.json({ success: true, technicians: pending })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /admin/technicians/:id/approve
// Approve a technician
router.put('/technicians/:id/approve', adminAuth, async (req, res) => {
  try {
    const profile = await TechnicianProfile.findByPk(req.params.id)

    if (!profile) {
      return res.status(404).json({
        success: false, message: 'Profile not found'
      })
    }

    await profile.update({ approved: true })

    // Also mark user as verified
    await User.update(
      { is_verified: true },
      { where: { id: profile.user_id } }
    )

    res.json({ success: true, message: 'Technician approved' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /admin/technicians/:id/reject
// Reject a technician
router.put('/technicians/:id/reject', adminAuth, async (req, res) => {
  try {
    const profile = await TechnicianProfile.findByPk(req.params.id)

    if (!profile) {
      return res.status(404).json({
        success: false, message: 'Profile not found'
      })
    }

    await profile.destroy()

    res.json({ success: true, message: 'Technician rejected' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /admin/jobs
// Get all jobs with filters
router.get('/jobs', adminAuth, async (req, res) => {
  try {
    const { status } = req.query

    const where = status ? { status } : {}

    const jobs = await Job.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    })

    res.json({ success: true, jobs })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// PUT /admin/jobs/:id/dispute
// Mark a job as disputed
router.put('/jobs/:id/dispute', adminAuth, async (req, res) => {
  try {
    await Job.update(
      { status: 'disputed' },
      { where: { id: req.params.id } }
    )

    res.json({ success: true, message: 'Job marked as disputed' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /admin/users
// Get users with optional type filter
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { type } = req.query
    const where = type ? { user_type: type } : {}

    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'phone', 'city', 'user_type', 'is_verified', 'wallet_balance', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 100
    })

    res.json({ success: true, users })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /admin/technicians
// Get all technicians with their profile details
router.get('/technicians', adminAuth, async (req, res) => {
  try {
    const technicians = await TechnicianProfile.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'phone', 'city', 'is_verified', 'wallet_balance', 'createdAt']
      }],
      order: [['createdAt', 'DESC']]
    })

    res.json({ success: true, technicians })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /admin/users/:id
// Get full user details and activity
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    const jobs = await Job.findAll({
      where: user.user_type === 'homeowner' ? { homeowner_id: user.id } : { technician_id: user.id },
      order: [['createdAt', 'DESC']],
      limit: 10
    })

    let techProfile = null
    if (user.user_type === 'technician') {
      techProfile = await TechnicianProfile.findOne({ where: { user_id: user.id } })
    }

    res.json({ success: true, user, jobs, techProfile })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
