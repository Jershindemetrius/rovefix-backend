const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const SupportTicket = require('../models/SupportTicket')

// POST /support
// Create a new support ticket
router.post('/', auth, async (req, res) => {
  try {
    const { subject, description } = req.body
    const ticket = await SupportTicket.create({
      user_id: req.user.id,
      subject,
      description
    })
    res.json({ success: true, ticket })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /support/my
// Get all tickets for the logged-in user
router.get('/my', auth, async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']]
    })
    res.json({ success: true, tickets })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// GET /support/faqs
// Simple static FAQs for MVP
router.get('/faqs', (req, res) => {
  const faqs = [
    { q: "How do I book a service?", a: "Go to the home screen, select a category, and describe your problem." },
    { q: "How do I pay?", a: "Payments are made via Razorpay once the job is marked as complete." },
    { q: "Is there a guarantee?", a: "Yes, all Rovefix repairs come with a 7-day workmanship guarantee." }
  ]
  res.json({ success: true, faqs })
})

module.exports = router
