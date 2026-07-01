// Helper to send push notifications via FCM
const admin = require('../firebase-admin')

async function sendNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) return

  try {
    const message = {
      notification: { title, body },
      data: { ...data },
      token: fcmToken
    }

    await admin.messaging().send(message)
    console.log('Notification sent successfully')
  } catch (error) {
    console.log('Notification error:', error.message)
  }
}

module.exports = { sendNotification }
