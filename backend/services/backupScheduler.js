/**
 * In-process daily scheduler for the Google Drive backup.
 *
 * The timer only decides *when to check*; whether a backup is due is decided
 * from MongoDB (the latest successful `BackupRun`), so the schedule survives a
 * restart or a sleeping host (e.g. Render's free tier):
 *   - once per calendar day in BACKUP_TIMEZONE (default Asia/Kolkata);
 *   - after BACKUP_DAILY_HOUR (default 02:00 local);
 *   - if the host was asleep at that hour, the first tick after it wakes runs
 *     the missed backup.
 *
 * An external scheduler can drive the same backup through the protected cron
 * endpoint; both paths share the same lock, so they cannot overlap.
 */

const BackupRun = require('../models/BackupRun');
const { getBackupConfig, isDriveConfigured, missingDriveVariables } = require('./backupConfig');
const { runBackup } = require('./backupService');

let timer = null;
let ticking = false;

/**
 * The date and hour at `date` in the given IANA timezone.
 * @returns {{ date: string, hour: number }} date is YYYY-MM-DD; hour is 0–23
 */
function zonedDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${map.year}-${map.month}-${map.day}`, hour: Number(map.hour) % 24 };
}

/** True when today's backup (in BACKUP_TIMEZONE) has not succeeded yet. */
async function isRunDue(config, now = new Date()) {
  const { date, hour } = zonedDateParts(now, config.timezone);
  if (hour < config.dailyHour) return false;

  const lastSuccess = await BackupRun.findOne({ status: 'success' })
    .sort({ finishedAt: -1 })
    .select('finishedAt')
    .lean();
  if (lastSuccess && lastSuccess.finishedAt) {
    return zonedDateParts(lastSuccess.finishedAt, config.timezone).date !== date;
  }
  return true;
}

async function tick(trigger = 'scheduled') {
  if (ticking) return null;
  ticking = true;
  try {
    const config = getBackupConfig();
    if (!config.enabled || !isDriveConfigured(config)) return null;
    if (!(await isRunDue(config))) return null;
    return await runBackup({ trigger, config });
  } catch (error) {
    // Never crash the process on a scheduled failure — it is recorded on the run.
    console.error(`[backup] scheduled run failed: ${error.code || error.name || ''} ${error.message}`.trim());
    return null;
  } finally {
    ticking = false;
  }
}

function startBackupScheduler() {
  if (timer) return;

  const config = getBackupConfig();
  if (!config.enabled) {
    console.log('[backup] scheduler disabled (BACKUP_ENABLED=false).');
    return;
  }
  if (!isDriveConfigured(config)) {
    console.warn(
      `[backup] scheduler NOT started — Google Drive not configured ` +
        `(missing: ${missingDriveVariables(config).join(', ')}).`
    );
    return;
  }

  const intervalMs = Math.max(config.intervalSeconds, 30) * 1000;
  timer = setInterval(() => {
    void tick();
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();

  console.log(
    `[backup] scheduler started — daily at ` +
      `${String(config.dailyHour).padStart(2, '0')}:00 ${config.timezone} (checks every ${config.intervalSeconds}s).`
  );

  // Catch up immediately in case today's run was missed while the host was down.
  void tick('startup');
}

function stopBackupScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startBackupScheduler, stopBackupScheduler, isRunDue, zonedDateParts };
