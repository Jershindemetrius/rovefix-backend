const generateReferralCode = (name) => {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'RV')
  const random = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${random}`
}

module.exports = { generateReferralCode }
