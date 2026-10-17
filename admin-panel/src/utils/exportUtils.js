import Papa from 'papaparse';

const COLUMNS = [
  { key: 'submissionId', label: 'Submission ID' },
  { key: 'familyKey', label: 'Family Key' },
  { key: 'mainMemberName', label: 'Main Member' },
  { key: 'mobileNumber', label: 'Mobile' },
  { key: 'villageCity', label: 'Village/City' },
  { key: 'numberOfFamilyMembers', label: 'Members' },
  { key: 'numberOfBusinesses', label: 'Businesses' },
  { key: 'submissionDate', label: 'Submitted' },
  { key: 'status', label: 'Status' },
];

function toRows(records) {
  return records.map((r) =>
    COLUMNS.reduce((acc, c) => {
      acc[c.label] = c.key === 'submissionDate' ? new Date(r[c.key]).toLocaleString() : r[c.key];
      return acc;
    }, {})
  );
}

export function exportToCSV(records, filename = 'families.csv') {
  const rows = toRows(records);
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
