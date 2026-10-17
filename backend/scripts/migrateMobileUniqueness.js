#!/usr/bin/env node
/**
 * Mobile-number uniqueness migration.
 *
 *   node scripts/migrateMobileUniqueness.js            # report only (dry run)
 *   node scripts/migrateMobileUniqueness.js --apply    # normalize + create index
 *
 * Safety rules:
 *   - Never deletes, merges or overwrites a record.
 *   - Refuses to create the unique index while duplicate normalized numbers exist.
 *   - `--normalize-only` rewrites stored values to E.164 but skips the index.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { isDBConnected } = require('../config/db');
const { auditMobileUniqueness, normalizeModelValues, ensureUniqueIndexes } = require('../services/mobileUniqueness');
const User = require('../models/User');
const Admin = require('../models/Admin');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const NORMALIZE_ONLY = argv.includes('--normalize-only');

function printDuplicates(label, scan) {
  console.log(`\n── ${label} (${scan.collection}) ─────────────────────────────`);
  console.log(`   scanned            : ${scan.scanned}`);
  console.log(`   unparseable values : ${scan.unnormalizable}`);
  console.log(`   values needing E.164 normalisation : ${scan.needsNormalization.length}`);
  if (!scan.duplicates.length) {
    console.log('   duplicate groups   : 0');
    return;
  }
  console.log(`   duplicate groups   : ${scan.duplicates.length}`);
  scan.duplicates.forEach((group, index) => {
    console.log(`\n   [${index + 1}] ${group.normalized}  (${group.count} records)`);
    group.records.forEach((record) => {
      console.log(`       - id=${record.id}  stored="${record.storedValue}"`);
    });
  });
}

(async () => {
  await connectDB();
  if (!isDBConnected()) {
    console.error('\n✗ Could not connect to MongoDB. Check MONGO_URI in backend/.env.');
    process.exitCode = 1;
    return;
  }

  const audit = await auditMobileUniqueness();
  console.log(`\nMobile uniqueness audit — ${audit.generatedAt}`);
  printDuplicates('Registered accounts', audit.users);
  printDuplicates('Administrators', audit.admins);

  if (!APPLY) {
    console.log('\nMode: DRY RUN (nothing changed).');
    console.log('Re-run with --apply once the report above is clean.');
    if (!audit.safeToCreateUniqueIndex) {
      console.log('\n⚠ Duplicate numbers found. Resolve them manually (see README "Duplicate mobile resolution")');
      console.log('  before creating the unique index. This script never merges or deletes records.');
      process.exitCode = 2;
    }
    return;
  }

  console.log('\nMode: APPLY');

  const userNormalization = await normalizeModelValues(User, { dryRun: false });
  console.log(`   accounts normalised : ${userNormalization.updated}` + (userNormalization.blockedByDuplicates ? ' (blocked by duplicates)' : ''));

  const adminNormalization = await normalizeModelValues(Admin, { dryRun: false });
  console.log(`   admins normalised   : ${adminNormalization.updated}` + (adminNormalization.blockedByDuplicates ? ' (blocked by duplicates)' : ''));

  if (NORMALIZE_ONLY) {
    console.log('\n--normalize-only supplied: skipping unique index creation.');
    return;
  }

  const result = await ensureUniqueIndexes({ dryRun: false });
  result.created.forEach((entry) => console.log(`   ✓ created index ${entry.index} on ${entry.collection}`));
  result.skipped.forEach((entry) => {
    if (entry.reason === 'already exists') {
      console.log(`   • index ${entry.index} on ${entry.collection} already exists`);
    }
  });

  if (!result.audit.safeToCreateUniqueIndex) {
    console.log('\n✗ Unique index NOT created: duplicate normalized numbers still exist.');
    console.log('  Resolve them with the documented process, then re-run this script.');
    process.exitCode = 2;
    return;
  }

  console.log('\n✓ Mobile uniqueness migration complete.');
})().catch((error) => {
  console.error('\n✗ Migration failed:', error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect().catch(() => {});
});
