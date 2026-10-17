/**
 * Mobile-number uniqueness tests.
 *
 * Runs against an isolated test database (skipped automatically when MongoDB is
 * unreachable) and exercises the real controller functions, the MongoDB unique
 * index and the migration/audit helpers.
 */
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { test, before, after, beforeEach } = require('node:test');

const { connectTestDb, disconnectTestDb } = require('./helpers/db');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { register, updateMe, DUPLICATE_MOBILE_MESSAGE } = require('../controllers/userController');
const { scanModelDuplicates, normalizeModelValues, auditMobileUniqueness, ensureUniqueIndexes } = require('../services/mobileUniqueness');
const { normalizeMobile } = require('../utils/phone');

let dbReady = false;

// A collection WITHOUT a unique index, used to prove the audit can see
// duplicates that a unique index would otherwise hide.
const probeSchema = new mongoose.Schema(
  { mobileNumber: String, name: String, email: String },
  { collection: 'mobile_dup_probe', versionKey: false }
);
const DupProbe = mongoose.models.MobileDupProbe || mongoose.model('MobileDupProbe', probeSchema);

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

async function callController(handler, req) {
  const res = mockRes();
  let nextError = null;
  await handler(req, res, (error) => { nextError = error; });
  if (nextError) throw nextError;
  return res;
}

function registerPayload(overrides = {}) {
  return {
    name: 'Test User',
    password: 'ChangeMe123!',
    mobileNumber: '9876543210',
    ...overrides,
  };
}

before(async () => {
  dbReady = await connectTestDb('mobile');
});

after(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  if (!dbReady) return;
  await Promise.all([
    User.deleteMany({}),
    Admin.deleteMany({}),
    DupProbe.deleteMany({}),
  ]);
});

test('registers a new number and stores it in E.164 form', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  const res = await callController(register, { body: registerPayload({ mobileNumber: '98765 43210' }) });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.token);

  const stored = await User.findOne({ mobileNumber: '+919876543210' });
  assert.ok(stored);
  assert.equal(stored.mobileNumber, '+919876543210');
});

test('rejects a second account using an equivalent number format with HTTP 409', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  const first = await callController(register, { body: registerPayload({ mobileNumber: '9876543210' }) });
  assert.equal(first.statusCode, 201);

  const variants = ['09876543210', '+91 98765 43210', '0091 9876543210', '98765-43210'];
  for (const variant of variants) {
    const res = await callController(register, {
      body: registerPayload({ mobileNumber: variant, name: 'Second User' }),
    });
    assert.equal(res.statusCode, 409, `"${variant}" should be rejected as a duplicate`);
    assert.equal(res.body.message, DUPLICATE_MOBILE_MESSAGE);
    assert.equal(res.body.code, 'MOBILE_TAKEN');
  }
  assert.equal(await User.countDocuments(), 1);
});

test('handles concurrent registrations with the same number safely', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  const [a, b] = await Promise.all([
    callController(register, { body: registerPayload({ mobileNumber: '9876543210', name: 'Racer One' }) }),
    callController(register, { body: registerPayload({ mobileNumber: '+919876543210', name: 'Racer Two' }) }),
  ]);

  const codes = [a.statusCode, b.statusCode].sort((x, y) => x - y);
  assert.deepEqual(codes, [201, 409]);
  assert.equal(await User.countDocuments(), 1);
});

test('lets a user keep their own number while updating their profile', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  await callController(register, { body: registerPayload() });
  const user = await User.findOne({ mobileNumber: '+919876543210' });

  const res = await callController(updateMe, {
    user,
    body: { name: 'Renamed User', mobileNumber: '98765 43210' },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.user.name, 'Renamed User');
  assert.equal(res.body.data.user.mobileNumber, '+919876543210');
});

