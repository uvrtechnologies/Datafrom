/**
 * Daily Google Drive backup tests.
 *
 * The workbook tests are pure (no database, no Drive). The run/schedule tests
 * use an isolated test database and a fake Drive client, so no credentials and
 * no real Google API call are ever involved. DB tests are skipped automatically
 * when MongoDB is unreachable.
 */
const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const ExcelJS = require('exceljs');

const { connectTestDb, disconnectTestDb } = require('./helpers/db');
const BackupRun = require('../models/BackupRun');
const { buildFamilyWorkbookBuffer } = require('../services/familyWorkbook');
const { MAIN_COLUMNS } = require('../services/familySheet');
const { runBackup } = require('../services/backupService');
const { isRunDue, zonedDateParts } = require('../services/backupScheduler');

let dbReady = false;

before(async () => {
  dbReady = await connectTestDb('backup');
});

after(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  if (dbReady) await BackupRun.deleteMany({});
});

const SAMPLE_RECORDS = [
  {
    mainMember: {
      fullName: 'Umesh Singh',
      dateOfBirth: '1990-05-01',
      gender: 'Male',
      mobileNumber: '9876543210',
    },
    businessWork: { occupationType: 'Business Owner', businessName: 'Singh Traders', businessType: 'Retail' },
    address: { current: { addressLine1: '12 Main Rd', village: 'Morod', city: 'Indore' }, permanent: {} },
    additionalInfo: {},
    familyMembers: [
      { fullName: 'Raj Singh', relation: 'Father', mobileNumber: '9000000001' },
      { fullName: 'Sita Singh', relation: 'Mother', educationDetails: { instituteName: 'Govt School' } },
    ],
  },
];

async function readWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

async function readStreamLength(stream) {
  let total = 0;
  for await (const chunk of stream) total += chunk.length;
  return total;
}

/** A Drive API double: stores files in memory and can simulate upload failures. */
function createFakeDrive({ initialFiles = [], failUploads = 0 } = {}) {
  const store = initialFiles.map((file) => ({ ...file }));
  let remainingFailures = failUploads;
  const calls = { list: 0, create: 0, update: 0 };

  function maybeFail() {
    if (remainingFailures > 0) {
      remainingFailures -= 1;
      throw new Error('simulated Drive failure');
    }
  }

  return {
    store,
    calls,
    files: {
      async list() {
        calls.list += 1;
        return { data: { files: store.map((file) => ({ ...file })) } };
      },
      async create({ requestBody, media }) {
        calls.create += 1;
        maybeFail();
        const size = await readStreamLength(media.body);
        const file = { id: `drive-file-${store.length + 1}`, name: requestBody.name, size: String(size) };
        store.push(file);
        return { data: { ...file } };
      },
      async update({ fileId, media }) {
        calls.update += 1;
        maybeFail();
        const size = await readStreamLength(media.body);
        const file = store.find((entry) => entry.id === fileId);
        assert.ok(file, `update called for unknown file id ${fileId}`);
        file.size = String(size);
        return { data: { ...file } };
      },
      async get({ fileId }) {
        const file = store.find((entry) => entry.id === fileId);
        return { data: file ? { ...file } : null };
      },
    },
  };
}

function testConfig(overrides = {}) {
  return {
    enabled: true,
    timezone: 'Asia/Kolkata',
    dailyHour: 2,
    intervalSeconds: 300,
    lockMinutes: 30,
    maxAttempts: 3,
    fileName: 'family-details-backup.xlsx',
    clientId: 'test-client',
    clientSecret: 'test-secret',
    redirectUri: 'https://developers.google.com/oauthplayground',
    refreshToken: 'test-refresh',
    folderId: 'test-folder',
    scope: 'https://www.googleapis.com/auth/drive.file',
    cronSecret: 'test-cron-secret',
    ...overrides,
  };
}

// ── Workbook parity with the admin download ──────────────────────────────────

