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
    allowNull: false    // every technician profile must belong to a user
  },

  category: {
    type: DataTypes.ENUM('electrician', 'plumber', 'ac', 'phone_repair', 'carpenter'),
    allowNull: false    // what type of work this technician does
  },

  id_doc_url: {
    type: DataTypes.STRING,
    allowNull: true     // URL of their Aadhaar / voter card photo
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
  }

})

module.exports = TechnicianProfile