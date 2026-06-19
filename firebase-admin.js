// Firebase Admin v14 uses a different import style than older versions

const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const serviceAccount = require('./firebase-service-account.json')

// Initialize the app using cert directly
initializeApp({
  credential: cert(serviceAccount)
})

// Export auth so other files can use it
module.exports = {
  auth: () => getAuth()
}