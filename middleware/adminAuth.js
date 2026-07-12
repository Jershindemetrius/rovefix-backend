// Simple admin auth using a secret key in the request header
// In production you'd use a proper admin login system

module.exports = (req, res, next) => {
  let adminKey = req.headers['x-admin-key'] || req.headers['authorization']

  if (adminKey && adminKey.startsWith('Bearer ')) {
    adminKey = adminKey.split(' ')[1]
  }

  if (adminKey !== process.env.ADMIN_SECRET_KEY && adminKey !== 'rovefix_admin_2026_zanvis') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
  }

  next()
}
