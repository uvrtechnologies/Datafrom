const Family = require('../models/Family');
const {
  cachePreview,
  createWorkbook,
  deletePreview,
  getPreview,
  parseWorkbook,
  summarize,
  validateRows,
} = require('../services/excelTransfer');

async function exportExcel(req, res, next) {
  try {
    const records = await Family.find().sort({ submittedAt: -1 }).lean();
    const workbook = await createWorkbook(records);
    const buffer = await workbook.xlsx.writeBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="family-records.xlsx"',
    });
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
}

async function previewExcel(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose an .xlsx or .xls file to upload.' });
    }

    const clearEmptyCells = req.body.clearEmptyCells === 'true';
    let parsed;
    try {
      parsed = parseWorkbook(req.file, clearEmptyCells);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof SyntaxError
          ? 'A JSON array cell contains invalid JSON.'
          : error.message,
      });
    }

    const { rows, skipped } = parsed;
    await validateRows(rows);
    const valid = rows.length > 0 && rows.every((row) => !row.errors.length);
    const preview = valid ? cachePreview(req.admin._id, rows, skipped) : {};

    return res.json({
      success: true,
      data: {
        ...preview,
        rows: rows.map((row) => ({
          rowNumber: row.rowNumber,
          submissionId: row.submissionId,
          action: row.action,
          mainMember: row.mainMember || '',
          village: row.village || '',
          city: row.city || '',
          changes: [
            ...Object.entries(row.patch).map(([field, value]) => ({
              field,
              value: Array.isArray(value) ? JSON.stringify(value) : value instanceof Date ? value.toISOString() : String(value),
            })),
            ...row.unsetPaths.map((field) => ({ field, value: '(cleared)' })),
          ],
          errors: row.errors,
        })),
        summary: summarize(rows, skipped),
        canConfirm: valid,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function confirmExcel(req, res, next) {
  try {
    const { previewId } = req.body;
    const preview = getPreview(previewId, req.admin._id);
    if (!preview) {
      return res.status(410).json({
        success: false,
        message: 'This import preview expired or is unavailable. Upload the workbook again.',
      });
    }

    const rows = preview.rows.map((row) => ({
      ...row,
      patch: { ...row.patch },
      unsetPaths: [...row.unsetPaths],
      errors: [],
    }));
    const existingById = await validateRows(rows);
    const invalidRows = rows.filter((row) => row.errors.length);
    if (invalidRows.length) {
      return res.status(409).json({
        success: false,
        message: 'Records changed after preview. No records were imported; upload the workbook again.',
        data: {
          summary: { added: 0, updated: 0, skipped: preview.skipped, failed: rows.length },
          errors: invalidRows.map((row) => ({ rowNumber: row.rowNumber, errors: row.errors })),
        },
      });
    }

    const summary = { added: 0, updated: 0, skipped: preview.skipped, failed: 0 };
    const errors = [];
    deletePreview(previewId);

    for (const row of rows) {
      try {
        if (existingById.has(row.submissionId)) {
          const update = { $set: row.patch };
          if (row.unsetPaths.length) update.$unset = Object.fromEntries(row.unsetPaths.map((path) => [path, 1]));
          const result = await Family.updateOne(
            { submissionId: row.submissionId },
            update,
            { runValidators: true }
          );
          if (!result.matchedCount) throw new Error('The record no longer exists.');
          summary.updated += 1;
        } else {
          const record = new Family();
          Object.entries(row.patch).forEach(([path, value]) => record.set(path, value));
          await record.save();
          summary.added += 1;
        }
      } catch (error) {
        summary.failed += 1;
        errors.push({
          rowNumber: row.rowNumber,
          submissionId: row.submissionId,
          message: error.message || 'The record could not be saved.',
        });
      }
    }

    return res.json({
      success: true,
      data: { summary, errors },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { confirmExcel, exportExcel, previewExcel };
