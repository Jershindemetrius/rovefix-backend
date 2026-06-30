require('dotenv').config()
require('./database')

const User = require('./models/User')
const TechnicianProfile = require('./models/TechnicianProfile')
const Job = require('./models/Job')
const Payment = require('./models/Payment')
const Review = require('./models/Review')
const Message = require('./models/Message')
const Bid = require('./models/Bid')
const SupportTicket = require('./models/SupportTicket')

async function syncDatabase() {
  try {
    await User.sync({ alter: true })
    await TechnicianProfile.sync({ alter: true })
    await Job.sync({ alter: true })
    await Payment.sync({ alter: true })
    await Review.sync({ alter: true })
    await Message.sync({ alter: true })
    await Bid.sync({ alter: true })
    await SupportTicket.sync({ alter: true })

    console.log('All tables synchronized successfully! 🎉')
    process.exit(0)
  } catch (error) {
    console.error('Error synchronizing tables:', error)
    process.exit(1)
  }
}

syncDatabase()
