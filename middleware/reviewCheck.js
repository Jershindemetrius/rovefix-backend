const { Job, Review } = require('../models/associations')

/**
 * Middleware to ensure homeowners have reviewed their completed jobs
 * before they can post new ones or approve new bids.
 */
module.exports = async (req, res, next) => {
  try {
    // Only applies to homeowners
    if (req.user.user_type !== 'homeowner') {
      return next()
    }

    // Find any completed job by this user that hasn't been reviewed
    const unreviewedJob = await Job.findOne({
      where: {
        homeowner_id: req.user.id,
        status: 'done'
      },
      include: [{
        model: Review,
        required: false // Left join
      }],
      // Filter where no review exists for the job
      // Note: Since Job.hasMany(Review), we check if the reviews array is empty
    })

    // In Sequelize, if we want to find items that DON'T have a relation,
    // we can use a literal or check the count.

    // More robust approach:
    const completedJobs = await Job.findAll({
      where: { homeowner_id: req.user.id, status: 'done' },
      attributes: ['id']
    })

    if (completedJobs.length > 0) {
      const jobIds = completedJobs.map(j => j.id)
      const reviews = await Review.findAll({
        where: { job_id: jobIds, reviewer_id: req.user.id }
      })

      const reviewedJobIds = reviews.map(r => r.job_id)
      const pendingReview = jobIds.find(id => !reviewedJobIds.includes(id))

      if (pendingReview) {
        return res.status(403).json({
          success: false,
          code: 'REVIEW_REQUIRED',
          message: 'Please review your previous completed job before continuing.',
          job_id: pendingReview
        })
      }
    }

    next()
  } catch (error) {
    console.error('[ReviewCheck Error]:', error.message)
    next() // Don't block the user if the check itself fails
  }
}
