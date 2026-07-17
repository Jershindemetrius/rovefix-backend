const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const firebaseAdmin = require('../firebase-admin')
const User = require('../models/User')
const { generateReferralCode } = require('../utils/referral')
const { registerRules, validate } = require('../middleware/validator')
const { Op } = require('sequelize')

// --- HELPERS ---
const normalizePhone = (phone) => {
  if (!phone) return ''
  // Remove all non-numeric characters
  let digits = phone.replace(/\D/g, '')
  // If it starts with 91 followed by 10 digits, strip the prefix
  if (digits.length === 12 && digits.startsWith('91')) return digits.substring(2)
  return digits
}

// --- DEBUG ROUTE ---
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'Auth engine is running' })
})

// --- SECURE PIN-BASED AUTH ---

// POST /auth/register
router.post('/register', registerRules, validate, async (req, res) => {
  try {
    let { phone, pin, name, user_type, referral_code_used } = req.body

    const normalized = normalizePhone(phone)
    console.log(`[Auth] Registration attempt: ${phone}, normalized: ${normalized}`)

    if (!pin || String(pin).length !== 6) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit PIN' })
    }

    const hashedPin = await bcrypt.hash(String(pin), 10)

    // Check multiple formats to avoid duplicate accounts
    let user = await User.findOne({
      where: {
        [Op.or]: [
          { phone: normalized },
          { phone: phone }
        ]
      }
    })

    if (user) {
      if (user.pin) {
        return res.status(400).json({ success: false, message: 'Already registered. Please login.' })
      }
      user.pin = hashedPin
      if (name) user.name = name
      if (user_type) user.user_type = user_type
      await user.save()
    } else {
      let referredByUserId = null
      if (referral_code_used) {
        const referrer = await User.findOne({ where: { referral_code: referral_code_used.toUpperCase() } })
        if (referrer) referredByUserId = referrer.id
      }

      user = await User.create({
        name: name || 'User',
        phone: normalized,
        pin: hashedPin,
        user_type: user_type || 'homeowner',
        referral_code: generateReferralCode(name || 'RV'),
        referred_by: referredByUserId,
        is_verified: true
      })
    }

    const token = jwt.sign(
      { id: user.id, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      success: true,
      token,
      is_profile_complete: !!(user.name && user.name !== 'User' && user.city),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        user_type: user.user_type,
        city: user.city,
        referral_code: user.referral_code
      }
    })
  } catch (error) {
    console.error('Registration failed:', error)
    res.status(500).json({ success: false, message: 'Registration failed' })
  }
})

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    let { phone, pin } = req.body
    const normalized = normalizePhone(phone)

    console.log(`[Auth] Login attempt for: ${phone}, normalized: ${normalized}`)

    const user = await User.findOne({
      where: {
        [Op.or]: [
          { phone: normalized },
          { phone: phone }
        ]
      }
    })

    if (!user || !user.pin) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const now = new Date()

    // 🛡️ SECURITY Check 1: Check Lockout status
    if (user.lockout_until && user.lockout_until > now) {
      const diffMs = user.lockout_until - now
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const mins = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      let timeStr = hours > 0 ? `${hours} hours` : `${mins} minutes`
      return res.status(403).json({
        success: false,
        message: `Account locked. Try again in ${timeStr}.`
      })
    }

    // Reset failed attempts if the previous lockout period has passed
    if (user.lockout_until && user.lockout_until <= now) {
      user.failed_attempts = 0
      user.lockout_until = null
      await user.save()
    }

    // Diagnostic logging
    console.log(`[Auth] Comparing PIN: incoming_len=${String(pin).length}, hash_len=${user.pin.length}`)

    const isMatch = await bcrypt.compare(String(pin), user.pin)

    if (!isMatch) {
      // 🛡️ SECURITY Check 2: Increment failed attempts
      user.failed_attempts += 1

      let message = 'Invalid 6-digit PIN'

      if (user.failed_attempts >= 5) {
        // Lock account for exactly 24 hours
        user.lockout_until = new Date(Date.now() + 24 * 60 * 60 * 1000)
        message = 'Too many failed attempts. Account locked for 24 hours.'
      } else {
        const remaining = 5 - user.failed_attempts
        message = `Invalid PIN. ${remaining} attempts remaining before 24-hour lockout.`
      }

      await user.save()
      await new Promise(resolve => setTimeout(resolve, 1500)) // Anti-brute force delay

      return res.status(401).json({ success: false, message })
    }

    // Success! Reset security counters
    user.failed_attempts = 0
    user.lockout_until = null
    await user.save()

    const token = jwt.sign(
      { id: user.id, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      success: true,
      token,
      is_profile_complete: !!(user.name && user.name !== 'User' && user.city),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        user_type: user.user_type,
        city: user.city,
        referral_code: user.referral_code
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Login failed' })
  }
})

module.exports = router
