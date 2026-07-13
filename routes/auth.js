const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const firebaseAdmin = require('../firebase-admin')
const User = require('../models/User')
const { generateReferralCode } = require('../utils/referral')

// --- DEBUG ROUTE ---
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'Auth engine is running' })
})

// --- PIN-BASED AUTH (NEW) ---

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { phone, pin, name, user_type, referral_code_used } = req.body
    console.log('[Auth] Registering:', phone)

    if (!phone || !pin || pin.length !== 6) {
      return res.status(400).json({ success: false, message: 'Invalid phone or 6-digit PIN' })
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { phone } })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' })
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10)

    // Handle referral logic
    let referredByUserId = null
    if (referral_code_used) {
      const referrer = await User.findOne({ where: { referral_code: referral_code_used.toUpperCase() } })
      if (referrer) referredByUserId = referrer.id
    }

    const user = await User.create({
      name: name || 'User',
      phone,
      pin: hashedPin,
      user_type: user_type || 'homeowner',
      referral_code: generateReferralCode(name || 'RV'),
      referred_by: referredByUserId,
      is_verified: true
    })

    const token = jwt.sign(
      { id: user.id, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    res.json({
      success: true,
      token,
      is_profile_complete: false,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        user_type: user.user_type,
        referral_code: user.referral_code
      }
    })
  } catch (error) {
    console.error('[Auth] Registration error:', error)
    res.status(500).json({ success: false, message: 'Registration failed' })
  }
})

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, pin } = req.body
    console.log('[Auth] Login attempt:', phone)

    const user = await User.findOne({ where: { phone } })
    if (!user || !user.pin) {
      return res.status(404).json({ success: false, message: 'User not found or PIN not set' })
    }

    const isMatch = await bcrypt.compare(pin, user.pin)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid 6-digit PIN' })
    }

    const token = jwt.sign(
      { id: user.id, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    const isProfileComplete = user.name && user.name !== 'User' && user.city

    res.json({
      success: true,
      token,
      is_profile_complete: !!isProfileComplete,
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
    console.error('[Auth] Login error:', error)
    res.status(500).json({ success: false, message: 'Login failed' })
  }
})

// Legacy OTP verify (optional)
router.post('/verify', async (req, res) => {
  try {
    const { firebase_token, name, user_type, city, referral_code_used } = req.body
    const decoded = await firebaseAdmin.auth().verifyIdToken(firebase_token)
    const phone = decoded.phone_number
    const firebase_uid = decoded.uid

    let user = await User.findOne({ where: { firebase_uid } })
    if (!user) {
      user = await User.create({
        name: name || 'User',
        phone,
        user_type,
        city: city || '',
        firebase_uid,
        is_verified: false,
        referral_code: generateReferralCode(name || 'RV')
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
        user_type: user.user_type
      }
    })
  } catch (error) {
    res.status(401).json({ success: false, message: 'Verification failed' })
  }
})

module.exports = router
