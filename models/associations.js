// This file links the models together
// So Sequelize knows a Job "belongs to" a User etc.

const User = require('./User')
const Job = require('./Job')
const TechnicianProfile = require('./TechnicianProfile')
const Payment = require('./Payment')
const Review = require('./Review')

// A job belongs to a homeowner (who is a User)
Job.belongsTo(User, { foreignKey: 'homeowner_id', as: 'homeowner' })

// A job belongs to a technician (who is also a User)
Job.belongsTo(User, { foreignKey: 'technician_id', as: 'technician' })

// A homeowner can have many jobs
User.hasMany(Job, { foreignKey: 'homeowner_id', as: 'posted_jobs' })

// A technician profile belongs to a user
TechnicianProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
User.hasOne(TechnicianProfile, { foreignKey: 'user_id' })

// A job has one payment
Job.hasOne(Payment, { foreignKey: 'job_id' })
Payment.belongsTo(Job, { foreignKey: 'job_id' })

// A job can have reviews
Job.hasMany(Review, { foreignKey: 'job_id' })
Review.belongsTo(Job, { foreignKey: 'job_id' })