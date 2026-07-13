const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
app.use(cors())

// Scalability: Allow large Base64 payloads and extended parameters
app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true, parameterLimit: 50000 }))

// --- MONITORING & UPDATES ---
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    engine: 'Rovefix v1.0.1'
  })
})

// Update notice system
app.get('/app-version', (req, res) => {
  res.json({
    latest_version_code: 1, // Start with 1 for your first release
    latest_version_name: "1.0.0",
    update_required: false,
    download_url: "https://github.com/Jershindemetrius/rovefix-backend/releases/download/v1.0.0/Rovefix.apk",
    release_notes: "Official Launch of Rovefix! Experience secure PIN login and reliable home services."
  })
})

// Connect to database
require('./database')

// Load model associations
const models = require('./models/associations')

// Database Sync
const sequelize = require('./database')
sequelize.sync({ alter: true }).then(() => {
  console.log('✅ Database synchronized (alter: true)')
  console.log('🚀 Base64 Engine Active: Columns updated to TEXT')
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

// Register API routes BEFORE static files
app.use('/auth', authRoutes)
app.use('/jobs', jobRoutes)
app.use('/users', userRoutes)
app.use('/admin', adminRoutes)
app.use('/chats', chatRoutes)
app.use('/bids', bidRoutes)
app.use('/support', supportRoutes)
app.use('/upload', uploadRoutes)

// Serve static landing page and downloads
app.use(express.static(path.join(__dirname, 'public')))

// ⚡ PROFESSIONAL APK DISTRIBUTION ENGINE
app.get('/download-app', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'downloads', 'Rovefix.apk');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.download(filePath, 'Rovefix_Official.apk', (err) => {
    if (err) {
      console.error('Local File Error:', err.message);
      res.redirect('https://github.com/Jershindemetrius/rovefix-backend/releases/download/v1.0.0/Rovefix.apk');
    }
  });
});

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

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  })
})

// Serve admin panel
app.get('/admin-panel', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'))
})

const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

// Reliability: Increase server timeouts for large image transfers
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
