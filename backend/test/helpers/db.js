/**
 * Test database helper.
 *
 * Integration tests must NEVER touch production data. Every test file gets its
 * own database whose name is derived by appending `__test_<suffix>` to the
 * database in MONGO_URI (or TEST_MONGO_URI). Because this module always
 * constructs the name itself, it is safe to drop that database before each file
 * runs.
 *
 *   MONGO_URI=mongodb+srv://…/            -> datafrom__test_accounts
 *   TEST_MONGO_URI=mongodb://localhost/x  -> x__test_accounts
 *
 * When no URI is configured (or the server is unreachable) the helper returns
 * false and the calling tests are reported as skipped instead of failing.
 */
require('dotenv').config();

const dns = require('node:dns');
const mongoose = require('mongoose');

function buildTestUri(suffix) {
  const base = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
  if (!base) return null;
  try {
    const url = new URL(base);
    const current = url.pathname.replace(/^\//, '') || 'datafrom';
    url.pathname = `/${current}__test_${suffix}`;
    return url.toString();
  } catch {
    return null;
  }
}

function applyDnsServers() {
  const servers = String(process.env.MONGO_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (!servers.length) return;
  try {
    dns.setServers(servers);
  } catch {
    /* ignore — fall back to the system resolver */
  }
}

let connected = false;

async function connectTestDb(suffix) {
  if (connected) return true;
  const uri = buildTestUri(suffix);
  if (!uri) return false;

  applyDnsServers();

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    connected = true;
  } catch (error) {
    console.warn(`[tests] test database unavailable (${error.message}) — DB tests will be skipped.`);
    return false;
  }

  // Isolated database: start from a clean slate.
  await mongoose.connection.dropDatabase();

  // Make sure the unique indexes the tests rely on exist before asserting on them.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init().catch(() => null)));

  return true;
}

async function disconnectTestDb() {
  if (!connected) return;
  connected = false;
  await mongoose.disconnect().catch(() => {});
}

module.exports = { connectTestDb, disconnectTestDb, buildTestUri };
