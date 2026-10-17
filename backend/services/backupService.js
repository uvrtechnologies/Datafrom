/**
 * The daily backup orchestrator: generate the workbook with the exact function
 * the admin download uses, upload it to Google Drive, verify the result, and
 * record the outcome in MongoDB.
 *
 * Guarantees:
 *  - a success is only reported after Google Drive returns the file id and a
 *    byte count that matches what was uploaded;
 *  - a failed upload never overwrites the previous good backup (Drive replaces
 *    the bytes only when the upload completes);
 *  - two runs can never overlap (in-process guard + durable `running` row);
 *  - start time, finish time, result and error are recorded and logged.
 *
 * `driveClient` is injectable so tests can run the whole flow without credentials.
 */

const BackupRun = require('../models/BackupRun');
const { loadExportFamilies } = require('./familyExport');
const { buildFamilyWorkbookBuffer } = require('./familyWorkbook');
const { getBackupConfig, isDriveConfigured, missingDriveVariables } = require('./backupConfig');
const drive = require('./googleDrive');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Guards against a second run starting while one is in flight in this process.
let inProcessLock = false;

function backupError(code, message, statusCode = 500) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function serializeRun(run) {
  if (!run) return null;
  return {
    id: String(run._id),
    trigger: run.trigger,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
    fileName: run.fileName || null,
    fileId: run.fileId || null,
    sizeBytes: run.sizeBytes,
    driveSizeBytes: run.driveSizeBytes,
    recordCount: run.recordCount,
    attempts: run.attempts,
    errorCode: run.errorCode || null,
    errorMessage: run.errorMessage || null,
  };
}

/** True while a run started within the lock window is still marked running. */
async function hasActiveRun(config) {
  const staleBefore = new Date(Date.now() - config.lockMinutes * 60 * 1000);
  const active = await BackupRun.findOne({ status: 'running', startedAt: { $gt: staleBefore } })
    .select('_id')
    .lean();
  return Boolean(active);
}

/**
 * Uploads (creating the file on the first run, updating it afterwards) and
 * verifies the stored size. Returns the id and size Drive reported.
 */
async function uploadWithRetry({ driveClient, config, buffer }) {
  let lastError;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    try {
      const existing = await drive.findBackupFile(driveClient, {
        folderId: config.folderId,
        fileName: config.fileName,
      });

      const uploaded = existing
        ? await drive.updateBackupFile(driveClient, { fileId: existing.id, buffer })
        : await drive.createBackupFile(driveClient, {
            folderId: config.folderId,
            fileName: config.fileName,
            buffer,
          });

      if (!uploaded || !uploaded.id) {
        throw backupError('UPLOAD_NO_FILE_ID', 'Google Drive did not return a file id for the backup.');
      }

      let driveSizeBytes = uploaded.size != null ? Number(uploaded.size) : null;
      if (driveSizeBytes == null) {
        const meta = await drive.getFileMetadata(driveClient, uploaded.id);
        driveSizeBytes = meta && meta.size != null ? Number(meta.size) : null;
      }
      // Drive must report exactly the bytes we uploaded, otherwise it is a failure.
      if (driveSizeBytes != null && driveSizeBytes !== buffer.length) {
        throw backupError(
          'UPLOAD_SIZE_MISMATCH',
          `Google Drive reports ${driveSizeBytes} bytes but ${buffer.length} bytes were uploaded.`
        );
      }

      return {
        fileId: uploaded.id,
        sizeBytes: buffer.length,
        driveSizeBytes,
        updated: Boolean(existing),
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      if (attempt < config.maxAttempts) {
        const backoffMs = Math.min(2 ** (attempt - 1), 8) * 1000;
        console.warn(`[backup] upload attempt ${attempt} failed (${error.message}); retrying in ${backoffMs}ms`);
        await sleep(backoffMs);
      }
    }
  }

  throw lastError;
}

/**
 * Runs one backup end to end.
 * @param {{ trigger?: string, driveClient?: object, config?: object }} options
 */
async function runBackup({ trigger = 'manual', driveClient, config = getBackupConfig() } = {}) {
  if (!config.enabled) {
    throw backupError('BACKUP_DISABLED', 'Automatic backups are disabled (BACKUP_ENABLED=false).', 503);
  }
  if (!isDriveConfigured(config)) {
    throw backupError(
      'DRIVE_NOT_CONFIGURED',
      `Google Drive is not configured. Missing: ${missingDriveVariables(config).join(', ')}.`,
      503
    );
  }
  if (inProcessLock) {
    throw backupError('ALREADY_RUNNING', 'A backup is already running.', 409);
  }
  if (await hasActiveRun(config)) {
    throw backupError('ALREADY_RUNNING', 'A backup is already running.', 409);
  }

  inProcessLock = true;
  const startedAt = new Date();
  const run = await BackupRun.create({ trigger, status: 'running', startedAt, fileName: config.fileName });
  console.log(`[backup] started (trigger=${trigger}, run=${run._id})`);

  try {
    const client = driveClient || drive.createDriveClient(config);

    // One query, then the same builder the admin download uses.
    const families = await loadExportFamilies();
    const buffer = await buildFamilyWorkbookBuffer(families);

    const result = await uploadWithRetry({ driveClient: client, config, buffer });

    const finishedAt = new Date();
    run.status = 'success';
    run.finishedAt = finishedAt;
    run.durationMs = finishedAt - startedAt;
    run.fileId = result.fileId;
    run.sizeBytes = result.sizeBytes;
    run.driveSizeBytes = result.driveSizeBytes;
    run.recordCount = families.length;
    run.attempts = result.attempts;
    await run.save();

    console.log(
      `[backup] success: ${result.updated ? 'updated' : 'created'} ${config.fileName} ` +
        `(id=${result.fileId}), ${families.length} records, ${result.sizeBytes} bytes in ${run.durationMs}ms`
    );
    return run;
  } catch (error) {
    const finishedAt = new Date();
    run.status = 'failed';
    run.finishedAt = finishedAt;
    run.durationMs = finishedAt - startedAt;
    run.errorCode = error.code || 'BACKUP_FAILED';
    run.errorMessage = String(error.message || error).slice(0, 500);
    await run.save().catch(() => {});
    console.error(`[backup] FAILED (trigger=${trigger}): ${run.errorCode} — ${run.errorMessage}`);
    throw error;
  } finally {
    inProcessLock = false;
  }
}

module.exports = { runBackup, serializeRun, hasActiveRun };
