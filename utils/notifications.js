// Helper to send push notifications via FCM
const admin = require('../firebase-admin')

async function sendNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) return

  try {
    // 🛡️ SECURITY: FCM data payload must contain only string values
    const stringData = {}
    Object.keys(data).forEach(key => {
      stringData[key] = data[key] ? String(data[key]) : ""
    })

    const message = {
      notification: { title, body },
      data: stringData,
      token: fcmToken
    }

    await admin.messaging().send(message)
    console.log(`[FCM] Notification sent successfully to ${fcmToken.substring(0, 10)}...`)
  } catch (error) {
    console.error(`[FCM Error]: ${error.message}`)
  }
}

module.exports = { sendNotification }
