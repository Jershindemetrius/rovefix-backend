const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

// Locally: read from the JSON file directly
// On Render: read from environment variable
let serviceAccount

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // On Render — parse from environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
} else {
  // Local — read from the file directly
  serviceAccount = require('./firebase-service-account.json')
}

initializeApp({
  credential: cert(serviceAccount)
})

module.exports = {
  auth: () => getAuth()
}