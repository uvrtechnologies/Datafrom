/**
 * The single place a family-records workbook is generated.
 *
 * Both the admin download (GET /api/admin/export/excel) and the automatic Google
 * Drive backup build their file here, so the download and the backup can never
 * drift apart: same sheet, same columns, same order, same formatting.
 *
 * The row query lives in services/familyExport and the worksheet layout in
 * services/familySheet.
 */

const ExcelJS = require('exceljs');
const { buildFamilyDetailsWorksheet } = require('./familySheet');

const WORKBOOK_CREATOR = 'Rajput Samaj Admin';

/**
 * Builds the workbook buffer for the given family records.
 * @param {Array<object>} families rows as returned by loadExportFamilies()
 * @returns {Promise<Buffer>} an .xlsx file that can be downloaded or uploaded
 */
async function buildFamilyWorkbookBuffer(families) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = WORKBOOK_CREATOR;
  workbook.created = new Date();
  buildFamilyDetailsWorksheet(workbook, families || []);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = { WORKBOOK_CREATOR, buildFamilyWorkbookBuffer };
