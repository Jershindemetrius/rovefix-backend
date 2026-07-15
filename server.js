const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
app.use(cors())

// 🛡️ SECURITY & RELIABILITY LAYER
const requestCounts = new Map();
app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: now });
  } else {
    const data = requestCounts.get(ip);
    if (now - data.startTime > 60000) {
      data.count = 1;
      data.startTime = now;
    } else {
      data.count++;
    }
    if (data.count > 100) return res.status(429).json({ success: false, message: 'Too many requests' });
  }
  next();
});

const API_SECRET_KEY = process.env.API_SECRET_KEY || 'rf_sec_2026_x99_zanvis';
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/app-version' || req.path.startsWith('/public')) return next();
  const appKey = req.headers['x-rovefix-app-key'];
  if (appKey !== API_SECRET_KEY) return res.status(403).json({ success: false, message: 'Unauthorized Client' });
  next();
});

app.use(express.json({ limit: '30mb' })) // Increased for multiple Base64 photos
app.use(express.urlencoded({ limit: '30mb', extended: true, parameterLimit: 50000 }))

// --- MONITORING & UPDATES ---
app.get('/health', (req, res) => res.json({ status: 'online', version: '1.0.1' }))

app.get('/app-version', (req, res) => {
  res.json({
    latest_version_code: 1,
    latest_version_name: "1.0.0",
    update_required: false, // Set true to block app access
    download_url: "https://github.com/Jershindemetrius/rovefix-backend/releases/download/v1.0.0/Rovefix.apk",
    release_notes: "Stability and reliability update."
  })
})

require('./database')
const models = require('./models/associations')
const sequelize = require('./database')

sequelize.sync({ alter: true }).then(() => {
  console.log('✅ Database synchronized')
}).catch(err => console.error('❌ Database sync failed:', err))

// Routes
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

app.use(express.static(path.join(__dirname, 'public')))

// APK Download
app.get('/download-app', (req, res) => {
  res.redirect('https://github.com/Jershindemetrius/rovefix-backend/releases/download/v1.0.0/Rovefix.apk');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack)
  res.status(500).json({ success: false, message: 'Internal Server Error' })
})

const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
