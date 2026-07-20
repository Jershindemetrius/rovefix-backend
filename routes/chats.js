const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const Message = require('../models/Message')
const User = require('../models/User')
const Job = require('../models/Job')
const { sendNotification } = require('../utils/notifications')

// GET /chats/:job_id
router.get('/:job_id', auth, async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.job_id)
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

    const messages = await Message.findAll({
      where: { job_id: req.params.job_id },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'photo_url']
      }],
      order: [['createdAt', 'ASC']]
    })
    res.json({ success: true, messages, jobStatus: job.status })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// POST /chats/:job_id
router.post('/:job_id', auth, async (req, res) => {
  try {
    const { text, is_file, file_url, filename, filesize } = req.body
    const job_id = req.params.job_id
    const sender_id = req.user.id

    const job = await Job.findByPk(job_id)
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' })

    if (job.status === 'done' || job.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Cannot send message on a closed job' })
    }

    const message = await Message.create({
      job_id,
      sender_id,
      text: text || (is_file ? "Sent a file" : ""),
      is_file: is_file || false,
      file_url,
      filename,
      filesize
    })

    // Notification Logic
    const job = await Job.findByPk(job_id)
    const recipientId = (sender_id === job.homeowner_id) ? job.technician_id : job.homeowner_id

    if (recipientId) {
      const recipient = await User.findByPk(recipientId)
      if (recipient && recipient.fcm_token) {
        const notifyText = is_file ? `📷 Sent a file: ${filename}` : text
        await sendNotification(
          recipient.fcm_token,
          'New Message 💬',
          notifyText.substring(0, 50),
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
