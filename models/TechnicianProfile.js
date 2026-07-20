// Extra details only for technicians
// Every technician has one row in "users" AND one row here

const { DataTypes } = require('sequelize')
const sequelize = require('../database')

const TechnicianProfile = sequelize.define('TechnicianProfile', {

  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true       // essential for upsert and data integrity
  },

  category: {
    type: DataTypes.ENUM('electrician', 'plumber', 'ac', 'phone_repair', 'carpenter'),
    allowNull: false    // what type of work this technician does
  },

  id_doc_url: {
    type: DataTypes.TEXT,
    allowNull: true     // Changed to TEXT for Base64 support
  },

  license_doc_url: {
    type: DataTypes.TEXT,
    allowNull: true     // Professional license (electrician license, etc.)
  },

  approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false  // admin must approve before they appear in job feed
  },

  avg_rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0   // starts at 0, updates after each review
  },

  total_jobs: {
    type: DataTypes.INTEGER,
    defaultValue: 0     // counts completed jobs
  },

  portfolio_urls: {
    type: DataTypes.JSON,
    defaultValue: []
  },

  years_experience: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  is_online: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }

}, {
  indexes: [
    { fields: ['user_id'] }
  ]
})

module.exports = TechnicianProfile