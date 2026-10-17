/**
 * Shared definition of the human-readable "Family Records" worksheet used by the
 * admin Excel download (`GET /api/admin/export/excel`).
 *
 * One worksheet, one row per registered family, the main user's columns first
 * and one column group per family member after them. The fields the download
 * must never contain are simply never read here: Name (firstName), Surname,
 * Nationality, address.sameAsCurrent, children.hasChildren, children.list,
 * submittedAt and status.
 */

const EXPORT_SHEET_NAME = 'Family Records';

const EXPORT_COLORS = {
  header: 'FF1D4ED8',
  headerText: 'FFFFFFFF',
};

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const EXPORT_BORDER = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  left: { style: 'thin', color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
  right: { style: 'thin', color: { argb: 'FF94A3B8' } },
};

// Objects/arrays are reduced to '' so a cell never prints "[object Object]" or
// raw JSON; ExcelJS only writes a real formula when a { formula } object is passed,
// so a plain string such as "=SUM(A1)" is still stored as harmless text.
function exportText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') return '';
  const text = String(value);
  return text.trim() ? text.replace(CONTROL_CHARACTERS, '') : '';
}

// Main user columns. The required columns come first in the required order, then
// the remaining main-user fields the previous report exported so no data is lost.
// businessWork.* is never split into its own columns; see Occupation Type / Detail.
//
// `path` is the database field the column was exported from.
const MAIN_COLUMNS = [
  { header: 'Full Name', path: 'mainMember.fullName', value: (record) => record.mainMember?.fullName },
  { header: 'Date of Birth', path: 'mainMember.dateOfBirth', value: (record) => record.mainMember?.dateOfBirth },
  { header: "Father's Name", path: 'mainMember.fatherName', value: (record) => record.mainMember?.fatherName },
  { header: "Mother's Name", path: 'mainMember.motherName', value: (record) => record.mainMember?.motherName },
  { header: 'Gender', path: 'mainMember.gender', value: (record) => record.mainMember?.gender },
  { header: 'Marital Status', path: 'mainMember.maritalStatus', value: (record) => record.mainMember?.maritalStatus },
  { header: 'Engagement Status', path: 'mainMember.engagementStatus', value: (record) => record.mainMember?.engagementStatus },
  { header: 'Mobile Number', path: 'mainMember.mobileNumber', value: (record) => record.mainMember?.mobileNumber },
  { header: 'WhatsApp Number', path: 'mainMember.whatsappNumber', value: (record) => record.mainMember?.whatsappNumber },
  { header: 'Email', path: 'mainMember.email', value: (record) => record.mainMember?.email },
  { header: 'Highest Education', path: 'mainMember.highestEducation', value: (record) => record.mainMember?.highestEducation },
  { header: 'Occupation Type', path: 'businessWork.occupationType', value: (record) => record.businessWork?.occupationType },
  { header: 'Occupation Detail', path: '', value: (record) => summarizeOccupationDetail(record.businessWork) },
  { header: 'Current Address', path: 'address.current.addressLine1', value: (record) => record.address?.current?.addressLine1 },
  { header: 'Current Village', path: 'address.current.village', value: (record) => record.address?.current?.village },
  { header: 'Current City', path: 'address.current.city', value: (record) => record.address?.current?.city },
  { header: 'Permanent Address', path: 'address.permanent.addressLine1', value: (record) => record.address?.permanent?.addressLine1 },
  { header: 'Permanent Village', path: 'address.permanent.village', value: (record) => record.address?.permanent?.village },
  { header: 'Permanent City', path: 'address.permanent.city', value: (record) => record.address?.permanent?.city },
  { header: 'Currently Working / Business', path: 'mainMember.isCurrentlyWorkingOrBusiness', value: (record) => record.mainMember?.isCurrentlyWorkingOrBusiness },
  { header: 'Result Type', path: 'mainMember.resultType', value: (record) => record.mainMember?.resultType },
  { header: 'Percentage', path: 'mainMember.percentage', value: (record) => record.mainMember?.percentage },
  { header: 'CGPA', path: 'mainMember.cgpa', value: (record) => record.mainMember?.cgpa },
  { header: 'Skills', path: 'additionalInfo.skills', value: (record) => record.additionalInfo?.skills },
  { header: 'Achievements', path: 'additionalInfo.achievements', value: (record) => record.additionalInfo?.achievements },
  { header: 'Professional Profile', path: 'additionalInfo.professionalProfile', value: (record) => record.additionalInfo?.professionalProfile },
  { header: 'Household Context', path: 'additionalInfo.householdContext', value: (record) => record.additionalInfo?.householdContext },
  { header: 'Remarks', path: 'additionalInfo.remarks', value: (record) => record.additionalInfo?.remarks },
  { header: 'Startup Plan', path: 'additionalInfo.startupPlan', value: (record) => record.additionalInfo?.startupPlan },
];

