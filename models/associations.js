// This file links the models together
// So Sequelize knows a Job "belongs to" a User etc.

const User = require('./User')
const Job = require('./Job')
const TechnicianProfile = require('./TechnicianProfile')
const Review = require('./Review')
const Message = require('./Message')
const Bid = require('./Bid')
const SupportTicket = require('./SupportTicket')
const Report = require('./Report')
const HomeownerReview = require('./HomeownerReview')

// A job belongs to a homeowner (who is a User)
Job.belongsTo(User, { foreignKey: 'homeowner_id', as: 'homeowner' })

// A job belongs to a technician (who is also a User)
Job.belongsTo(User, { foreignKey: 'technician_id', as: 'technician' })

// A homeowner can have many jobs
User.hasMany(Job, { foreignKey: 'homeowner_id', as: 'posted_jobs' })

// A technician profile belongs to a user
TechnicianProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasOne(TechnicianProfile, { foreignKey: 'user_id' })

// A job can have reviews
Job.hasMany(Review, { foreignKey: 'job_id' })
Review.belongsTo(Job, { foreignKey: 'job_id' })

// A job has many chat messages
Job.hasMany(Message, { foreignKey: 'job_id', as: 'messages' })
Message.belongsTo(Job, { foreignKey: 'job_id' })

// A message belongs to a sender (User)
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' })

// Bidding System
Job.hasMany(Bid, { foreignKey: 'job_id', as: 'bids' })
Bid.belongsTo(Job, { foreignKey: 'job_id' })
Bid.belongsTo(User, { foreignKey: 'technician_id', as: 'technician' })
User.hasMany(Bid, { foreignKey: 'technician_id', as: 'my_bids' })

// Support System
User.hasMany(SupportTicket, { foreignKey: 'user_id', as: 'support_tickets' })
SupportTicket.belongsTo(User, { foreignKey: 'user_id' })

// Reporting System
User.hasMany(Report, { foreignKey: 'reporter_id', as: 'submitted_reports' })
User.hasMany(Report, { foreignKey: 'reported_id', as: 'received_reports' })
Report.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' })
Report.belongsTo(User, { foreignKey: 'reported_id', as: 'reported' })

// Reciprocal Trust (Technicians review Homeowners)
User.hasMany(HomeownerReview, { foreignKey: 'homeowner_id', as: 'received_homeowner_reviews' })
HomeownerReview.belongsTo(User, { foreignKey: 'homeowner_id', as: 'homeowner' })
HomeownerReview.belongsTo(User, { foreignKey: 'technician_id', as: 'reviewer' })
Job.hasOne(HomeownerReview, { foreignKey: 'job_id' })

module.exports = { User, Job, TechnicianProfile, Review, Message, Bid, SupportTicket, Report, HomeownerReview }
