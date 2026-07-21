const { DataTypes } = require('sequelize')
const sequelize = require('../database')

const HomeownerReview = sequelize.define('HomeownerReview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  technician_id: {
    type: DataTypes.UUID,
    allowNull: false // the technician leaving the review
  },
  homeowner_id: {
    type: DataTypes.UUID,
    allowNull: false // the homeowner being reviewed
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['job_id'] },
    { fields: ['homeowner_id'] }
  ]
})

module.exports = HomeownerReview
