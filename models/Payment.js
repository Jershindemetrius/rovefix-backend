// One payment record per job
// Money is held in escrow until job is marked done

const { DataTypes } = require('sequelize')
const sequelize = require('../database')

const Payment = sequelize.define('Payment', {

  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  job_id: {
    type: DataTypes.UUID,
    allowNull: false
  },

  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },

  razorpay_order_id: {
    type: DataTypes.STRING,
    allowNull: true     // Razorpay gives us this ID when payment starts
  },

  razorpay_payment_id: {
    type: DataTypes.STRING,
    allowNull: true     // Razorpay gives us this when payment succeeds
  },

  status: {
    type: DataTypes.ENUM('pending', 'held', 'released', 'refunded'),
    defaultValue: 'pending'
  }

})

module.exports = Payment