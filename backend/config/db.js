const mongoose = require('mongoose');
const dns = require('node:dns');

let connected = false;

async function connectDB() {
  try {
    const dnsServers = String(process.env.MONGO_DNS_SERVERS || '')
      .split(',')
      .map((server) => server.trim())
      .filter(Boolean);
    if (dnsServers.length) dns.setServers(dnsServers);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    connected = true;
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn('⚠  MongoDB connection failed — API write endpoints will return 503.');
    console.warn('   Error:', err.message);
    console.warn('   Tip: set MONGO_URI to your database URI. If Node reports querySrv ECONNREFUSED, set MONGO_DNS_SERVERS to a reachable DNS server.');
    connected = false;
  }
}

function isDBConnected() {
  return connected || mongoose.connection.readyState === 1;
}

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
