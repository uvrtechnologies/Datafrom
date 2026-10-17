const mongoose = require('mongoose');

/**
 * Public registered account for the Datafrom collection site.
 *
 * `mobileNumber` is the account identity and is stored in E.164 form so a
 * unique index can enforce "one account per mobile number" regardless of how
 * the user typed the number.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      match: /^\+[1-9]\d{6,14}$/,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user'], default: 'user' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Sparse-unique on email: many accounts may have no email, but a real email
// can only belong to one account.
userSchema.index({ email: 1 }, { unique: true, sparse: true });

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    mobileNumber: this.mobileNumber,
    email: this.email || '',
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
