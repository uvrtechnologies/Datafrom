function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  // Mongo duplicate key error (e.g. familyKey / submissionId / email unique clashes)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}. This record already exists.`,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(' ') });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : (err.message || 'Internal server error'),
  });
}

module.exports = { notFound, errorHandler };
