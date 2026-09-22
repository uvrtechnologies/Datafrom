const { customAlphabet } = require('nanoid');

// Unambiguous alphabet (no 0/O, 1/I) for keys people may need to type/read aloud.
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nano = customAlphabet(alphabet, 5);

function generateFamilyKey() {
  const year = new Date().getFullYear();
  return `FAM-${year}-${nano()}`;
}

function generateSubmissionId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = customAlphabet(alphabet, 4)();
  return `SUB-${stamp}-${rand}`;
}

module.exports = { generateFamilyKey, generateSubmissionId };
