/**
 * Admin endpoints for the daily Google Drive backup.
 *
 * Reads require an authenticated admin; the manual run additionally requires the
 * `admin`/`superadmin` role. The cron endpoint is the only unauthenticated-JWT
 * entry point and is guarded by the BACKUP_CRON_SECRET header instead, so an
 * external scheduler can trigger the same backup.
 */

const crypto = require('crypto');
const BackupRun = require('../models/BackupRun');
const { runBackup, serializeRun } = require('../services/backupService');
const { getBackupConfig, isDriveConfigured, missingDriveVariables } = require('../services/backupConfig');

function buildConfigSummary() {
  const config = getBackupConfig();
  return {
    enabled: config.enabled,
    driveConfigured: isDriveConfigured(config),
    missingVariables: missingDriveVariables(config),
    timezone: config.timezone,
    dailyHour: config.dailyHour,
    schedule: `${String(config.dailyHour).padStart(2, '0')}:00 ${config.timezone}`,
    fileName: config.fileName,
    maxAttempts: config.maxAttempts,
  };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** Guard for the external-scheduler endpoint (no JWT, shared secret instead). */
function cronGuard(req, res, next) {
  const secret = getBackupConfig().cronSecret;
  if (!secret) {
    return res.status(503).json({
      success: false,
      message: 'Backup cron secret is not configured (set BACKUP_CRON_SECRET).',
    });
  }
  const provided = req.get('x-backup-secret') || req.query.secret || '';
  if (!safeEqual(provided, secret)) {
    return res.status(401).json({ success: false, message: 'Invalid backup secret.' });
  }
  req.backupTrigger = 'cron';
  return next();
}

// POST /api/admin/backup/run  and  POST /api/admin/backup/cron
async function triggerBackup(req, res) {
  try {
    const run = await runBackup({ trigger: req.backupTrigger || 'manual' });
    return res.json({ success: true, message: 'Backup completed.', run: serializeRun(run) });
  } catch (error) {
    const status = error.statusCode === 503 ? 503 : error.statusCode === 409 ? 409 : 502;
    return res.status(status).json({
      success: false,
      code: error.code || 'BACKUP_FAILED',
      message: error.message,
    });
  }
}

// GET /api/admin/backup/status
async function getStatus(req, res, next) {
  try {
    const [lastRun, lastSuccess] = await Promise.all([
      BackupRun.findOne().sort({ startedAt: -1 }).lean(),
      BackupRun.findOne({ status: 'success' }).sort({ finishedAt: -1 }).lean(),
    ]);
    return res.json({
      success: true,
      config: buildConfigSummary(),
      lastRun: serializeRun(lastRun),
      lastSuccess: serializeRun(lastSuccess),
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/admin/backup/history?limit=20
async function getHistory(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const runs = await BackupRun.find().sort({ startedAt: -1 }).limit(limit).lean();
    return res.json({ success: true, runs: runs.map(serializeRun) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { triggerBackup, getStatus, getHistory, cronGuard, buildConfigSummary };
