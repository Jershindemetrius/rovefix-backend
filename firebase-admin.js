const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

// Locally: read from the JSON file directly
// On Render: read from environment variable
let serviceAccount
let firebaseApp

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // On Render — parse from environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  } else {
    // Local — try to read from the file directly
    try {
      serviceAccount = require('./firebase-service-account.json')
    } catch (e) {
      console.warn('⚠️ firebase-service-account.json not found and FIREBASE_SERVICE_ACCOUNT env var not set.')
    }
  }

  if (serviceAccount) {
    firebaseApp = initializeApp({
      credential: cert(serviceAccount)
    })
    console.log('✅ Firebase Admin initialized successfully')
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message)
}

module.exports = {
  auth: () => {
    if (!firebaseApp) {
      throw new Error('Firebase Admin was not initialized. Check your credentials.')
    }
    return getAuth()
  }
}
