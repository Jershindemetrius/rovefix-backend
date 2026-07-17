const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
app.use(cors())

// ==========================================================
// 1. PUBLIC ROUTES & LANDING PAGE (Always Accessible)
// ==========================================================

// Serve static files (images, css, etc.) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')))

// Landing Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// APK Download Route
app.get('/download-app', (req, res) => {
  // Directly redirect to your official GitHub release for the fastest download
  res.redirect('https://github.com/Jershindemetrius/rovefix-backend/releases/download/v1.0.0/Rovefix.apk');
});

// Health Check (For Monitoring)
app.get('/health', (req, res) => res.json({ status: 'online', version: '1.1.0' }))

const faqs = [
  { q: "How do I become a verified technician?", a: "Go to your profile and upload your Aadhaar and Professional License. Our admin team will review it within 24 hours." },
  { q: "Is payment secure?", a: "Currently, Rovefix facilitates the booking. Payments are made directly to the technician in cash after you are satisfied with the work." },
  { q: "What if I have a dispute?", a: "You can 'Report an Issue' directly from the job status screen. Our support team will mediate and resolve it." },
  { q: "How do I update my profile?", a: "Go to the Profile tab and tap 'Edit'. You can update your name, city, and bio there." },
  { q: "Can I cancel a request?", a: "Yes, you can cancel an open request at any time before a technician accepts it." }
]

// FAQ Route
app.get('/support/faqs', (req, res) => res.json({ success: true, faqs }))

// ==========================================================
// 2. MASTER UPDATE CONTROL (Change these to trigger updates)
// ==========================================================
app.get('/app-version', (req, res) => {
  res.json({
    latest_version_code: 1,      // Increment this (1, 2, 3...) when you release a new APK
    latest_version_name: "1.0.0",
    update_required: false,      // Set to TRUE to force all users to update before using the app
    download_url: "https://github.com/Jershindemetrius/rovefix-backend/releases/download/v1.0.0/Rovefix.apk",
    release_notes: "Stability and reliability update. Fixed image uploads and improved performance."
  })
})

// ==========================================================
// 3. SECURITY & PROTECTION LAYER
// ==========================================================

// Rate Limiting (Prevents Spam/DDoS)
const requestCounts = new Map();
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
  } else {
    const data = requestCounts.get(ip);
    if (now - data.startTime > 60000) { // 1 minute window
      data.count = 1;
      data.startTime = now;
    } else {
      data.count++;
    }
    if (data.count > 100) return res.status(429).json({ success: false, message: 'Too many requests' });
  }
  next();
});

// App Handshake (Only allow our official app to talk to the API)
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'rf_sec_2026_x99_zanvis';
const apiRoutes = ['/auth', '/jobs', '/users', '/admin', '/chats', '/bids', '/support', '/upload'];

app.use((req, res, next) => {
  const isApiRoute = apiRoutes.some(route => req.path.startsWith(route));

  if (isApiRoute) {
    const appKey = req.headers['x-rovefix-app-key'];
    if (appKey !== API_SECRET_KEY) {
      console.warn(`[Security] Blocked unauthorized request from ${req.ip} to ${req.path}`);
      return res.status(403).json({ success: false, message: 'Unauthorized Client' });
    }
  }
  next();
});

// ==========================================================
// 4. API CONFIGURATION & ROUTES
// ==========================================================

app.use(express.json({ limit: '30mb' })) // Support large Base64 uploads
app.use(express.urlencoded({ limit: '30mb', extended: true, parameterLimit: 50000 }))

// Database Connection & Synchronization
require('./database')
require('./models/associations')
const sequelize = require('./database')

sequelize.sync({ alter: true }).then(() => {
  console.log('✅ Database Synchronized')
}).catch(err => console.error('❌ Database Sync Failed:', err))

// Register API Route Files
const authRoutes = require('./routes/auth')
const jobRoutes = require('./routes/jobs')
const userRoutes = require('./routes/users')
const adminRoutes = require('./routes/admin')
const chatRoutes = require('./routes/chats')
const bidRoutes = require('./routes/bids')
const supportRoutes = require('./routes/support')
const uploadRoutes = require('./routes/upload')

app.use('/auth', authRoutes)
app.use('/jobs', jobRoutes)
app.use('/users', userRoutes)
app.use('/admin', adminRoutes)
app.use('/chats', chatRoutes)
app.use('/bids', bidRoutes)
app.use('/support', supportRoutes)
app.use('/upload', uploadRoutes)

// Admin panel (Browser access)
app.get('/admin-panel', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'))
})

// ==========================================================
// 5. ERROR HANDLING & SERVER START
// ==========================================================

app.use((err, req, res, next) => {
  console.error('[System Error]', err.stack)
  res.status(500).json({ success: false, message: 'Internal Server Error' })
})

const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => {
  console.log(`🚀 Rovefix Engine Running on Port ${PORT}`)
})

// High-Performance connection settings
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
