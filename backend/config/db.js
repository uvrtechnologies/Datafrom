const mongoose = require('mongoose');

let connected = false;

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    connected = true;
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn('⚠  MongoDB connection failed — API write endpoints will return 503.');
    console.warn('   Error:', err.message);
    console.warn('   Tip: set MONGO_URI in server/.env to a MongoDB Atlas URI to enable full functionality.');
    connected = false;
  }
}

function isDBConnected() {
  return connected || mongoose.connection.readyState === 1;
}

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
