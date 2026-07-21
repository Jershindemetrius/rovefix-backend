// Helper to send push notifications via FCM
const admin = require('../firebase-admin')
const Notification = require('../models/Notification')

async function sendNotification(userId, fcmToken, title, body, data = {}) {
  // 1. Save to Database for In-App Inbox (Always do this if userId provided)
  if (userId) {
    try {
      await Notification.create({
        user_id: userId,
        title,
        body,
        data
      })
    } catch (dbErr) {
      console.error('[Notification DB Error]:', dbErr.message)
    }
  }

  // 2. Send Push Notification via Firebase
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