// The form only fills the businessWork fields that match the chosen occupation, so
// these are joined into a single readable "Occupation Detail" value instead of one
// column per businessWork.* field. Only populated fields are included.
const OCCUPATION_DETAIL_FIELDS = [
  ['businessName', 'Business Name'],
  ['businessType', 'Business Type'],
  ['industry', 'Industry'],
  ['yearsInBusiness', 'Years in Business'],
  ['businessAddress', 'Business Address'],
  ['jobTitle', 'Job Title'],
  ['employer', 'Employer / Company'],
  ['designation', 'Designation'],
  ['yearsInRole', 'Years in Role'],
  ['workAddress', 'Work Address'],
  ['profession', 'Profession'],
  ['organization', 'Organization'],
  ['yearsExperience', 'Years of Experience'],
  ['institutionName', 'Institution Name'],
  ['educationName', 'Education Name'],
  ['educationLevel', 'Education Level'],
  ['courseOrSubject', 'Course / Subject'],
  ['studyYear', 'Study Year'],
  ['lastClassOrYear', 'Last Class / Year'],
  ['studentStatus', 'Student Status'],
  ['previousOccupation', 'Previous Occupation'],
  ['retirementYear', 'Retirement Year'],
  ['otherOccupationDetails', 'Other Details'],
  ['resultType', 'Result Type'],
  ['percentage', 'Percentage'],
  ['cgpa', 'CGPA'],
];

function summarizeOccupationDetail(businessWork) {
  if (!businessWork || typeof businessWork !== 'object') return '';
  return OCCUPATION_DETAIL_FIELDS
    .map(([field, label]) => [label, exportText(businessWork[field])])
    .filter(([, value]) => value !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

// Each family member gets one column containing their populated fields, including
// details saved in nested work, business and education objects.
const MEMBER_FIELDS = [
  { header: 'Full Name', path: 'fullName', value: (m) => m.fullName },
  { header: 'Relationship', path: 'relation', value: (m) => m.relation },
  { header: 'Other Relationship', path: 'otherRelationship', value: (m) => m.otherRelationship },
  { header: 'Date of Birth / Age', path: 'dateOfBirthOrAge', value: (m) => m.dateOfBirthOrAge },
  { header: 'Gender', path: 'gender', value: (m) => m.gender },
  { header: 'Marital Status', path: 'maritalStatus', value: (m) => m.maritalStatus },
  { header: 'Engagement Status', path: 'engagementStatus', value: (m) => m.engagementStatus },
  { header: 'Mobile Number', path: 'mobileNumber', value: (m) => m.mobileNumber },
  { header: 'Work Status', path: 'workStatus', value: (m) => m.workStatus },
  { header: 'Other Status', path: 'otherStatus', value: (m) => m.otherStatus },
  { header: 'Occupation', path: 'workDetails.occupation', value: (m) => m.workDetails?.occupation },
  { header: 'Job Profession', path: 'jobProfession', value: (m) => m.jobProfession },
  { header: 'Organization', path: 'workDetails.organization', value: (m) => m.workDetails?.organization },
  { header: 'Designation', path: 'workDetails.designation', value: (m) => m.workDetails?.designation },
  { header: 'Other Designation', path: 'designation', value: (m) => m.designation },
  { header: 'Work Details', path: 'workDetails.otherDetails', value: (m) => m.workDetails?.otherDetails },
  { header: 'Business Name', path: 'businessDetails.businessName', value: (m) => m.businessDetails?.businessName },
  { header: 'Company / Business Name', path: 'companyBusinessName', value: (m) => m.companyBusinessName },
  { header: 'Business Type', path: 'businessDetails.businessType', value: (m) => m.businessDetails?.businessType },
  { header: 'Business Details', path: 'businessDetails.otherDetails', value: (m) => m.businessDetails?.otherDetails },
  { header: 'Institution Name', path: 'educationDetails.instituteName', value: (m) => m.educationDetails?.instituteName },
  { header: 'Education Level', path: 'educationDetails.educationLevel', value: (m) => m.educationDetails?.educationLevel },
  { header: 'Other Education Level', path: 'educationLevel', value: (m) => m.educationLevel },
  { header: 'Class / Year', path: 'educationDetails.classOrYear', value: (m) => m.educationDetails?.classOrYear },
  { header: 'Stream / Subject', path: 'educationDetails.streamOrSubject', value: (m) => m.educationDetails?.streamOrSubject },
  { header: 'Course / Degree', path: 'educationDetails.courseOrDegree', value: (m) => m.educationDetails?.courseOrDegree },
  { header: 'Other Subject / Course', path: 'educationDetails.otherSubjectOrCourse', value: (m) => m.educationDetails?.otherSubjectOrCourse },
  { header: 'Education Name', path: 'educationDetails.educationName', value: (m) => m.educationDetails?.educationName },
  { header: 'Education Status', path: 'educationDetails.educationStatus', value: (m) => m.educationDetails?.educationStatus },
  { header: 'Result Type', path: 'educationDetails.resultType', value: (m) => m.educationDetails?.resultType },
  { header: 'Percentage', path: 'educationDetails.percentage', value: (m) => m.educationDetails?.percentage },
  { header: 'CGPA', path: 'educationDetails.cgpa', value: (m) => m.educationDetails?.cgpa },
  { header: 'Annual Income', path: 'annualIncome', value: (m) => m.annualIncome },
  { header: 'Achievements', path: 'achievements', value: (m) => m.achievements },
  { header: 'Additional Remarks', path: 'additionalRemarks', value: (m) => m.additionalRemarks },
  { header: 'Startup Plan', path: 'startupPlan', value: (m) => m.startupPlan },
];

// Only family members submitted in the form are exported; children.list is excluded.
function familyMembersOf(record) {
  const members = record.familyMembers;
  return Array.isArray(members) ? members : [];
}

function summarizeFamilyMember(member) {
  return MEMBER_FIELDS
    .map((field) => [field.header, exportText(field.value(member))])
    .filter(([, value]) => value !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

// The largest number of stored family members on any exported record decides how many
// member column groups the sheet gets, so every member fits without its own sheet.
function maxFamilyMemberCount(records) {
  return records.reduce((max, record) => Math.max(max, familyMembersOf(record).length), 0);
}

// The main user's columns come first, followed by populated fields for each actual
// family-member position. All of a member's populated details share one column.
function buildExportColumnsForCount(memberCount) {
  const columns = MAIN_COLUMNS.map((column) => ({ ...column }));
  for (let index = 0; index < memberCount; index += 1) {
    columns.push({
      header: `Family Member ${index + 1} Details`,
      value: (record) => {
        const member = familyMembersOf(record)[index];
        return member ? summarizeFamilyMember(member) : '';
      },
    });
  }
  return columns;
}

function buildExportColumns(records) {
  return buildExportColumnsForCount(maxFamilyMemberCount(records));
}

// Wide enough for the header text, clamped so long labels stay readable and short ones
// do not hog the sheet. Long values wrap inside the cell.
function exportColumnWidth(header) {
  return Math.min(Math.max(String(header).length + 2, 14), 34);
}

/**
 * The "Family Records" worksheet shell (frozen header, autofilter, print setup).
 * Split out from the row writing so a streaming writer can build the sheet
 * header first, then commit one row at a time instead of buffering every row.
 */
function createFamilyWorksheet(workbook, { columnCount = MAIN_COLUMNS.length } = {}) {
  const worksheet = workbook.addWorksheet(EXPORT_SHEET_NAME, {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { fitToPage: true },
  });
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: Math.max(columnCount, 1) },
  };
  worksheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  return worksheet;
}

function writeFamilyHeader(worksheet, columns) {
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, size: 11, color: { argb: EXPORT_COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_COLORS.header } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = EXPORT_BORDER;
  });
  if (typeof headerRow.commit === 'function') headerRow.commit();
  return headerRow;
}

