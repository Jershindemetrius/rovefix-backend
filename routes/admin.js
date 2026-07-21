const express = require('express')
const router = express.Router()
const adminAuth = require('../middleware/adminAuth')
const { User, Job, TechnicianProfile, Review, Report, SupportTicket } = require('../models/associations')
const { Op } = require('sequelize')
const sequelize = require('../database')

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
      emergencyJobs: await Job.count({ where: { is_emergency: true, status: ['open', 'matched', 'in_progress'] } }),
      newUsersToday: await User.count({ where: { createdAt: { [Op.gte]: today } } }),

      // Calculate Total Revenue
      totalRevenue: await Job.sum('price', { where: { status: 'done' } }) || 0,

      // Top Category Stats (For Analytics)
      categoryStats: await Job.findAll({
        attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['category'],
        raw: true
      })
    }

    res.json({ success: true, stats })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 📄 GENERATE SYSTEM REPORT
router.get('/report/snapshot', adminAuth, async (req, res) => {
  try {
    const topTechnicians = await TechnicianProfile.findAll({
      where: { approved: true },
      order: [['avg_rating', 'DESC']],
      limit: 5,
      include: [{ model: User, as: 'user', attributes: ['name', 'phone'] }]
    });

    const recentDisputes = await Job.findAll({
      where: { status: 'disputed' },
      order: [['updatedAt', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      report: {
        generatedAt: new Date(),
        topTechnicians,
        recentDisputes
      }
    })
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

// 🗑️ PRIVACY-SAFE APPROVAL
router.put('/technicians/:id/approve', adminAuth, async (req, res) => {
  try {
    const profile = await TechnicianProfile.findByPk(req.params.id)
    if (!profile) return res.status(404).json({ success: false, message: 'Not found' })
    await profile.update({ approved: true, id_doc_url: null, license_doc_url: null }) // Purge docs after approval
    await User.update({ is_verified: true }, { where: { id: profile.user_id } })
    res.json({ success: true, message: 'Technician Verified' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// ❌ SECURE REJECTION (Resets user so they can re-apply)
router.put('/technicians/:id/reject', adminAuth, async (req, res) => {
  try {
    const profile = await TechnicianProfile.findByPk(req.params.id)
    if (!profile) return res.status(404).json({ success: false, message: 'Not found' })

    const userId = profile.user_id
    await profile.destroy()

    // Reset user completion status so they can fix their profile and re-upload docs
    await User.update({ is_profile_complete: false }, { where: { id: userId } })

    res.json({ success: true, message: 'Technician Rejected. Status reset for re-application.' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 🎫 SUPPORT TICKET MANAGEMENT
router.get('/support', adminAuth, async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({
      include: [{ model: User, attributes: ['name', 'phone'] }],
      order: [['createdAt', 'DESC']]
    })
    res.json({ success: true, tickets })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

router.put('/support/:id/resolve', adminAuth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id)
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' })

    await ticket.update({ status: 'resolved' })
    res.json({ success: true, message: 'Ticket marked as resolved' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 🚩 VIEW REPORTS
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const reports = await Report.findAll({
      include: [
        { model: User, as: 'reporter', attributes: ['name', 'phone'] },
        { model: User, as: 'reported', attributes: ['name', 'phone', 'user_type'] }
      ],
      order: [['createdAt', 'DESC']]
    })
    res.json({ success: true, reports })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 🛠️ RESOLVE REPORT
router.put('/reports/:id/resolve', adminAuth, async (req, res) => {
  try {
    const { status } = req.body // 'resolved' or 'ignored'
    const report = await Report.findByPk(req.params.id)
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' })

    await report.update({ status })
    res.json({ success: true, message: `Report marked as ${status}` })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// 👥 USER MANAGEMENT (With Activity History)
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

// 🚀 DEPLOYMENT STATUS (For Verification)
router.get('/status', adminAuth, (req, res) => {
  res.json({
    success: true,
    version: "1.2.2",
    deployedAt: "2026-07-20 19:15:00",
    routes: ["dashboard", "snapshot", "pending", "approve", "reject", "reports", "resolve", "users", "jobs", "status"]
  })
})

// ❌ BAN/REMOVE USER PERMANENTLY
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    // Cleanup associated data
    await TechnicianProfile.destroy({ where: { user_id: user.id } })
    await Job.destroy({ where: { [Op.or]: [{ homeowner_id: user.id }, { technician_id: user.id }] } })

    await user.destroy()
    res.json({ success: true, message: 'User and all associated data removed' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
