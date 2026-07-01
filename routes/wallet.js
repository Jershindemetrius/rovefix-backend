const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const WalletTransaction = require('../models/WalletTransaction')
const User = require('../models/User')

// GET /wallet/history
// Get all transactions for the logged-in user
router.get('/history', auth, async (req, res) => {
  try {
    const transactions = await WalletTransaction.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']]
    })

    const user = await User.findByPk(req.user.id, {
      attributes: ['wallet_balance']
    })

    res.json({
      success: true,
      balance: user.wallet_balance,
      transactions
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
