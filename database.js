// This file connects our server to the PostgreSQL database

const { Sequelize } = require('sequelize')  // Sequelize talks to the database for us

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',   // we're using PostgreSQL
  dialectOptions: {
    ssl: {
      require: true,                // Neon.tech requires SSL (secure connection)
      rejectUnauthorized: false     // needed for Neon specifically
    },
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 10000
  },
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000
  },
  logging: false  // set to true if you want to see database queries in the console
})

// Test if the connection works
sequelize.authenticate()
  .then(() => console.log('Database connected successfully ✅'))
  .catch(err => console.log('Database connection failed:', err))

module.exports = sequelize  // export so other files can use this connection