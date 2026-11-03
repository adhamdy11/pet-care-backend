require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initDb } = require('./database/db');
const securityHeaders = require('./middleware/securityHeaders');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const petRoutes = require('./routes/petRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const recordRoutes = require('./routes/recordRoutes');
const reminderRoutes = require('./routes/reminderRoutes');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and set a long random value.');
  process.exit(1);
}

const app = express();

app.disable('x-powered-by');
app.use(securityHeaders);

// Only the frontend origin in CLIENT_ORIGIN may call the API from a browser.
// If it is not set, cross-origin browser requests are not allowed at all.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || false, credentials: true }));

app.use(express.json({ limit: '10kb' }));

// In Express 5, req.body is undefined when no JSON body was sent.
app.use((req, res, next) => {
  if (!req.body) req.body = {};
  next();
});

app.get('/', (req, res) => {
  res.json({ message: 'Pet Care Backend is running' });
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/pets', petRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/records', recordRoutes);
app.use('/reminders', reminderRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Express 5 sends errors thrown in async handlers here. The real error is logged
// on the server, but the client only gets a generic message.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Could not set up the database:', err);
    process.exit(1);
  });
