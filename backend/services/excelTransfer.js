const crypto = require('crypto');
const ExcelJS = require('exceljs');
const XLSX = require('@e965/xlsx');
const Family = require('../models/Family');

const MAX_ROWS = 5000;
const PREVIEW_TTL_MS = 15 * 60 * 1000;
const REQUIRED_COLUMNS = [
  'submissionId',
  'mainMember.fullName',
  'mainMember.gender',
  'mainMember.maritalStatus',
  'mainMember.mobileNumber',
  'address.current.village',
  'address.current.city',
];
const ARRAY_COLUMNS = new Set(['familyMembers', 'children.list']);
const EXCLUDED_PATHS = new Set(['_id', '__v', 'createdAt', 'updatedAt']);
// Still stored in MongoDB and edited in the app, but deliberately left out of the
// generated workbook so the download never contains them.
const EXCLUDED_EXPORT_COLUMNS = new Set([
  'mainMember.firstName',
  'mainMember.surname',
  'mainMember.nationality',
  'address.sameAsCurrent',
  'children.hasChildren',
  'children.list',
  'submittedAt',
  'status',
]);

function collectColumns(schema, prefix = '') {
  return Object.entries(schema.paths).flatMap(([path, schemaType]) => {
    if (EXCLUDED_PATHS.has(path)) return [];
    const fullPath = `${prefix}${path}`;
    if (schemaType.instance === 'Embedded') return collectColumns(schemaType.schema, `${fullPath}.`);
    return [fullPath];
  });
}

// `columns` drives the generated workbook; `columnSet` stays schema-complete so a
// workbook downloaded before these columns were removed can still be re-imported.
const schemaColumns = collectColumns(Family.schema);
const columnSet = new Set(schemaColumns);
const columns = schemaColumns.filter((path) => !EXCLUDED_EXPORT_COLUMNS.has(path));
const previews = new Map();

function getValue(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source);
}

function excelValue(value, path) {
  if (ARRAY_COLUMNS.has(path)) return JSON.stringify(value || []);
  return value ?? '';
}

async function createWorkbook(records) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Family Records');
  worksheet.columns = columns.map((path) => ({
    header: path,
    key: path,
    width: Math.min(Math.max(path.length + 3, 18), 36),
  }));

  worksheet.addRows(records.map((record) => Object.fromEntries(
    columns.map((path) => [path, excelValue(getValue(record, path), path)])
  )));
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = `A1:${worksheet.getColumn(columns.length).letter}${Math.max(1, records.length + 1)}`;

  const header = worksheet.getRow(1);
  header.height = 28;
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  header.alignment = { vertical: 'middle', wrapText: true };
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: 'top', wrapText: true };
    row.eachCell((cell) => {
      if (cell.value instanceof Date) cell.numFmt = 'yyyy-mm-dd hh:mm';
    });
  });

  return workbook;
}

function parseCell(value, path) {
  if (ARRAY_COLUMNS.has(path)) {
    if (typeof value !== 'string') throw new Error('must contain a JSON array');
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error('must contain a JSON array');
    const arraySchema = Family.schema.path(path).schema;
    parsed.forEach((item, index) => validateSubdocumentValue(item, arraySchema, `${path}[${index}]`));
    return parsed;
  }

  const schemaType = Family.schema.path(path);
  if (schemaType.instance === 'Boolean') {
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'no', '0'].includes(normalized)) return false;
    throw new Error('must be Yes or No');
  }
  if (schemaType.instance === 'Date') {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error('must be a valid date');
    return date;
  }
  if (typeof value === 'object') throw new Error('must be a plain cell value');
  return String(value).trim();
}

function validateSubdocumentValue(value, schema, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    throw new Error(`${path} must be an object`);
  }
  Object.entries(value).forEach(([key, childValue]) => {
    const childSchemaType = schema.path(key);
    if (!childSchemaType) throw new Error(`${path} contains unknown field "${key}"`);
    if (childSchemaType.instance === 'Embedded' && childValue != null) {
      validateSubdocumentValue(childValue, childSchemaType.schema, `${path}.${key}`);
    }
    if (childSchemaType.instance === 'Array' && childSchemaType.schema && Array.isArray(childValue)) {
      childValue.forEach((item, index) => validateSubdocumentValue(item, childSchemaType.schema, `${path}.${key}[${index}]`));
    }
  });
}

function blankValue(path) {
  const instance = Family.schema.path(path)?.instance;
  if (ARRAY_COLUMNS.has(path)) return [];
  if (instance === 'Boolean') return false;
  if (instance === 'Date') return null;
  return '';
}

