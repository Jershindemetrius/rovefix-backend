const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const User = require('../models/User')
const TechnicianProfile = require('../models/TechnicianProfile')

// PUT /users/profile
// Update name, city, and category after login
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, city, category } = req.body

    // Update the user's name and city
    await User.update(
      { name, city },
      { where: { id: req.user.id } }
    )

    // If technician, create or update their profile
    if (req.user.user_type === 'technician' && category) {
      const existing = await TechnicianProfile.findOne({
        where: { user_id: req.user.id }
      })

      if (existing) {
        await existing.update({ category })
      } else {
        await TechnicianProfile.create({
          user_id: req.user.id,
          category,
          approved: false
        })
      }
    }

    res.json({ success: true, message: 'Profile updated' })

  } catch (error) {
    console.log('Update profile error:', error)
    res.status(500).json({ success: false, message: 'Failed to update profile' })
  }
})

module.exports = router