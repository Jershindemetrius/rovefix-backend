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
// Business professional FAQs
router.get('/faqs', (req, res) => {
  const faqs = [
    { q: "How do I become a verified technician?", a: "Go to your profile and upload your Aadhaar and Professional License. Our admin team will review it within 24 hours." },
    { q: "Is payment secure?", a: "Currently, Rovefix facilitates the booking. Payments are made directly to the technician in cash after you are satisfied with the work." },
    { q: "What if I have a dispute?", a: "You can 'Report an Issue' directly from the job status screen. Our support team will mediate and resolve it." },
    { q: "How do I update my profile?", a: "Go to the Profile tab and tap 'Edit'. You can update your name, city, and bio there." },
    { q: "Can I cancel a request?", a: "Yes, you can cancel an open request at any time before a technician accepts it." }
  ]
  res.json({ success: true, faqs })
})

// DELETE /support/:id
// User cancels a support ticket
router.delete('/:id', auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id)
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' })

    if (ticket.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' })
    }

    await ticket.destroy()
    res.json({ success: true, message: 'Ticket cancelled' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
