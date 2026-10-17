const mongoose = require('mongoose');
const dns = require('node:dns');
const removeLegacyMobileNumberIndex = require('../services/removeLegacyMobileNumberIndex');

let connected = false;

async function connectDB() {
  let conn;
  try {
    const dnsServers = String(process.env.MONGO_DNS_SERVERS || '')
      .split(',')
      .map((server) => server.trim())
      .filter(Boolean);
    if (dnsServers.length) dns.setServers(dnsServers);

    conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
  } catch (err) {
    console.warn('⚠  MongoDB connection failed — API write endpoints will return 503.');
    console.warn('   Error:', err.message);
    console.warn('   Tip: check MONGO_URI. For querySrv ETIMEOUT or ECONNREFUSED errors, set MONGO_DNS_SERVERS to reachable DNS server IPs, e.g. 1.1.1.1,8.8.8.8.');
    connected = false;
    return;
  }

  connected = true;
  console.log(`MongoDB connected: ${conn.connection.host}`);

  const Family = require('../models/Family');
  await removeLegacyMobileNumberIndex(Family.collection, conn.connection.db);
}

function isDBConnected() {
  return connected || mongoose.connection.readyState === 1;
}

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
