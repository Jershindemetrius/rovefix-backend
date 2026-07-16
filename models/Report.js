const { DataTypes } = require('sequelize')
const sequelize = require('../database')

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  reporter_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reported_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'resolved', 'ignored'),
    defaultValue: 'pending'
  }
})

module.exports = Report
