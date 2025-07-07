const express = require('express');
const { sql, getPool } = require('./conn'); // your connection file
const app = express();
const port = 3001;

app.use(express.json());

// Simple test endpoint
app.get('/api/test-connection', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM LOGIN');
    res.json({ success: true, result: result.recordset });
  } catch (err) {
    console.error('Connection error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
