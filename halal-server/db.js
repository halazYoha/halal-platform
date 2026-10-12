// db.js - SQLite database initialization and schemas
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'halal.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance REAL DEFAULT 0.0,
      role TEXT DEFAULT 'user',
      invite_code TEXT UNIQUE NOT NULL,
      referred_by TEXT,
      telebirr_account TEXT,
      bank_name TEXT,
      bank_account TEXT,
      has_deposited INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tier_level INTEGER NOT NULL,
      price REAL NOT NULL,
      daily_income REAL NOT NULL,
      total_income REAL NOT NULL,
      validity_days INTEGER NOT NULL,
      image TEXT,
      category TEXT DEFAULT 'Fabrication Unit',
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      daily_income REAL NOT NULL,
      validity_days INTEGER NOT NULL,
      total_earned REAL DEFAULT 0.0,
      days_claimed INTEGER DEFAULT 0,
      last_claimed_at DATETIME,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      transaction_id TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      raw_message TEXT,
      status TEXT DEFAULT 'pending',
      verification_type TEXT DEFAULT 'admin',
      reviewed_by TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_name TEXT,
      amount REAL NOT NULL,
      fee REAL DEFAULT 0.0,
      final_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_tx_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS incoming_sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_phone TEXT,
      transaction_id TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      provider TEXT NOT NULL,
      raw_sms TEXT,
      claimed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beneficiary_id INTEGER NOT NULL,
      from_user_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      order_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beneficiary_id) REFERENCES users(id),
      FOREIGN KEY (from_user_id) REFERENCES users(id)
    );
  `);

  // Add has_deposited column if it doesn't exist (migration)
  try {
    db.exec('ALTER TABLE users ADD COLUMN has_deposited INTEGER DEFAULT 0');
  } catch (e) {
    // Column already exists, ignore
  }

  // Seed Default Products if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, tier_level, price, daily_income, total_income, validity_days, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run('VIP1 Halal Core', 1, 800, 200, 18000, 90, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60');
    insertProduct.run('VIP2 Halal Prime', 2, 1500, 375, 33750, 90, 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop&q=60');
    insertProduct.run('VIP3 Halal Industrial', 3, 3000, 750, 67500, 90, 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60');
    insertProduct.run('VIP4 Halal Pro Master', 4, 5000, 1250, 112500, 90, 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&auto=format&fit=crop&q=60');
    insertProduct.run('VIP5 Halal Enterprise', 5, 10000, 2500, 225000, 90, 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&auto=format&fit=crop&q=60');
    insertProduct.run('VIP6 Halal Supreme', 6, 20000, 5000, 450000, 90, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60');
  }

  // Seed Admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE phone = ?').get('admin');
  if (!adminExists) {
    const hashed = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (phone, password, balance, role, invite_code, has_deposited)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', hashed, 999999, 'admin', 'HALALADMIN', 1);
  }
}

initDb();

module.exports = db;
