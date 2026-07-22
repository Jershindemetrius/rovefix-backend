// Each repair request is one "job"
// A homeowner creates it, a technician accepts it

const { DataTypes } = require('sequelize')
const sequelize = require('../database')

const Job = sequelize.define('Job', {

  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  homeowner_id: {
    type: DataTypes.UUID,
    allowNull: false    // which homeowner posted this job
  },

  technician_id: {
    type: DataTypes.UUID,
    allowNull: true     // empty until a technician accepts
  },

  category: {
    type: DataTypes.ENUM('electrician', 'plumber', 'ac', 'phone_repair', 'carpenter'),
    allowNull: false
  },

  description: {
    type: DataTypes.TEXT,   // TEXT allows longer descriptions than STRING
    allowNull: false
  },

  photo_url: {
    type: DataTypes.TEXT,
    allowNull: true         // Changed to TEXT to support Base64 strings
  },

  completion_photo_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  location: {
    type: DataTypes.STRING,
    allowNull: false        // address or area name
  },

  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true         // GPS coordinates for nearby matching
  },

  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },

  status: {
    type: DataTypes.ENUM('open', 'matched', 'in_progress', 'work_completed', 'done', 'disputed'),
    defaultValue: 'open'   // all jobs start as open
  },

  price: {
    type: DataTypes.DECIMAL(10, 2),  // stores money values like 499.00
    allowNull: true                   // set by technician when they accept
  },

  quoted_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },

  is_price_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  dispute_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  start_pin: {
    type: DataTypes.STRING(4),
    allowNull: true
  },

  is_emergency: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }

}, {
  hooks: {
    beforeValidate: (job) => {
      if (!job.start_pin) {
        // Generate a random 4-digit PIN for site arrival verification
        job.start_pin = Math.floor(1000 + Math.random() * 9000).toString()
      }
    }
  },
  indexes: [
    { fields: ['homeowner_id'] },
    { fields: ['technician_id'] },
    { fields: ['status'] },
    { fields: ['category'] }
  ]
})

module.exports = Job