test('the backup workbook is the same one-sheet layout as the admin download', async () => {
  const buffer = await buildFamilyWorkbookBuffer(SAMPLE_RECORDS);
  const workbook = await readWorkbook(buffer);

  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Family Records']);

  const sheet = workbook.getWorksheet('Family Records');
  const headers = sheet.getRow(1).values.slice(1);
  const expectedHeaders = [
    ...MAIN_COLUMNS.map((column) => column.header),
    'Family Member 1 Details',
    'Family Member 2 Details',
  ];
  assert.deepEqual(headers, expectedHeaders);

  assert.equal(sheet.getRow(2).getCell(1).value, 'Umesh Singh');

  // businessWork.* is consolidated into a single "Occupation Detail" column.
  const detailCell = sheet.getRow(2).getCell(expectedHeaders.indexOf('Occupation Detail') + 1).value;
  assert.match(String(detailCell), /Business Name: Singh Traders/);
  assert.match(String(detailCell), /Business Type: Retail/);

  // Each family member keeps their own column group, nested details included.
  const member1 = sheet.getRow(2).getCell(expectedHeaders.indexOf('Family Member 1 Details') + 1).value;
  assert.match(String(member1), /Full Name: Raj Singh/);
  assert.match(String(member1), /Relationship: Father/);

  const member2 = sheet.getRow(2).getCell(expectedHeaders.indexOf('Family Member 2 Details') + 1).value;
  assert.match(String(member2), /Full Name: Sita Singh/);
  assert.match(String(member2), /Institution Name: Govt School/);
});

test('an empty dataset still produces a valid header-only workbook', async () => {
  const buffer = await buildFamilyWorkbookBuffer([]);
  const workbook = await readWorkbook(buffer);
  const sheet = workbook.getWorksheet('Family Records');

  assert.equal(sheet.rowCount, 1);
  assert.deepEqual(sheet.getRow(1).values.slice(1), MAIN_COLUMNS.map((column) => column.header));
});

test('a larger family adds one column group per member', async () => {
  const records = [
    { mainMember: { fullName: 'A' }, familyMembers: [{ fullName: 'M1' }, { fullName: 'M2' }, { fullName: 'M3' }] },
  ];
  const worksheets = await readWorkbook(await buildFamilyWorkbookBuffer(records));
  const headers = worksheets.getWorksheet('Family Records').getRow(1).values.slice(1);

  assert.ok(headers.includes('Family Member 3 Details'));
  assert.ok(!headers.includes('Family Member 4 Details'));
});

// ── Upload, update and failure handling ──────────────────────────────────────

test('the first run creates the Drive file and records a successful run', async (t) => {
  if (!dbReady) return t.skip('MongoDB not available');

  const fake = createFakeDrive();
  const run = await runBackup({ trigger: 'manual', driveClient: fake, config: testConfig() });

  assert.equal(run.status, 'success');
  assert.equal(run.fileId, 'drive-file-1');
  assert.equal(run.attempts, 1);
  assert.equal(run.recordCount, 0); // empty test database
  assert.ok(run.sizeBytes > 0);
  assert.equal(fake.calls.create, 1);
  assert.equal(fake.calls.update, 0);
  assert.equal(fake.store.length, 1);

  const persisted = await BackupRun.findById(run._id).lean();
  assert.equal(persisted.status, 'success');
  assert.equal(persisted.fileId, 'drive-file-1');
});

test('a later run updates the same Drive file instead of duplicating it', async (t) => {
  if (!dbReady) return t.skip('MongoDB not available');

  const fake = createFakeDrive({
    initialFiles: [{ id: 'existing-file-id', name: 'family-details-backup.xlsx', size: '1' }],
  });
  const run = await runBackup({ trigger: 'scheduled', driveClient: fake, config: testConfig() });

  assert.equal(run.status, 'success');
  assert.equal(run.fileId, 'existing-file-id');
  assert.equal(fake.calls.update, 1);
  assert.equal(fake.calls.create, 0);
  assert.equal(fake.store.length, 1);
});

