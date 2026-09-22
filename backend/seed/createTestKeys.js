require('dotenv').config();
const connectDB = require('../config/db');
const FamilyKey = require('../models/FamilyKey');
const { generateFamilyKey } = require('../utils/generateKey');
const mongoose = require('mongoose');

(async () => {
  await connectDB();

  const count = parseInt(process.argv[2] || '5', 10);
  const keys = [];
  for (let i = 0; i < count; i++) {
    const familyKey = generateFamilyKey();
    keys.push({ familyKey, status: 'UNUSED' });
    console.log(`Created Family Key: ${familyKey}`);
  }

  await FamilyKey.insertMany(keys, { ordered: false }).catch((e) => {
    if (e.code !== 11000) throw e;
  });

  console.log(`\n${count} Family Key(s) inserted. Use the top one above to test the form.`);

  await mongoose.disconnect();
  process.exit(0);
})();
