const assert = require('node:assert/strict');
const { test } = require('node:test');
const Family = require('../models/Family');
const XLSX = require('@e965/xlsx');
const { confirmExcel, previewExcel } = require('../controllers/excelController');
const transfer = require('../services/excelTransfer');

function createRecord(overrides = {}) {
  return new Family({
    submissionId: 'F-ROUNDTRIP-1',
    familyKey: 'KEY-1',
    mainMember: {
      fullName: 'Asha Mehta',
      gender: 'Female',
      maritalStatus: 'Married',
      mobileNumber: '9876543210',
      email: 'asha@example.com',
    },
    address: {
      current: { village: 'Test Village', city: 'Indore' },
      permanent: { village: 'Test Village', city: 'Indore' },
      sameAsCurrent: true,
    },
    familyMembers: [{
      fullName: 'Ravi Mehta',
      relation: 'Son',
      gender: 'Male',
      maritalStatus: 'Single',
    }],
    children: {
      hasChildren: true,
      list: [{ fullName: 'Ravi Mehta', age: '10', gender: 'Male' }],
    },
    ...overrides,
  });
}

async function workbookBuffer(records) {
  const workbook = await transfer.createWorkbook(records);
  return {
    workbook,
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  };
}

function mockFamilyFind(records) {
  const originalFind = Family.find;
  Family.find = (query) => ({
    select() {
      return this;
    },
    async lean() {
      const ids = query.submissionId?.$in;
      const keys = query.familyKey?.$in;
      return records
        .filter((record) => (ids ? ids.includes(record.submissionId) : keys?.includes(record.familyKey)))
        .map((record) => (record.toObject ? record.toObject() : record));
    },
  });
  return () => {
    Family.find = originalFind;
  };
}

test('exports a round-trip template and parses XLSX and XLS nested data', async () => {
  const record = createRecord();
  await record.validate();
  const { buffer } = await workbookBuffer([record.toObject()]);

  assert.ok(transfer.columns.includes('mainMember.fullName'));
  assert.ok(transfer.columns.includes('address.current.village'));
  assert.ok(transfer.columns.includes('familyMembers'));
  assert.ok(transfer.columns.includes('children.list'));

  const xlsxRows = transfer.parseWorkbook({ buffer }, false).rows;
  assert.equal(xlsxRows.length, 1);
  assert.equal(xlsxRows[0].submissionId, record.submissionId);
  assert.equal(xlsxRows[0].patch['mainMember.fullName'], 'Asha Mehta');
  assert.equal(xlsxRows[0].patch.familyMembers[0].fullName, 'Ravi Mehta');
  assert.equal(xlsxRows[0].patch['mainMember.email'], 'asha@example.com');

  const xlsBuffer = XLSX.write(XLSX.read(buffer, { type: 'buffer' }), {
    type: 'buffer',
    bookType: 'biff8',
  });
  assert.equal(transfer.parseWorkbook({ buffer: xlsBuffer }, false).rows[0].submissionId, record.submissionId);

  const { workbook: template, buffer: templateBuffer } = await workbookBuffer([]);
  const templateHeaders = XLSX.utils.sheet_to_json(
    XLSX.read(templateBuffer, { type: 'buffer' }).Sheets['Family Records'],
    { header: 1 }
  )[0];
  assert.deepEqual(templateHeaders, transfer.columns);
  assert.equal(transfer.parseWorkbook({ buffer: templateBuffer }, false).rows.length, 0);
});

test('rejects unexpected headers and duplicate IDs before import', async () => {
  const record = createRecord();
  const { workbook } = await workbookBuffer([]);
  workbook.getWorksheet('Family Records').getRow(1).getCell(1).value = 'Unexpected';
  const invalidHeaderBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  assert.throws(
    () => transfer.parseWorkbook({ buffer: invalidHeaderBuffer }, false),
    /Unknown column header/
  );

  const { buffer } = await workbookBuffer([record.toObject(), record.toObject()]);
  const rows = transfer.parseWorkbook({ buffer }, false).rows;
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.errors.some((error) => error.includes('Duplicate submissionId'))));

  const invalidArrayRecord = createRecord().toObject();
  invalidArrayRecord.familyMembers[0].unexpected = 'not part of the schema';
  const { buffer: invalidArrayBuffer } = await workbookBuffer([invalidArrayRecord]);
  const arrayRows = transfer.parseWorkbook({ buffer: invalidArrayBuffer }, false).rows;
  assert.ok(arrayRows[0].errors.some((error) => error.includes('unknown field "unexpected"')));
});

