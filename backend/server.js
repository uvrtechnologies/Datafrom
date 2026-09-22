require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const { isDBConnected } = require('./config/db');
const familyRoutes = require('./routes/familyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_ORIGIN'];
  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('replace_this')) {
    throw new Error('JWT_SECRET must be a unique value of at least 32 characters in production.');
  }
  if (process.env.CLIENT_ORIGIN.split(',').some((origin) => origin.trim().includes('localhost'))) {
    throw new Error('CLIENT_ORIGIN must contain deployed frontend origins in production.');
  }
}

validateProductionConfig();
connectDB();

const app = express();
app.disable('x-powered-by');

// Security & parsing middleware
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(mongoSanitize()); // strips $ and . operators from user input (NoSQL injection guard)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.get('/api/health', (req, res) => res.json({
  success: true,
  message: 'API is running',
  database: isDBConnected() ? 'connected' : 'disconnected (UI-only mode — set MONGO_URI to enable persistence)',
}));

app.use('/api/family', (req, res, next) => {
  if (!isDBConnected() && req.method !== 'GET') {
    return res.status(503).json({ success: false, message: 'Database not connected. Set MONGO_URI in server/.env to enable submissions.' });
  }
  next();
}, familyRoutes);
app.use('/api/admin', (req, res, next) => {
  if (!isDBConnected() && req.method !== 'GET') {
    return res.status(503).json({ success: false, message: 'Database not connected. Set MONGO_URI in server/.env to enable admin actions.' });
  }
  if (!isDBConnected() && req.method === 'GET' && req.path !== '/login') {
    return res.status(503).json({ success: false, message: 'Database not connected. Set MONGO_URI in server/.env to enable admin features.' });
  }
  next();
}, adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Server running on ${HOST}:${PORT}`));
