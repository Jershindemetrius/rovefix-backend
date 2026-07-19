const express = require('express')
const router = express.Router()
const adminAuth = require('../middleware/adminAuth')
const { User, Job, TechnicianProfile, Review, Report } = require('../models/associations')
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

      // Calculate Total Revenue
      totalRevenue: await Job.sum('price', { where: { status: 'done' } }) || 0
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

// ❌ SECURE REJECTION
router.put('/technicians/:id/reject', adminAuth, async (req, res) => {
  try {
    const profile = await TechnicianProfile.findByPk(req.params.id)
    if (!profile) return res.status(404).json({ success: false, message: 'Not found' })
    await profile.destroy()
    res.json({ success: true, message: 'Technician Rejected & Data Purged' })
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
