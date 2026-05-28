const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
require('./utils/csvLoader'); // Initialize CSV on startup

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
