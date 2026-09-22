const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobileNumber: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin', 'viewer'], default: 'admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
