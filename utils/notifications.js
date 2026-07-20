// Helper to send push notifications via FCM
const admin = require('../firebase-admin')

async function sendNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) return

  try {
    // Ensure all data fields are strings for FCM
    const stringData = {}
    Object.keys(data).forEach(key => {
      stringData[key] = String(data[key])
    })

    const message = {
      notification: { title, body },
      data: stringData,
      token: fcmToken
    }

    await admin.messaging().send(message)
    console.log('Notification sent successfully')
  } catch (error) {
    console.log('Notification error:', error.message)
  }
}

module.exports = { sendNotification }
