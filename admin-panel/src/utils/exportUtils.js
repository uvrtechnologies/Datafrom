import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export function exportToExcel(records, filename = 'families.xlsx') {
  const rows = toRows(records);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Families');
  XLSX.writeFile(workbook, filename);
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

export function exportToPDF(records, filename = 'families.pdf') {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Family & Business Submissions', 14, 15);
  autoTable(doc, {
    startY: 20,
    head: [COLUMNS.map((c) => c.label)],
    body: records.map((r) =>
      COLUMNS.map((c) => (c.key === 'submissionDate' ? new Date(r[c.key]).toLocaleDateString() : r[c.key]))
    ),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(filename);
}
