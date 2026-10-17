const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Stored in E.164 form. Historically this was a bare 10-digit Indian number,
    // so run `npm run migrate:mobile-uniqueness` before enabling the unique index
    // in an existing deployment (it normalizes the stored values first).
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      match: /^\+[1-9]\d{6,14}$/,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin', 'viewer'], default: 'admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
