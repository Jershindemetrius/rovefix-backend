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

// FAQs now handled in /support/faqs route file

// ==========================================================
// 2. MASTER UPDATE CONTROL
// ==========================================================
app.get('/app-version', (req, res) => {
  res.json({
    latest_version_code: 1,
    latest_version_name: "1.0.0",
    update_required: false,
    download_url: "https://rovefix.com/download",
    release_notes: "Platform stability and bug fixes."
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
