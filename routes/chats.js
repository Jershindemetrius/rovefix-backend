const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const Message = require('../models/Message')
const User = require('../models/User')
const Job = require('../models/Job')
const { sendNotification } = require('../utils/notifications')

// GET /chats/:job_id
// Get all messages for a specific job
router.get('/:job_id', auth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { job_id: req.params.job_id },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name']
      }],
      order: [['createdAt', 'ASC']]
    })

    res.json({ success: true, messages })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /chats/:job_id
// Send a new message
router.post('/:job_id', auth, async (req, res) => {
  try {
    const { text } = req.body
    const job_id = req.params.job_id
    const sender_id = req.user.id

    const message = await Message.create({
      job_id,
      sender_id,
      text
    })

    // Notify the other person
    const job = await Job.findByPk(job_id)
    const recipientId = (sender_id === job.homeowner_id)
        ? job.technician_id
        : job.homeowner_id

    if (recipientId) {
      const recipient = await User.findByPk(recipientId)
      if (recipient && recipient.fcm_token) {
        await sendNotification(
          recipient.fcm_token,
          'New Message 💬',
          text.substring(0, 50),
          { type: 'new_message', job_id }
        )
      }
    }

    res.json({ success: true, message })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
