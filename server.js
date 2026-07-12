const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

// Connect to database
require('./database')

// Load model associations (relationships between tables)
const models = require('./models/associations')

// Database Sync
const sequelize = require('./database')
sequelize.sync({ alter: true }).then(() => {
  console.log('✅ Database synchronized (alter: true)')
}).catch(err => {
  console.error('❌ Database sync failed:', err)
})

// Import routes
const authRoutes = require('./routes/auth')
const jobRoutes = require('./routes/jobs')
const userRoutes = require('./routes/users')
const adminRoutes = require('./routes/admin')
const chatRoutes = require('./routes/chats')
const bidRoutes = require('./routes/bids')
const supportRoutes = require('./routes/support')
const uploadRoutes = require('./routes/upload')

// Serve static landing page and downloads
app.use(express.static(path.join(__dirname, 'public')))

// Manual APK Download Route (Safety Redirect to GitHub)
app.get('/downloads/rovefix.apk', (req, res) => {
  // Redirecting to your official GitHub APK host for maximum reliability
  res.redirect('https://github.com/Jershindemetrius/rovefix-backend/raw/93428ee9cc2475fe48389eeb7c4512739c34bf96/public/downloads/Rovefix.apk')
})

// Register routes with a prefix
app.use('/auth', authRoutes)
app.use('/jobs', jobRoutes)
app.use('/users', userRoutes)
app.use('/admin', adminRoutes)
app.use('/chats', chatRoutes)
app.use('/bids', bidRoutes)
app.use('/support', supportRoutes)
app.use('/upload', uploadRoutes)

// Debug Firebase
app.get('/debug-firebase', (req, res) => {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!sa) return res.json({ status: 'missing' })
  try {
    const parsed = JSON.parse(sa)
    res.json({
      status: 'configured',
      project_id: parsed.project_id,
      private_key_present: !!parsed.private_key,
      client_email: parsed.client_email
    })
  } catch(e) {
    res.json({ status: 'parse_error', error: e.message })
  }
})

// Serve admin panel
app.get('/admin-panel', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
