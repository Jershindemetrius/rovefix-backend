const express = require('express')
const cors = require('cors')
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

// Register routes with a prefix
// All auth routes start with /auth  (e.g. POST /auth/verify)
// All job routes start with /jobs   (e.g. POST /jobs, GET /jobs/open)
app.use('/auth', authRoutes)
app.use('/jobs', jobRoutes)

// Test route
app.get('/', (req, res) => {
  res.send('Rovefix backend is running!')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})