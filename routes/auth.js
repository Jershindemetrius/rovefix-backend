// This file handles login
// Firebase already sends the OTP to the user's phone
// Our job here is just to verify the Firebase token and create the user in our database

const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const firebaseAdmin = require('../firebase-admin') // we'll create this file next
const User = require('../models/User')
const WalletTransaction = require('../models/WalletTransaction')
const { generateReferralCode } = require('../utils/referral')

// POST /auth/verify
// Called after user enters OTP successfully in the app
// App sends the Firebase token, we verify it and return our own JWT
router.post('/verify', async (req, res) => {
  try {
    const { firebase_token, name, user_type, city, referral_code_used } = req.body
    // firebase_token  — sent from the Android app after OTP success
    // name, user_type, city — basic info the user filled in

    // Step 1: verify the Firebase token is real and not fake
    const decoded = await firebaseAdmin.auth().verifyIdToken(firebase_token)
    const phone = decoded.phone_number  // get the phone number from the token
    const firebase_uid = decoded.uid    // unique Firebase ID for this user

    // Step 2: check if this user already exists in our database
    let user = await User.findOne({ where: { firebase_uid } })

    if (!user) {
      // New user — create them in our database

      // Handle referral logic
      let referredByUserId = null
      if (referral_code_used) {
        const referrer = await User.findOne({ where: { referral_code: referral_code_used.toUpperCase() } })
        if (referrer) {
          referredByUserId = referrer.id
          // Reward referrer (₹100)
          await referrer.increment('wallet_balance', { by: 100 })
          await WalletTransaction.create({
            user_id: referrer.id,
            amount: 100,
            type: 'credit',
            description: 'Referral Bonus (Invite)'
          })
        }
      }

      user = await User.create({
        name: name || 'User',
        phone,
        user_type,
        city: city || '',
        firebase_uid,
        is_verified: false,
        referral_code: generateReferralCode(name || 'RV'),
        referred_by: referredByUserId,
        wallet_balance: referredByUserId ? 50 : 0 // New user gets ₹50 if referred
      })

      if (referredByUserId) {
        await WalletTransaction.create({
          user_id: user.id,
          amount: 50,
          type: 'credit',
          description: 'Welcome Bonus (Referral)'
        })
      }
    }

    // Step 3: create our own JWT token to send back to the app
    // The app will store this and send it with every future request
    const token = jwt.sign(
      { id: user.id, user_type: user.user_type },  // data stored inside the token
      process.env.JWT_SECRET,                        // secret key from .env
      { expiresIn: '30d' }                           // token expires in 30 days
    )

    // Check if profile is complete (name is set and not default placeholder)
    const isProfileComplete = user.name && user.name !== 'User' && user.city

    // Send back the token and user info to the app
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
        referral_code: user.referral_code,
        wallet_balance: user.wallet_balance
      }
    })

  } catch (error) {
    console.error('Auth error detail:', error)

    let userHint = 'Ensure your app and backend use the same Firebase project.'
    if (error.code === 'auth/id-token-expired') {
      userHint = 'The session has expired. Please try sending a new OTP.'
    } else if (error.code === 'auth/argument-error') {
      userHint = 'Invalid token format. Please restart the app and try again.'
    } else if (error.message.includes('aud')) {
      userHint = 'Project Mismatch! Your app and backend are using different Firebase projects.'
    }

    res.status(401).json({
      success: false,
      message: error.message || 'Verification failed',
      code: error.code || 'no_code',
      hint: userHint,
      technical_details: error.message,
      firebase_error_code: error.code
    })
  }
})

module.exports = router