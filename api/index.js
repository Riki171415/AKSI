const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
require('./utils/csvLoader'); // Initialize CSV on startup

const app = express();
const PORT = process.env.PORT || 5000;

// Allow requests from the Vercel frontend
const allowedOrigins = [
  'https://aksi-bice.vercel.app',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Always listen - Railway keeps the server running
app.listen(PORT, () => {
  console.log(`AKSI API Server is running on port ${PORT}`);
});

module.exports = app;
