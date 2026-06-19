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
    await User.sync({ force: false })
    console.log('Users table ready ✅')

    await TechnicianProfile.sync({ force: false })
    console.log('TechnicianProfiles table ready ✅')

    await Job.sync({ force: false })
    console.log('Jobs table ready ✅')

    await Payment.sync({ force: false })
    console.log('Payments table ready ✅')

    await Review.sync({ force: false })
    console.log('Reviews table ready ✅')

    console.log('All tables created successfully! 🎉')
    process.exit(0)  // exit after sync is done

  } catch (error) {
    console.log('Error creating tables:', error)
    process.exit(1)
  }
}

syncDatabase()