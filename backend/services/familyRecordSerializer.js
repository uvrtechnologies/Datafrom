const OMITTED_FIELDS = new Set(['_id', 'id', '__v', '_displayName', '_isLegacyChild', 'familyKey']);

function fieldLabel(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function isOmitted(key) {
  return OMITTED_FIELDS.has(key) || key.startsWith('_') || /password|token|secret|api.?key/i.test(key);
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function formatStructuredValue(value, indent = 0) {
  const spacing = ' '.repeat(indent);
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date || typeof value !== 'object') return `${spacing}${displayValue(value)}`;

  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      const details = formatStructuredValue(entry, indent + 3);
      return `${spacing}${index + 1}. ${details.trimStart()}`;
    }).filter(Boolean).join('\n');
  }

  return Object.entries(value)
    .filter(([key, entry]) => !isOmitted(key) && entry !== null && entry !== undefined && entry !== '')
    .map(([key, entry]) => {
      const label = fieldLabel(key);
      if (entry && typeof entry === 'object') {
        const nested = formatStructuredValue(entry, indent + 3);
        return nested ? `${spacing}${label}:\n${nested}` : '';
      }
      return `${spacing}${label}: ${displayValue(entry)}`;
    })
    .filter(Boolean)
    .join('\n');
}

function flattenFields(value, prefix, row) {
  if (!value || typeof value !== 'object' || value instanceof Date) return;
  Object.entries(value).forEach(([key, entry]) => {
    if (isOmitted(key)) return;
    const label = `${prefix} / ${fieldLabel(key)}`;
    if (entry && typeof entry === 'object' && !(entry instanceof Date)) {
      if (Array.isArray(entry)) {
        row[label] = formatStructuredValue(entry);
      } else {
        flattenFields(entry, label, row);
      }
    } else {
      row[label] = entry ?? '';
    }
  });
}

function fullName(member) {
  return member?._displayName || member?.fullName || [member?.firstName, member?.surname].filter(Boolean).join(' ');
}

function getFamilyMembers(record) {
  return record.familyMembersLegacyMerged || record.familyMembers || [];
}

function getChildren(record, members) {
  const memberChildren = members.filter((member) => ['Son', 'Daughter'].includes(member.relation) || member._isLegacyChild);
  const legacyChildren = record.children?.list || [];
  const seen = new Set(memberChildren.map((child) => `${fullName(child).toLowerCase()}|${child.dateOfBirthOrAge || child.age || ''}|${child.gender || ''}`));
  return [
    ...memberChildren,
    ...legacyChildren.filter((child) => {
      const key = `${fullName(child).toLowerCase()}|${child.dateOfBirthOrAge || child.age || ''}|${child.gender || ''}`;
      return !seen.has(key);
    }),
  ];
}

function numberedDetails(members) {
  if (!members.length) return 'None';
  return members.map((member, index) => {
    const details = formatStructuredValue(member, 3);
    return `${index + 1}. ${details.trimStart() || fullName(member) || 'Family member'}`;
  }).join('\n\n');
}

function membersWithDetails(members, predicate) {
  return members.filter(predicate);
}

function getCompleteFamilyRecord(record) {
  const applicant = record.mainMember || {};
  const members = getFamilyMembers(record);
  const children = getChildren(record, members);
  const father = members.filter((member) => member.relation === 'Father');
  const mother = members.filter((member) => member.relation === 'Mother');
  const brothers = members.filter((member) => member.relation === 'Brother');
  const sisters = members.filter((member) => member.relation === 'Sister');
  const otherMembers = members.filter((member) => !['Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter'].includes(member.relation) && !member._isLegacyChild);
  const educationMembers = membersWithDetails(members, (member) => member.educationLevel || Object.values(member.educationDetails || {}).some(Boolean));
  const workMembers = membersWithDetails(members, (member) => member.workStatus || Object.values(member.workDetails || {}).some(Boolean) || member.jobProfession || member.companyBusinessName);
  const businessMembers = membersWithDetails(members, (member) => Object.values(member.businessDetails || {}).some(Boolean) || member.companyBusinessName);
  const row = { 'Family ID': record.submissionId || '' };

  row['Applicant Details'] = formatStructuredValue(applicant) || 'None';
  const currentAddress = formatStructuredValue(record.address?.current, 3);
  const permanentAddress = formatStructuredValue(record.address?.permanent, 3);
  row['Applicant Address'] = [
    currentAddress ? `Current Address:\n${currentAddress}` : '',
    permanentAddress ? `Permanent Address:\n${permanentAddress}` : '',
    record.address?.sameAsCurrent !== undefined ? `Same as Current: ${displayValue(record.address.sameAsCurrent)}` : '',
  ].filter(Boolean).join('\n\n') || 'None';
  row['Applicant Current Occupation'] = formatStructuredValue(record.businessWork) || 'None';
  row['Additional Information'] = formatStructuredValue(record.additionalInfo) || 'None';

  const fatherDetails = [applicant.fatherName ? `Name: ${applicant.fatherName}` : '', numberedDetails(father)].filter(Boolean).join('\n');
  const motherDetails = [applicant.motherName ? `Name: ${applicant.motherName}` : '', numberedDetails(mother)].filter(Boolean).join('\n');
  row['Father Details'] = fatherDetails || 'None';
  row['Mother Details'] = motherDetails || 'None';
  row['Brothers Details'] = numberedDetails(brothers);
  row['Sisters Details'] = numberedDetails(sisters);
  row['Children Details'] = numberedDetails(children);
  row['Other Family Members'] = numberedDetails(otherMembers);
  row['Family Members Education'] = numberedDetails(educationMembers);
  row['Family Members Work and Occupation'] = numberedDetails(workMembers);
  row['Family Members Business'] = numberedDetails(businessMembers);

  const completeDetails = [
    `FAMILY ID: ${record.submissionId || ''}`,
    `STATUS: ${record.status || ''}`,
    `SUBMITTED: ${displayValue(record.submittedAt || record.createdAt)}`,
    `\nAPPLICANT\n${formatStructuredValue(applicant) || 'None'}`,
    `\nCURRENT ADDRESS\n${formatStructuredValue(record.address?.current) || 'None'}`,
    `\nPERMANENT ADDRESS\n${formatStructuredValue(record.address?.permanent) || 'None'}`,
    `\nAPPLICANT WORK AND BUSINESS\n${formatStructuredValue(record.businessWork) || 'None'}`,
    `\nFATHER\n${row['Father Details']}`,
    `\nMOTHER\n${row['Mother Details']}`,
    `\nBROTHERS\n${row['Brothers Details']}`,
    `\nSISTERS\n${row['Sisters Details']}`,
    `\nCHILDREN\n${row['Children Details']}`,
    `\nOTHER FAMILY MEMBERS\n${row['Other Family Members']}`,
    `\nFAMILY MEMBER EDUCATION\n${row['Family Members Education']}`,
    `\nFAMILY MEMBER WORK AND OCCUPATION\n${row['Family Members Work and Occupation']}`,
    `\nFAMILY MEMBER BUSINESS\n${row['Family Members Business']}`,
    `\nADDITIONAL INFORMATION\n${formatStructuredValue(record.additionalInfo) || 'None'}`,
  ].join('\n');
  return { row, completeDetails };
}

module.exports = { getCompleteFamilyRecord };