test('ignores empty optional cells by default and clears only when requested', async () => {
  const record = createRecord();
  const { workbook } = await workbookBuffer([record.toObject()]);
  const worksheet = workbook.getWorksheet('Family Records');
  worksheet.getRow(2).getCell(transfer.columns.indexOf('mainMember.email') + 1).value = '';
  worksheet.getRow(2).getCell(transfer.columns.indexOf('familyKey') + 1).value = '';
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  const ignored = transfer.parseWorkbook({ buffer }, false).rows[0];
  assert.equal(ignored.patch['mainMember.email'], undefined);
  assert.equal(ignored.unsetPaths.length, 0);

  const cleared = transfer.parseWorkbook({ buffer }, true).rows[0];
  assert.equal(cleared.patch['mainMember.email'], '');
  assert.deepEqual(cleared.unsetPaths, ['familyKey']);
});

test('validates enum values and identifies matching records for updates', async () => {
  const invalidRecord = createRecord({ mainMember: {
    fullName: 'Asha Mehta',
    gender: 'Invalid',
    maritalStatus: 'Married',
    mobileNumber: '9876543210',
    email: '',
  } });
  const { buffer: invalidBuffer } = await workbookBuffer([invalidRecord.toObject()]);
  const invalidRows = transfer.parseWorkbook({ buffer: invalidBuffer }, false).rows;
  const restoreWithoutRecords = mockFamilyFind([]);
  try {
    await transfer.validateRows(invalidRows);
  } finally {
    restoreWithoutRecords();
  }
  assert.ok(invalidRows[0].errors.some((error) => error.includes('gender')));

  const existing = createRecord();
  const { buffer } = await workbookBuffer([existing.toObject()]);
  const rows = transfer.parseWorkbook({ buffer }, false).rows;
  const restoreWithExisting = mockFamilyFind([existing]);
  try {
    await transfer.validateRows(rows);
  } finally {
    restoreWithExisting();
  }
  assert.equal(rows[0].action, 'update');
  assert.equal(rows[0].errors.length, 0);
  assert.equal(rows[0].patch['mainMember.email'], 'asha@example.com');
});

test('previews and confirms updates and additions without deleting omitted records', async () => {
  const existing = createRecord();
  const updated = createRecord();
  updated.mainMember.fullName = 'Asha Updated';
  const added = createRecord({
    submissionId: 'F-ROUNDTRIP-2',
    familyKey: 'KEY-2',
    mainMember: {
      fullName: 'New Family',
      gender: 'Male',
      maritalStatus: 'Single',
      mobileNumber: '9876543211',
      email: '',
    },
  });
  const { buffer } = await workbookBuffer([updated.toObject(), added.toObject()]);
  const stored = [existing.toObject()];
  const originalFind = Family.find;
  const originalUpdateOne = Family.updateOne;
  const originalSave = Family.prototype.save;

  Family.find = (query) => ({
    select() {
      return this;
    },
    async lean() {
      if (query.submissionId) {
        return stored.filter((record) => query.submissionId.$in.includes(record.submissionId));
      }
      if (query.familyKey) return stored.filter((record) => query.familyKey.$in.includes(record.familyKey));
      return [];
    },
  });
  Family.updateOne = async (query, update) => {
    const target = stored.find((record) => record.submissionId === query.submissionId);
    if (!target) return { matchedCount: 0 };
    Object.entries(update.$set || {}).forEach(([path, value]) => {
      const parts = path.split('.');
      const key = parts.pop();
      const parent = parts.reduce((object, part) => object[part] ||= {}, target);
      parent[key] = value;
    });
    Object.keys(update.$unset || {}).forEach((path) => {
      const parts = path.split('.');
      const key = parts.pop();
      const parent = parts.reduce((object, part) => object?.[part], target);
      if (parent) delete parent[key];
    });
    return { matchedCount: 1 };
  };
  Family.prototype.save = async function save() {
    stored.push(this.toObject());
    return this;
  };

  try {
    let previewResponse;
    const request = {
      file: { buffer, originalname: 'records.xlsx' },
      body: { clearEmptyCells: 'false' },
      admin: { _id: 'admin-test' },
    };
    await previewExcel(request, {
      status() {
        return this;
      },
      json(value) {
        previewResponse = value;
        return this;
      },
    }, (error) => {
      throw error;
    });
    assert.equal(previewResponse.data.summary.added, 1);
    assert.equal(previewResponse.data.summary.updated, 1);
    assert.equal(previewResponse.data.canConfirm, true);

    let confirmResponse;
    await confirmExcel({
      body: { previewId: previewResponse.data.previewId },
      admin: { _id: 'admin-test' },
    }, {
      json(value) {
        confirmResponse = value;
        return this;
      },
    }, (error) => {
      throw error;
    });

    assert.deepEqual(confirmResponse.data.summary, { added: 1, updated: 1, skipped: 0, failed: 0 });
    assert.equal(stored.length, 2);
    assert.equal(stored[0].mainMember.fullName, 'Asha Updated');
    assert.equal(stored[1].submissionId, 'F-ROUNDTRIP-2');
  } finally {
    Family.find = originalFind;
    Family.updateOne = originalUpdateOne;
    Family.prototype.save = originalSave;
  }
});
