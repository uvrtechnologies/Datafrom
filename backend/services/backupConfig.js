/**
 * Configuration for the automatic daily Google Drive backup, read only from the
 * backend environment. None of these values are ever sent to the frontend —
 * the admin status endpoint reports whether Drive is configured, never secrets.
 */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function readString(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function readBool(name, fallback) {
  const value = readString(name).toLowerCase();
  if (!value) return fallback;
  return value !== 'false' && value !== '0' && value !== 'no';
}

function readInt(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number.parseInt(readString(name), 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

// The Drive folder may be given as a bare id or as a full ".../folders/<id>" URL.
function extractFolderId(value) {
  if (!value) return '';
  const match = String(value).match(/\/folders\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : String(value).trim();
}

function getBackupConfig() {
  return {
    enabled: readBool('BACKUP_ENABLED', true),
    timezone: readString('BACKUP_TIMEZONE') || 'Asia/Kolkata',
    dailyHour: readInt('BACKUP_DAILY_HOUR', 2, { min: 0, max: 23 }),
    intervalSeconds: readInt('BACKUP_INTERVAL_SECONDS', 300, { min: 30 }),
    lockMinutes: readInt('BACKUP_LOCK_MINUTES', 30, { min: 1 }),
    maxAttempts: readInt('BACKUP_MAX_ATTEMPTS', 3, { min: 1, max: 10 }),
    fileName: readString('BACKUP_FILE_NAME') || 'family-details-backup.xlsx',
    clientId: readString('GOOGLE_CLIENT_ID'),
    clientSecret: readString('GOOGLE_CLIENT_SECRET'),
    redirectUri: readString('GOOGLE_REDIRECT_URI') || 'https://developers.google.com/oauthplayground',
    refreshToken: readString('GOOGLE_REFRESH_TOKEN'),
    folderId: extractFolderId(readString('GOOGLE_DRIVE_FOLDER_ID')),
    scope: readString('GOOGLE_DRIVE_SCOPES') || 'https://www.googleapis.com/auth/drive',
    cronSecret: readString('BACKUP_CRON_SECRET'),
  };
}

/** Every Drive credential the backup needs must be present. */
function isDriveConfigured(config = getBackupConfig()) {
  return Boolean(config.clientId && config.clientSecret && config.refreshToken && config.folderId);
}

/** The names (never the values) of the Drive variables that are still missing. */
function missingDriveVariables(config = getBackupConfig()) {
  return [
    ['GOOGLE_CLIENT_ID', config.clientId],
    ['GOOGLE_CLIENT_SECRET', config.clientSecret],
    ['GOOGLE_REFRESH_TOKEN', config.refreshToken],
    ['GOOGLE_DRIVE_FOLDER_ID', config.folderId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

module.exports = {
  XLSX_MIME,
  getBackupConfig,
  isDriveConfigured,
  missingDriveVariables,
  extractFolderId,
};
