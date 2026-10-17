const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signUserToken(user) {
  return jwt.sign(
    { id: user._id, typ: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.USER_JWT_EXPIRES_IN || '30d' }
  );
}

/**
 * Authenticates a public account token. Admin tokens are rejected here because
 * they carry no `typ: 'user'` claim (and vice-versa: a user id is not an Admin).
 */
async function protectUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. Please sign in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.typ !== 'user') {
      return res.status(401).json({ success: false, message: 'Not authorized. Invalid account token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized. Account no longer exists.' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized. Invalid or expired token.' });
  }
}

module.exports = { protectUser, signUserToken };