test('a failing upload is retried and never reported as success', async (t) => {
  if (!dbReady) return t.skip('MongoDB not available');

  const fake = createFakeDrive({ failUploads: 99 });
  await assert.rejects(() => runBackup({ trigger: 'manual', driveClient: fake, config: testConfig() }), /simulated Drive failure/);

  const failed = await BackupRun.findOne({ status: 'failed' }).lean();
  assert.ok(failed, 'a failed run must be recorded');
  assert.equal(failed.errorCode, 'BACKUP_FAILED');
  assert.match(failed.errorMessage, /simulated Drive failure/);
  assert.equal(await BackupRun.countDocuments({ status: 'success' }), 0);
});

test('a transient failure is retried until the upload succeeds', async (t) => {
  if (!dbReady) return t.skip('MongoDB not available');

  const fake = createFakeDrive({ failUploads: 2 });
  const run = await runBackup({ trigger: 'manual', driveClient: fake, config: testConfig({ maxAttempts: 3 }) });

  assert.equal(run.status, 'success');
  assert.equal(run.attempts, 3);
});

test('an already-running backup is refused', async (t) => {
  if (!dbReady) return t.skip('MongoDB not available');

  const config = testConfig();
  await BackupRun.create({ trigger: 'manual', status: 'running', startedAt: new Date(), fileName: config.fileName });

  const fake = createFakeDrive();
  await assert.rejects(
    () => runBackup({ trigger: 'manual', driveClient: fake, config }),
    (error) => error.code === 'ALREADY_RUNNING'
  );
  assert.equal(fake.calls.create, 0);
});

test('a disabled backup and an unconfigured Drive are both refused', async (t) => {
  if (!dbReady) return t.skip('MongoDB not available');

  const fake = createFakeDrive();
  await assert.rejects(
    () => runBackup({ driveClient: fake, config: testConfig({ enabled: false }) }),
    (error) => error.code === 'BACKUP_DISABLED'
  );
  await assert.rejects(
    () => runBackup({ driveClient: fake, config: testConfig({ refreshToken: '' }) }),
    (error) => error.code === 'DRIVE_NOT_CONFIGURED'
  );
});

// ── Schedule: once per day in the configured timezone, restart-safe ──────────

test('the zoned date/hour follows Asia/Kolkata, not the host clock', () => {
  assert.deepEqual(zonedDateParts(new Date('2026-10-17T20:30:00Z'), 'Asia/Kolkata'), { date: '2026-10-18', hour: 2 });
  assert.deepEqual(zonedDateParts(new Date('2026-10-17T20:29:00Z'), 'Asia/Kolkata'), { date: '2026-10-18', hour: 1 });
  assert.deepEqual(zonedDateParts(new Date('2026-10-17T03:00:00Z'), 'Asia/Kolkata'), { date: '2026-10-17', hour: 8 });
});

test('the daily run is due once per local day and is skipped after a success', async (t) => {
  if (!dbReady) return t.skip('MongoDB not available');

  const config = testConfig({ dailyHour: 2 });
  const afterScheduledHour = new Date('2026-10-17T00:00:00Z'); // 05:30 IST on 2026-10-17

  // Nothing has run yet.
  assert.equal(await isRunDue(config, afterScheduledHour), true);

  // A success earlier the same local day suppresses a second run (survives restarts).
  await BackupRun.create({
    trigger: 'scheduled',
    status: 'success',
    startedAt: new Date('2026-10-16T20:40:00Z'),
    finishedAt: new Date('2026-10-16T20:41:00Z'), // 02:11 IST on 2026-10-17
  });
  assert.equal(await isRunDue(config, afterScheduledHour), false);

  // A success on a previous local day no longer suppresses today's run.
  await BackupRun.deleteMany({});
  await BackupRun.create({
    trigger: 'scheduled',
    status: 'success',
    startedAt: new Date('2026-10-16T00:00:00Z'),
    finishedAt: new Date('2026-10-16T00:01:00Z'), // 05:31 IST on 2026-10-16
  });
  assert.equal(await isRunDue(config, afterScheduledHour), true);
});

test('nothing runs before the configured local hour', async (t) => {
  if (!dbReady) return t.skip('MongoDB not available');

  const config = testConfig({ dailyHour: 2 });
  const beforeHour = new Date('2026-10-16T19:00:00Z'); // 00:30 IST on 2026-10-17
  assert.equal(await isRunDue(config, beforeHour), false);
});
