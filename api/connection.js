const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'f1berdata',
  server: '103.98.63.67',
  port: 1433,
  database: 'THE_SPOT',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool;

async function getPool() {
  if (pool) {
    // If pool already connected or connecting, just return it
    if (pool.connected || pool.connecting) {
      return pool;
    }
    // Otherwise reconnect
    await pool.connect();
    return pool;
  }

  pool = new sql.ConnectionPool(config);
  pool.on('error', err => {
    console.error('SQL pool error', err);
  });

  await pool.connect();
  return pool;
}

module.exports = {
  sql,
  getPool,
};
