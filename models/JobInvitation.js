const { DataTypes } = require('sequelize')
const sequelize = require('../database')

const JobInvitation = sequelize.define('JobInvitation', {
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
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'ignored'),
    defaultValue: 'pending'
  }
}, {
  indexes: [
    { fields: ['job_id'] },
    { fields: ['technician_id'] }
  ]
})

module.exports = JobInvitation
