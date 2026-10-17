/**
 * Run once to create the first admin account:
 *   npm run seed:admin
 * Uses SEED_ADMIN_* values from .env
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const mongoose = require('mongoose');
const { normalizeMobile } = require('../utils/phone');

(async () => {
  await connectDB();

  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const rawMobile = process.env.SEED_ADMIN_MOBILE || '';

  const mobile = normalizeMobile(rawMobile);
  if (!mobile.valid) {
    throw new Error('SEED_ADMIN_MOBILE must be a valid mobile number (10-digit Indian numbers are accepted).');
  }

  const existing = await Admin.findOne({ email });
  if (existing) {
    if (!existing.mobileNumber) {
      existing.mobileNumber = mobile.e164;
      await existing.save();
      console.log(`Added mobile number to existing admin: ${email}`);
    } else {
      console.log(`Admin with email ${email} already exists. Nothing to do.`);
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await Admin.create({ name, email, mobileNumber: mobile.e164, passwordHash, role: 'superadmin' });
    console.log(`Created superadmin: ${email}`);
    console.log('IMPORTANT: log in and change this password, then remove SEED_ADMIN_PASSWORD from .env.');
  }

  await mongoose.disconnect();
  process.exit(0);
})();
