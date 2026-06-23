// This file handles login
// Firebase already sends the OTP to the user's phone
// Our job here is just to verify the Firebase token and create the user in our database

const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const firebaseAdmin = require('../firebase-admin') // we'll create this file next
const User = require('../models/User')

// POST /auth/verify
// Called after user enters OTP successfully in the app
// App sends the Firebase token, we verify it and return our own JWT
router.post('/verify', async (req, res) => {
  try {
    const { firebase_token, name, user_type, city } = req.body
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
      user = await User.create({
        name,
        phone,
        user_type,
        city,
        firebase_uid,
        is_verified: false
      })
    }

    // Step 3: create our own JWT token to send back to the app
    // The app will store this and send it with every future request
    const token = jwt.sign(
      { id: user.id, user_type: user.user_type },  // data stored inside the token
      process.env.JWT_SECRET,                        // secret key from .env
      { expiresIn: '30d' }                           // token expires in 30 days
    )

    // Send back the token and user info to the app
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        user_type: user.user_type,
        city: user.city
      }
    })

  } catch (error) {
    console.error('Auth error detail:', error)
    res.status(401).json({
      success: false,
      message: error.message || 'Verification failed',
      code: error.code || 'no_code',
      hint: 'Ensure your app and backend use the same Firebase project and the FIREBASE_SERVICE_ACCOUNT is correct on Render.'
    })
  }
})

module.exports = router