// This file connects our server to the PostgreSQL database

const { Sequelize } = require('sequelize')  // Sequelize talks to the database for us

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',   // we're using PostgreSQL
  dialectOptions: {
    ssl: {
      require: true,                // Neon.tech requires SSL (secure connection)
      rejectUnauthorized: false     // needed for Neon specifically
    }
  },
  logging: false  // set to true if you want to see database queries in the console
})

// Test if the connection works
sequelize.authenticate()
  .then(() => console.log('Database connected successfully ✅'))
  .catch(err => console.log('Database connection failed:', err))

module.exports = sequelize  // export so other files can use this connection