const mongoose = require('mongoose');

/**
 * One row per backup attempt — the run history the admin status endpoint reads.
 *
 * It doubles as the durable concurrency lock: a row left in `running` within the
 * last BACKUP_LOCK_MINUTES blocks a new run, so a restart (or a second instance)
 * cannot start a second job on top of a live one. The file id of the current
 * backup is kept here too, so it survives restarts.
 *
 * The collection name is explicit: the previously removed backup system left a
 * `backupruns` collection behind (with a unique `runId` index and orphan rows),
 * so writing to a distinct collection keeps this feature isolated from it.
 */
const backupRunSchema = new mongoose.Schema(
  {
    trigger: { type: String, enum: ['scheduled', 'manual', 'cron', 'startup'], default: 'manual' },
    status: { type: String, enum: ['running', 'success', 'failed'], default: 'running', index: true },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
    fileName: { type: String, default: '' },
    fileId: { type: String, default: '' },
    sizeBytes: { type: Number, default: null },
    driveSizeBytes: { type: Number, default: null },
    recordCount: { type: Number, default: null },
    attempts: { type: Number, default: 0 },
    errorCode: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true, collection: 'family_backup_runs' }
);

backupRunSchema.index({ status: 1, startedAt: -1 });
backupRunSchema.index({ status: 1, finishedAt: -1 });

module.exports = mongoose.model('BackupRun', backupRunSchema);