function writeFamilyRow(worksheet, columns, record) {
  const row = worksheet.addRow(columns.map((column) => exportText(column.value(record))));
  columns.forEach((_, index) => {
    const cell = row.getCell(index + 1);
    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    cell.border = EXPORT_BORDER;
    cell.numFmt = '@';
  });
  return row;
}

function applyFamilyColumnWidths(worksheet, columns) {
  columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = exportColumnWidth(column.header);
  });
}

// A single flat worksheet: one header row, then one row per registered family record.
// The main user's columns come first and each family member is a group of columns after
// them, so the same worksheet holds every family with no duplicate records.
function buildFamilyDetailsWorksheet(workbook, records) {
  const columns = buildExportColumns(records);
  const worksheet = createFamilyWorksheet(workbook, { columnCount: columns.length });

  writeFamilyHeader(worksheet, columns);
  records.forEach((record) => {
    writeFamilyRow(worksheet, columns, record);
  });
  applyFamilyColumnWidths(worksheet, columns);

  return worksheet;
}

module.exports = {
  EXPORT_SHEET_NAME,
  exportText,
  MAIN_COLUMNS,
  MEMBER_FIELDS,
  summarizeOccupationDetail,
  summarizeFamilyMember,
  familyMembersOf,
  maxFamilyMemberCount,
  buildExportColumns,
  buildExportColumnsForCount,
  exportColumnWidth,
  createFamilyWorksheet,
  writeFamilyHeader,
  writeFamilyRow,
  applyFamilyColumnWidths,
  buildFamilyDetailsWorksheet,
};
