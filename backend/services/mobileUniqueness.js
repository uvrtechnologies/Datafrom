const User = require('../models/User');
const Admin = require('../models/Admin');
const { normalizeMobile } = require('../utils/phone');

/**
 * Mobile-number uniqueness auditing.
 *
 * Nothing here deletes, merges or overwrites records. It only reports what it
 * finds so a human can resolve conflicts through the documented process.
 */

async function scanModelDuplicates(model, { field = 'mobileNumber', batchSize = 1000 } = {}) {
  const seen = new Map();
  const groups = new Map();
  let scanned = 0;
  let unnormalizable = 0;

  const cursor = model.find().select(`_id ${field} name email`).batchSize(batchSize).lean().cursor();

  for await (const doc of cursor) {
    scanned += 1;
    const raw = doc[field];
    const normalized = normalizeMobile(raw);
    if (!normalized.valid) {
      unnormalizable += 1;
      continue;
    }
    const key = normalized.e164;
    const entry = { id: String(doc._id), storedValue: raw == null ? '' : String(raw) };
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
    seen.set(key, (seen.get(key) || 0) + 1);
  }

  const duplicates = [...groups.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([normalized, entries]) => ({ normalized, count: entries.length, records: entries }));

  const needsNormalization = [];
  for (const [, entries] of groups.entries()) {
    entries.forEach((entry) => {
      const normalized = normalizeMobile(entry.storedValue);
      if (normalized.valid && normalized.e164 !== entry.storedValue) {
        needsNormalization.push(entry.id);
      }
    });
  }

  return { collection: model.collection.name, scanned, unnormalizable, duplicates, needsNormalization };
}

/**
 * Normalizes every stored mobile value to E.164.
 * Refuses to run when two accounts would collide, and never deletes anything.
 */
async function normalizeModelValues(model, { field = 'mobileNumber', dryRun = true } = {}) {
  const scan = await scanModelDuplicates(model, { field });
  if (scan.duplicates.length) {
    return { ...scan, applied: false, blockedByDuplicates: true };
  }

  const conflicts = [];
  let updated = 0;

  const cursor = model.find().select(`_id ${field}`).lean().cursor();
  for await (const doc of cursor) {
    const normalized = normalizeMobile(doc[field]);
    if (!normalized.valid) {
      conflicts.push({ id: String(doc._id), storedValue: String(doc[field]), reason: 'unparseable' });
      continue;
    }
    if (normalized.e164 === doc[field]) continue;
    if (dryRun) {
      updated += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await model.updateOne({ _id: doc._id }, { $set: { [field]: normalized.e164 } });
    updated += 1;
  }

  return { ...scan, applied: !dryRun, blockedByDuplicates: false, updated, conflicts: [...conflicts, ...scan.duplicates] };
}

/** Full audit used by the migration scripts and the admin report. */
async function auditMobileUniqueness() {
  const [users, admins] = await Promise.all([
    scanModelDuplicates(User),
    scanModelDuplicates(Admin),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    users,
    admins,
    safeToCreateUniqueIndex: users.duplicates.length === 0 && admins.duplicates.length === 0,
  };
}

/** Creates the unique indexes only when the data is already conflict-free. */
async function ensureUniqueIndexes({ dryRun = true } = {}) {
  const audit = await auditMobileUniqueness();
  const result = {
    audit,
    created: [],
    skipped: [],
  };

  if (!audit.safeToCreateUniqueIndex) {
    result.skipped.push({
      reason: 'Duplicate normalized mobile numbers exist. Resolve them before creating the unique index.',
      users: audit.users.duplicates,
      admins: audit.admins.duplicates,
    });
    return result;
  }

  const targets = [
    { model: User, name: 'mobileNumber_1' },
    { model: Admin, name: 'mobileNumber_1' },
  ];

  for (const { model, name } of targets) {
    const exists = await model.collection.indexExists(name).catch(() => false);
    if (exists) {
      result.skipped.push({ collection: model.collection.name, index: name, reason: 'already exists' });
      continue;
    }
    if (dryRun) {
      result.skipped.push({ collection: model.collection.name, index: name, reason: 'dry-run' });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await model.collection.createIndex({ mobileNumber: 1 }, { unique: true, name });
    result.created.push({ collection: model.collection.name, index: name });
  }

  return result;
}

module.exports = {
  scanModelDuplicates,
  normalizeModelValues,
  auditMobileUniqueness,
  ensureUniqueIndexes,
};
