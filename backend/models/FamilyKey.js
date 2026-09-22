const mongoose = require('mongoose');

/**
 * FamilyKey is the source of truth for the "one key = one submission" rule.
 * The unique index on familyKey plus the atomic findOneAndUpdate used in
 * familyController.submitFamily() is what actually prevents race conditions
 * when two people submit the same key at the same time.
 */
const familyKeySchema = new mongoose.Schema(
  {
    familyKey: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    status: { type: String, enum: ['UNUSED', 'RESERVED', 'USED'], default: 'UNUSED' },
    usedBy: { type: String, default: null }, // main member name, filled on submission
    familyRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FamilyKey', familyKeySchema);