test('refuses to change to a number owned by another account', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  await callController(register, { body: registerPayload({ mobileNumber: '9876543210' }) });
  await callController(register, { body: registerPayload({ mobileNumber: '9876543211', name: 'Other User' }) });

  const user = await User.findOne({ mobileNumber: '+919876543210' });
  const res = await callController(updateMe, { user, body: { mobileNumber: '+91 98765 43211' } });

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, DUPLICATE_MOBILE_MESSAGE);

  const unchanged = await User.findById(user._id);
  assert.equal(unchanged.mobileNumber, '+919876543210');
});

test('the MongoDB unique index blocks duplicate writes at the database level', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  await User.create({ name: 'Index One', mobileNumber: '+919876543210', passwordHash: 'hash' });
  await assert.rejects(
    User.create({ name: 'Index Two', mobileNumber: '+919876543210', passwordHash: 'hash' }),
    (error) => error.code === 11000
  );
  assert.equal(await User.countDocuments(), 1);
});

test('the unique indexes exist on both users and admins', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  const userIndexes = await User.collection.indexes();
  const adminIndexes = await Admin.collection.indexes();
  const isUniqueMobile = (index) => index.unique && index.key.mobileNumber === 1;

  assert.ok(userIndexes.some(isUniqueMobile), 'users.mobileNumber must be uniquely indexed');
  assert.ok(adminIndexes.some(isUniqueMobile), 'admins.mobileNumber must be uniquely indexed');
});

test('the audit finds duplicates and normalisation refuses to run while they exist', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  await DupProbe.create({ mobileNumber: '+919876543210', name: 'A' });
  await DupProbe.create({ mobileNumber: '09876543210', name: 'B' });

  const scan = await scanModelDuplicates(DupProbe);
  assert.equal(scan.scanned, 2);
  assert.equal(scan.duplicates.length, 1);
  assert.equal(scan.duplicates[0].normalized, '+919876543210');
  assert.equal(scan.duplicates[0].count, 2);

  const normalised = await normalizeModelValues(DupProbe, { dryRun: false });
  assert.equal(normalised.blockedByDuplicates, true);
  assert.equal(normalised.applied, false);
});

test('normalisation rewrites stored values to E.164 and then the audit is clean', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  await DupProbe.create({ mobileNumber: '9876543210', name: 'A' });
  await DupProbe.create({ mobileNumber: '9876543211', name: 'B' });

  const before = await scanModelDuplicates(DupProbe);
  assert.equal(before.needsNormalization.length, 2);

  const result = await normalizeModelValues(DupProbe, { dryRun: false });
  assert.equal(result.blockedByDuplicates, false);
  assert.equal(result.updated, 2);

  const after = await scanModelDuplicates(DupProbe);
  assert.equal(after.needsNormalization.length, 0);
  assert.equal(after.duplicates.length, 0);
});

test('ensureUniqueIndexes reports the existing indexes and never drops data', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  await User.create({ name: 'Keep Me', mobileNumber: '+919876543210', passwordHash: 'hash' });

  const result = await ensureUniqueIndexes({ dryRun: false });
  assert.equal(result.audit.safeToCreateUniqueIndex, true);
  // Indexes already exist (created by mongoose on init) so nothing is recreated.
  assert.ok(result.skipped.some((entry) => entry.index === 'mobileNumber_1'));
  assert.equal(await User.countDocuments(), 1);
});

test('auditMobileUniqueness returns a safe, secret-free report', async (t) => {
  if (!dbReady) return t.skip('MongoDB test database unavailable');

  await User.create({ name: 'Solo', mobileNumber: '+919876543210', passwordHash: 'hash' });
  const audit = await auditMobileUniqueness();

  assert.equal(audit.users.scanned, 1);
  assert.equal(audit.users.duplicates.length, 0);
  assert.equal(audit.safeToCreateUniqueIndex, true);
  assert.ok(audit.generatedAt);
});

test('normalizeMobile keeps international numbers distinct from Indian ones', () => {
  assert.equal(normalizeMobile('+14155552671').e164, '+14155552671');
  assert.equal(normalizeMobile('4155552671').e164, '+914155552671');
  assert.notEqual(normalizeMobile('+14155552671').e164, normalizeMobile('4155552671').e164);
});
