const express = require('express')
const router = express.Router()
const adminAuth = require('../middleware/adminAuth')
const { User, Job, TechnicianProfile, Review, Report } = require('../../models/associations')
const { Op } = require('sequelize')

// 📊 ADVANCED ADMIN DASHBOARD
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const stats = {
      totalUsers: await User.count({ where: { user_type: 'homeowner' } }),
      totalTechnicians: await User.count({ where: { user_type: 'technician' } }),
      pendingApprovals: await TechnicianProfile.count({ where: { approved: false } }),
      totalJobs: await Job.count(),
      activeJobs: await Job.count({ where: { status: ['matched', 'in_progress'] } }),
      completedJobs: await Job.count({ where: { status: 'done' } }),
      disputedJobs: await Job.count({ where: { status: 'disputed' } }),
      newUsersToday: await User.count({ where: { createdAt: { [Op.gte]: today } } }),
      totalRevenue: await Job.sum('price', { where: { status: 'done' } }) || 0
    }
    res.json({ success: true, stats })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 🛡️ ENHANCED VERIFICATION (Pending List)
router.get('/technicians/pending', adminAuth, async (req, res) => {
  try {
    const pending = await TechnicianProfile.findAll({
      where: { approved: false },
      attributes: ['id', 'user_id', 'category', 'id_doc_url', 'license_doc_url', 'createdAt'],
      include: [{ model: User, as: 'user', attributes: ['name', 'phone', 'city'] }]
    })
    res.json({ success: true, technicians: pending })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 👥 USER MANAGEMENT
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { type } = req.query
    const users = await User.findAll({
      where: type ? { user_type: type } : {},
      attributes: ['id', 'name', 'phone', 'city', 'user_type', 'is_verified', 'createdAt'],
      order: [['createdAt', 'DESC']]
    })
    res.json({ success: true, users })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 📁 FULL JOB HISTORY (LEDGER)
router.get('/jobs', adminAuth, async (req, res) => {
  try {
    const jobs = await Job.findAll({
      include: [
        { model: User, as: 'homeowner', attributes: ['name', 'city'] },
        { model: User, as: 'technician', attributes: ['name', 'city'] }
      ],
      order: [['createdAt', 'DESC']]
    })
    res.json({ success: true, jobs })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 🚀 DEPLOYMENT STATUS
router.get('/status', adminAuth, (req, res) => {
  res.json({
    success: true,
    version: "1.2.1-legacy-compat",
    deployedAt: "2026-07-19 23:15:00",
    routes: ["dashboard", "pending", "users", "jobs", "status"]
  })
})

module.exports = router
