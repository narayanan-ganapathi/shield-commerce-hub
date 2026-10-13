const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'shield_admin',
  password: process.env.DB_PASSWORD || 'vault_secret_password',
  database: process.env.DB_NAME || 'shield_storefront',
  port: 5432,
  max: 10, // Enterprise constraint: cap active connections to prevent DB starvation
  idleTimeoutMillis: 30000
});

app.get('/api/v1/health', async (req, res) => {
  res.json({ status: 'HEALTHY', timestamp: new Date() });
});

app.get('/api/v1/products', async (req, res) => {
  try {
    const queryText = `
      SELECT p.id, p.name, p.description, p.price, COALESCE(i.available_stock, 0) as stock
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ORDER BY p.id ASC;
    `;
    const { rows } = await pool.query(queryText);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database query execution failure' });
  }
});
app.post('/api/v1/checkout', async (req, res) => {
  const { customer_email, items } = req.body; // Expecting items: [{ id: 1, qty: 2 }]

  if (!customer_email || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Malformed checkout payload structure' });
  }

  // Scaffolding log to verify data capture
  console.log(`Processing sandbox checkout request for: ${customer_email}`);
  res.status(202).json({ success: true, message: 'Payload received for validation processing' });
});

app.post('/api/v1/checkout', async (req, res) => {
  const { customer_email, items } = req.body;
  const client = await pool.connect(); // Acquire dedicated client for transaction block

  try {
    await client.query('BEGIN'); // Start atomic block
    let totalAmount = 0;

    for (const item of items) {
      // 1. Fetch live stock and lock row to prevent concurrent race conditions
      const stockCheck = await client.query(
        'SELECT available_stock FROM inventory WHERE product_id = \$1 FOR UPDATE;', [item.id]
      );

      if (stockCheck.rows.length === 0 || stockCheck.rows[0].available_stock < item.qty) {
        throw new Error(`Insufficient stock for Product ID: ${item.id}`);
      }

      // 2. Fetch price server-side (never trust pricing arrays sent by client browsers)
      const priceCheck = await client.query('SELECT price FROM products WHERE id = \$1;', [item.id]);
      totalAmount += parseFloat(priceCheck.rows[0].price) * item.qty;

      // 3. Decrement Inventory
      await client.query(
        'UPDATE inventory SET available_stock = available_stock - \$1 WHERE product_id = \$2;',
        [item.qty, item.id]
      );
    }

    // 4. Log the immutable order artifact
    await client.query(
      'INSERT INTO orders (customer_email, total_amount, order_status) VALUES (\$1, \$2, \$3);',
      [customer_email, totalAmount, 'SUCCESS']
    );

    await client.query('COMMIT'); // Commit all operations permanently to disk
    res.json({ success: true, message: 'Order processed successfully', total: totalAmount });
  } catch (error) {
    await client.query('ROLLBACK'); // Undo all variations if any step throws an error
    res.status(400).json({ success: false, error: error.message });
  } finally {
    client.release(); // Return the client database connection back to the pool
  }
});


app.listen(3000, () => console.log('Gateway active on port 3000'));
