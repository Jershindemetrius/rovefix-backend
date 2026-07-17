const { body, validationResult } = require('express-validator')

/**
 * Middleware to check for validation errors and return 400 if they exist.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next()
  }

  // Format errors for the mobile app to easily display
  const extractedErrors = []
  errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }))

  return res.status(400).json({
    success: false,
    message: 'Validation Failed',
    errors: extractedErrors
  })
}

// Validation rules for Registration
const registerRules = [
  body('phone').isLength({ min: 10, max: 15 }).withMessage('Invalid phone number format'),
  body('pin').isLength({ min: 6, max: 6 }).withMessage('PIN must be exactly 6 digits'),
  body('user_type').isIn(['homeowner', 'technician']).withMessage('Invalid user type')
]

// Validation rules for Profile Update
const profileUpdateRules = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('city').optional().notEmpty().withMessage('City cannot be empty')
]

// Validation rules for Job Posting
const postJobRules = [
  body('category').notEmpty().withMessage('Category is required'),
  body('description').isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  body('location').notEmpty().withMessage('Location is required')
]

// Validation rules for Bidding
const placeBidRules = [
  body('price').isFloat({ min: 1 }).withMessage('Price must be at least 1'),
  body('estimated_time').notEmpty().withMessage('Estimated time is required'),
  body('message').optional().isLength({ max: 500 }).withMessage('Message is too long')
]

module.exports = {
  validate,
  registerRules,
  profileUpdateRules,
  postJobRules,
  placeBidRules
}
