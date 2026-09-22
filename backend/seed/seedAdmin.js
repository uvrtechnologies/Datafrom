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

(async () => {
  await connectDB();

  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const mobileNumber = String(process.env.SEED_ADMIN_MOBILE || '').trim();

  if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
    throw new Error('SEED_ADMIN_MOBILE must be a valid 10-digit Indian mobile number.');
  }

  const existing = await Admin.findOne({ email });
  if (existing) {
    if (!existing.mobileNumber) {
      existing.mobileNumber = mobileNumber;
      await existing.save();
      console.log(`Added mobile number to existing admin: ${email}`);
    } else {
      console.log(`Admin with email ${email} already exists. Nothing to do.`);
    }
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await Admin.create({ name, email, mobileNumber, passwordHash, role: 'superadmin' });
    console.log(`Created superadmin: ${email}`);
    console.log('IMPORTANT: log in and change this password, then remove SEED_ADMIN_PASSWORD from .env.');
  }

  await mongoose.disconnect();
  process.exit(0);
})();
