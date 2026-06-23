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
require('./models/associations')

// Import routes
const authRoutes = require('./routes/auth')
const jobRoutes = require('./routes/jobs')
const userRoutes = require('./routes/users')
const paymentRoutes = require('./routes/payments')
const adminRoutes = require('./routes/admin')
const chatRoutes = require('./routes/chats')

// Register routes with a prefix
app.use('/auth', authRoutes)
app.use('/jobs', jobRoutes)
app.use('/users', userRoutes)
app.use('/payments', paymentRoutes)
app.use('/admin', adminRoutes)
app.use('/chats', chatRoutes)

// Serve admin panel
app.get('/admin-panel', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'))
})

// Test route
app.get('/', (req, res) => {
  res.send('Rovefix backend is running!')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
