const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const Razorpay = require('razorpay')
const Payment = require('../models/Payment')
const Job = require('../models/Job')
const crypto = require('crypto')

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

// POST /payments/create-order
// Creates a Razorpay order for a job
router.post('/create-order', auth, async (req, res) => {
  try {
    const { job_id } = req.body

    // Get the job to find the price
    const job = await Job.findByPk(job_id)
    if (!job) {
      return res.status(404).json({
        success: false, message: 'Job not found' })
    }

    if (!job.price) {
      return res.status(400).json({
        success: false, message: 'Job has no price set' })
    }

    // Create Razorpay order
    // Amount must be in paise (1 rupee = 100 paise)
    const amount = Math.round(parseFloat(job.price) * 100)

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `job_${job_id}`,
      notes: {
        job_id,
        homeowner_id: req.user.id
      }
    })

    // Save payment record
    await Payment.create({
      job_id,
      amount: job.price,
      razorpay_order_id: order.id,
      status: 'pending'
    })

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    })

  } catch (error) {
    console.log('Create order error:', error)
    res.status(500).json({
      success: false, message: 'Failed to create order' })
  }
})

// POST /payments/verify
// Verifies payment signature after Razorpay checkout completes
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      job_id
    } = req.body

    // Verify signature to confirm payment is genuine
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false, message: 'Invalid payment signature' })
    }

    // Update payment record
    await Payment.update(
      {
        razorpay_payment_id,
        status: 'released'
      },
      { where: { razorpay_order_id } }
    )

    // Mark job as done
    await Job.update(
      { status: 'done' },
      { where: { id: job_id } }
    )

    res.json({ success: true, message: 'Payment verified successfully' })

  } catch (error) {
    console.log('Verify payment error:', error)
    res.status(500).json({
      success: false, message: 'Payment verification failed' })
  }
})

// GET /payments/job/:job_id
// Get payment status for a job
router.get('/job/:job_id', auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: { job_id: req.params.job_id }
    })

    res.json({ success: true, payment })
  } catch (error) {
    res.status(500).json({
      success: false, message: 'Failed to get payment' })
  }
})

module.exports = router