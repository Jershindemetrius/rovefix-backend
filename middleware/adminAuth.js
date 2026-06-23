// Simple admin auth using a secret key in the request header
// In production you'd use a proper admin login system

module.exports = (req, res, next) => {
  const adminKey = req.headers['x-admin-key']

  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
  }

  next()
}
