// Homeowner rates the technician after job is done

const { DataTypes } = require('sequelize')
const sequelize = require('../database')

const Review = sequelize.define('Review', {

  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  job_id: {
    type: DataTypes.UUID,
    allowNull: false
  },

  reviewer_id: {
    type: DataTypes.UUID,
    allowNull: false    // the homeowner who is leaving the review
  },

  technician_id: {
    type: DataTypes.UUID,
    allowNull: false    // the technician being reviewed
  },

  rating: {
    type: DataTypes.INTEGER,
    allowNull: false    // 1 to 5 stars
  },

  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  work_photo_url: {
    type: DataTypes.TEXT,
    allowNull: true     // Changed to TEXT for Base64 support
  }

}, {
  indexes: [
    { fields: ['job_id'] },
    { fields: ['technician_id'] }
  ]
})

module.exports = Review