function parseWorkbook(file, clearEmptyCells) {
  const workbook = XLSX.read(file.buffer, {
    type: 'buffer',
    cellDates: true,
    cellFormula: true,
    WTF: true,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The workbook does not contain a worksheet.');

  const worksheet = workbook.Sheets[sheetName];
  const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
  if (!range) throw new Error('The worksheet is empty.');
  if (range.e.c >= 100) throw new Error('The worksheet has too many columns.');
  if (range.e.r > MAX_ROWS) throw new Error(`The worksheet may contain at most ${MAX_ROWS} records.`);

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell?.f) throw new Error(`Formulas are not supported (row ${row + 1}). Paste their values before importing.`);
    }
  }

  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: true,
  });
  const headers = (matrix[0] || []).map((header) => String(header ?? '').trim());
  if (!headers.length || headers.every((header) => !header)) {
    throw new Error('The worksheet must contain a header row.');
  }
  if (headers.some((header) => !header)) throw new Error('Column headers cannot be blank.');
  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicateHeaders.length) {
    throw new Error(`Duplicate column header: ${[...new Set(duplicateHeaders)].join(', ')}.`);
  }
  const unknownHeaders = headers.filter((header) => !columnSet.has(header));
  if (unknownHeaders.length) throw new Error(`Unknown column header(s): ${unknownHeaders.join(', ')}.`);
  const missingRequired = REQUIRED_COLUMNS.filter((header) => !headers.includes(header));
  if (missingRequired.length) {
    throw new Error(`Missing required column(s): ${missingRequired.join(', ')}.`);
  }

  const rows = [];
  let skipped = 0;
  matrix.slice(1).forEach((cells, index) => {
    if (cells.every((cell) => cell === '' || cell === null || cell === undefined)) {
      skipped += 1;
      return;
    }
    const row = { rowNumber: range.s.r + index + 2, submissionId: '', patch: {}, unsetPaths: [], errors: [] };
    headers.forEach((header, columnIndex) => {
      const cell = cells[columnIndex];
      const isBlank = cell === '' || cell === null || cell === undefined;
      if (isBlank && !clearEmptyCells) return;
      if (isBlank && !REQUIRED_COLUMNS.includes(header)) {
        if (header === 'familyKey') {
          row.unsetPaths.push(header);
          return;
        }
        row.patch[header] = blankValue(header);
        return;
      }
      try {
        const value = parseCell(cell, header);
        if (header === 'submissionId') {
          row.submissionId = value;
          row.patch[header] = value;
        } else {
          row.patch[header] = value;
        }
      } catch (error) {
        row.errors.push(`${header} ${error.message}`);
      }
    });
    if (!row.submissionId) row.errors.push('submissionId is required.');
    rows.push(row);
  });

  if (rows.length > MAX_ROWS) throw new Error(`The worksheet may contain at most ${MAX_ROWS} records.`);
  const idCounts = new Map();
  rows.forEach((row) => idCounts.set(row.submissionId, (idCounts.get(row.submissionId) || 0) + 1));
  rows.forEach((row) => {
    if (row.submissionId && idCounts.get(row.submissionId) > 1) {
      row.errors.push(`Duplicate submissionId "${row.submissionId}" in the uploaded file.`);
    }
  });

  return { rows, skipped };
}

async function validateRows(rows) {
  const ids = rows.map((row) => row.submissionId).filter(Boolean);
  const existingRecords = await Family.find({ submissionId: { $in: ids } }).lean();
  const existingById = new Map(existingRecords.map((record) => [record.submissionId, record]));
  rows.forEach((row) => {
    if (row.patch.familyKey) row.patch.familyKey = String(row.patch.familyKey).trim().toUpperCase();
  });
  const familyKeys = [...new Set(rows.map((row) => row.patch.familyKey).filter(Boolean))];
  const familyKeyRecords = familyKeys.length
    ? await Family.find({ familyKey: { $in: familyKeys } }).select('familyKey submissionId').lean()
    : [];
  const familyKeyOwners = new Map(familyKeyRecords.map((record) => [record.familyKey, record.submissionId]));
  const incomingFamilyKeyOwners = new Map();

  rows.forEach((row) => {
    const key = row.patch.familyKey;
    if (!key) return;
    const normalized = String(key).trim().toUpperCase();
    const owner = incomingFamilyKeyOwners.get(normalized);
    if (owner && owner !== row.submissionId) {
      row.errors.push(`Family key "${normalized}" is used by more than one uploaded record.`);
    } else {
      incomingFamilyKeyOwners.set(normalized, row.submissionId);
    }
    const databaseOwner = familyKeyOwners.get(normalized);
    if (databaseOwner && databaseOwner !== row.submissionId) {
      row.errors.push(`Family key "${normalized}" already belongs to another record.`);
    }
  });

  for (const row of rows) {
    row.action = existingById.has(row.submissionId) ? 'update' : 'add';
    if (row.errors.length) continue;

    const record = existingById.get(row.submissionId);
    const document = record ? new Family(record) : new Family();
    Object.entries(row.patch).forEach(([path, value]) => document.set(path, value));
    row.unsetPaths.forEach((path) => document.set(path, undefined));
    try {
      await document.validate();
      Object.keys(row.patch).forEach((path) => {
        row.patch[path] = document.get(path);
      });
      row.mainMember = document.get('mainMember.fullName') || '';
      row.village = document.get('address.current.village') || '';
      row.city = document.get('address.current.city') || '';
    } catch (error) {
      row.errors.push(...Object.values(error.errors).map((fieldError) => `${fieldError.path}: ${fieldError.message}`));
    }
  }

  return existingById;
}

function summarize(rows, skipped) {
  return {
    added: rows.filter((row) => row.action === 'add' && !row.errors.length).length,
    updated: rows.filter((row) => row.action === 'update' && !row.errors.length).length,
    skipped,
    failed: rows.filter((row) => row.errors.length).length,
  };
}

function cachePreview(adminId, rows, skipped) {
  const now = Date.now();
  for (const [id, preview] of previews) {
    if (preview.expiresAt <= now) previews.delete(id);
  }
  while (previews.size >= 10) previews.delete(previews.keys().next().value);

  const previewId = crypto.randomUUID();
  const expiresAt = now + PREVIEW_TTL_MS;
  previews.set(previewId, { adminId: String(adminId), rows, skipped, expiresAt });
  return { previewId, expiresAt: new Date(expiresAt).toISOString() };
}

function getPreview(previewId, adminId) {
  const preview = previews.get(previewId);
  if (!preview || preview.expiresAt <= Date.now()) {
    previews.delete(previewId);
    return null;
  }
  if (preview.adminId !== String(adminId)) return null;
  return preview;
}

function deletePreview(previewId) {
  previews.delete(previewId);
}

module.exports = {
  columns,
  cachePreview,
  createWorkbook,
  deletePreview,
  getPreview,
  parseWorkbook,
  summarize,
  validateRows,
};
