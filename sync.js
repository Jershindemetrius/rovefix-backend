// Run this file ONCE to create all tables in your database
// After tables are created you won't need to run this again

require('dotenv').config()
require('./database')  // connect to database

// Import all models
const User = require('./models/User')
const TechnicianProfile = require('./models/TechnicianProfile')
const Job = require('./models/Job')
const Payment = require('./models/Payment')
const Review = require('./models/Review')

// sync({ force: false }) means: create table only if it doesn't exist
// Never use force: true in production — it deletes all your data
async function syncDatabase() {
  try {
    // alter: true will add missing columns without deleting data
    await User.sync({ alter: true })
    console.log('Users table updated ✅')

    await TechnicianProfile.sync({ alter: true })
    console.log('TechnicianProfiles table updated ✅')

    await Job.sync({ alter: true })
    console.log('Jobs table updated ✅')

    await Payment.sync({ alter: true })
    console.log('Payments table updated ✅')

    await Review.sync({ alter: true })
    console.log('Reviews table updated ✅')

    console.log('All tables created successfully! 🎉')
    process.exit(0)  // exit after sync is done

  } catch (error) {
    console.log('Error creating tables:', error)
    process.exit(1)
  }
}

syncDatabase()