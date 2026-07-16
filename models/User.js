// This file creates the "users" table in your database
// Both homeowners and technicians are stored here

const { DataTypes } = require('sequelize')
const sequelize = require('../database')  // import our database connection

const User = sequelize.define('User', {

  id: {
    type: DataTypes.UUID,           // UUID is a unique random ID like "a1b2-c3d4..."
    defaultValue: DataTypes.UUIDV4, // auto-generate a UUID for each new user
    primaryKey: true                // this is the main identifier for each row
  },

  name: {
    type: DataTypes.STRING,   // stores text
    allowNull: false          // this field is required — can't be empty
  },

  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true              // no two users can have the same phone number
  },

  pin: {
    type: DataTypes.STRING,   // Hashed 6-digit PIN
    allowNull: true           // Null for old users, required for new ones
  },

  email: {
    type: DataTypes.STRING,
    allowNull: true,          // email is optional
    unique: true
  },

  user_type: {
    type: DataTypes.ENUM('homeowner', 'technician'),  // only these two values allowed
    allowNull: false
  },

  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false       // new users start as unverified
  },

  firebase_uid: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true              // links this user to their Firebase account
  },

  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
      type: DataTypes.STRING,
      allowNull: true
  },
  photo_url: {
      type: DataTypes.TEXT,
      allowNull: true
  },
  fcm_token: {
      type: DataTypes.STRING,
      allowNull: true
  },
  referral_code: {
    type: DataTypes.STRING,
    unique: true
  },
  referred_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  // 🛡️ SECURITY: Brute-force protection
  failed_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lockout_until: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['user_type'] }
  ]
})

module.exports = User