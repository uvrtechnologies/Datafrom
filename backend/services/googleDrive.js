/**
 * Minimal Google Drive v3 wrapper for the daily backup.
 *
 * OAuth 2.0 with a long-lived refresh token: the client is created from
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN and renews its
 * access token itself. The backup lives in one folder (GOOGLE_DRIVE_FOLDER_ID)
 * under one fixed name, and is updated in place instead of being duplicated.
 */

const { Readable } = require('node:stream');
const { XLSX_MIME, getBackupConfig } = require('./backupConfig');

// Marks the files this app created, so a future run can recognise its own file.
const BACKUP_SOURCE = 'rajput-samaj-family-details-backup';

// googleapis is required lazily so the API can boot even before the dependency
// is installed; a missing package then surfaces as a clear backup error.
function createDriveClient(config = getBackupConfig()) {
  const { google } = require('googleapis');
  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  auth.setCredentials({ refresh_token: config.refreshToken });
  return google.drive({ version: 'v3', auth });
}

function escapeQueryValue(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** The existing backup file in the folder, or null when this is the first run. */
async function findBackupFile(drive, { folderId, fileName }) {
  const response = await drive.files.list({
    q: `name = ${escapeQueryValue(fileName)} and ${escapeQueryValue(folderId)} in parents and trashed = false`,
    fields: 'files(id, name, size, modifiedTime)',
    spaces: 'drive',
    pageSize: 10,
  });
  return (response.data.files || [])[0] || null;
}

function fileMedia(buffer) {
  return { mimeType: XLSX_MIME, body: Readable.from(buffer) };
}

async function createBackupFile(drive, { folderId, fileName, buffer }) {
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: XLSX_MIME,
      appProperties: { source: BACKUP_SOURCE },
    },
    media: fileMedia(buffer),
    fields: 'id, name, size, modifiedTime',
  });
  return response.data;
}

async function updateBackupFile(drive, { fileId, buffer }) {
  const response = await drive.files.update({
    fileId,
    media: fileMedia(buffer),
    fields: 'id, name, size, modifiedTime',
  });
  return response.data;
}

async function getFileMetadata(drive, fileId) {
  const response = await drive.files.get({ fileId, fields: 'id, name, size, modifiedTime' });
  return response.data;
}

module.exports = {
  BACKUP_SOURCE,
  createDriveClient,
  findBackupFile,
  createBackupFile,
  updateBackupFile,
  getFileMetadata,
};
