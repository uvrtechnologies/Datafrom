const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { normalizeMobile } = require('../utils/phone');
const { signUserToken } = require('../middleware/userAuth');

/** Exact copy required by the product spec — keep frontend and backend identical. */
const DUPLICATE_MOBILE_MESSAGE = 'This mobile number is already registered. Please use a different mobile number.';
const BCRYPT_ROUNDS = 12;

function profilePayload(user) {
  return {
    id: user._id,
    name: user.name,
    mobileNumber: user.mobileNumber,
    email: user.email || '',
    createdAt: user.createdAt,
  };
}

function validateName(name) {
  const value = String(name || '').trim();
  if (value.length < 2) return 'Name must be at least 2 characters.';
  if (value.length > 80) return 'Name must be at most 80 characters.';
  return null;
}

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 128) return 'Password must be at most 128 characters.';
  return null;
}

function validateEmail(email) {
  const value = String(email || '').trim();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address.';
  return null;
}

// POST /api/users/register
async function register(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');
    const rawMobile = req.body.mobileNumber || req.body.mobile || req.body.phone;
    const email = String(req.body.email || '').trim().toLowerCase();

    const nameError = validateName(name);
    if (nameError) return res.status(400).json({ success: false, message: nameError });

    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    const emailError = validateEmail(email);
    if (emailError) return res.status(400).json({ success: false, message: emailError });

    const phone = normalizeMobile(rawMobile);
    if (!phone.valid) {
      return res.status(400).json({ success: false, message: 'Please enter a valid mobile number.' });
    }

    const existing = await User.findOne({ mobileNumber: phone.e164 }).select('_id').lean();
    if (existing) {
      return res.status(409).json({ success: false, message: DUPLICATE_MOBILE_MESSAGE, code: 'MOBILE_TAKEN' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let user;
    try {
      user = await User.create({
        name,
        mobileNumber: phone.e164,
        email: email || undefined,
        passwordHash,
      });
    } catch (error) {
      // Concurrent registrations with the same number: the unique index wins here.
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        const message = field === 'email'
          ? 'An account with this email already exists.'
          : DUPLICATE_MOBILE_MESSAGE;
        return res.status(409).json({ success: false, message, code: field === 'email' ? 'EMAIL_TAKEN' : 'MOBILE_TAKEN' });
      }
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        token: signUserToken(user),
        user: profilePayload(user),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/users/login
async function login(req, res, next) {
  try {
    const rawMobile = req.body.mobileNumber || req.body.mobile || req.body.phone;
    const password = String(req.body.password || '');

    const phone = normalizeMobile(rawMobile);
    if (!phone.valid || !password) {
      return res.status(400).json({ success: false, message: 'A valid mobile number and password are required.' });
    }

    const user = await User.findOne({ mobileNumber: phone.e164 }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid mobile number or password.' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ success: false, message: 'Invalid mobile number or password.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return res.json({
      success: true,
      data: {
        token: signUserToken(user),
        user: profilePayload(user),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/users/me
async function me(req, res, next) {
  try {
    return res.json({
      success: true,
      data: { user: profilePayload(req.user) },
    });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/users/me
async function updateMe(req, res, next) {
  try {
    const updates = {};
    let nextMobile = req.user.mobileNumber;

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      const nameError = validateName(name);
      if (nameError) return res.status(400).json({ success: false, message: nameError });
      updates.name = name;
    }

    if (req.body.email !== undefined) {
      const email = String(req.body.email || '').trim().toLowerCase();
      const emailError = validateEmail(email);
      if (emailError) return res.status(400).json({ success: false, message: emailError });
      updates.email = email || undefined;
    }

    if (req.body.mobileNumber !== undefined) {
      const phone = normalizeMobile(req.body.mobileNumber);
      if (!phone.valid) {
        return res.status(400).json({ success: false, message: 'Please enter a valid mobile number.' });
      }
      if (phone.e164 !== req.user.mobileNumber) {
        const owner = await User.findOne({ mobileNumber: phone.e164 }).select('_id').lean();
        // Keeping your own number is always allowed; only another account's number is rejected.
        if (owner && String(owner._id) !== String(req.user._id)) {
          return res.status(409).json({ success: false, message: DUPLICATE_MOBILE_MESSAGE, code: 'MOBILE_TAKEN' });
        }
        updates.mobileNumber = phone.e164;
        nextMobile = phone.e164;
      }
    }

    if (!Object.keys(updates).length) {
      return res.json({ success: true, data: { user: profilePayload(req.user) } });
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })
      .select('+passwordHash');
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: profilePayload(updated) },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(409).json({
        success: false,
        message: field === 'email' ? 'An account with this email already exists.' : DUPLICATE_MOBILE_MESSAGE,
        code: field === 'email' ? 'EMAIL_TAKEN' : 'MOBILE_TAKEN',
      });
    }
    return next(error);
  }
}

module.exports = {
  DUPLICATE_MOBILE_MESSAGE,
  register,
  login,
  me,
  updateMe,
};
