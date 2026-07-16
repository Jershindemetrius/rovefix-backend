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
  body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone number must be exactly 10 digits'),
  body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters long'),
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

module.exports = {
  validate,
  registerRules,
  profileUpdateRules,
  postJobRules
}
