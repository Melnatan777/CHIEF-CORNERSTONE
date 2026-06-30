const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// ── CLIENTS ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT DEFAULT 'TX',
    zip TEXT,
    service_type TEXT,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── EMPLOYEES ─────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    email TEXT,
    hourly_rate REAL DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── EXPENSES ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── JOBS ──────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    title TEXT NOT NULL,
    service_type TEXT,
    status TEXT DEFAULT 'Scheduled',
    scheduled_date TEXT,
    completed_date TEXT,
    price REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── GALLERY ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    service_type TEXT,
    description TEXT,
    image_url TEXT,
    published INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── CONTACT REQUESTS ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS contact_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    email TEXT,
    zip TEXT,
    service TEXT,
    message TEXT,
    status TEXT DEFAULT 'New',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── CUSTOMER MESSAGES ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS customer_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Unread',
    replied_at TEXT,
    reply_text TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── EMPLOYEE MESSAGES ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS employee_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_name TEXT,
    employee_id INTEGER,
    subject TEXT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'General',
    status TEXT DEFAULT 'Unread',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── SETTINGS ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// Default settings
const defaults = [
  ['business_name', 'Chief Cornerstone Landscaping'],
  ['business_phone', ''],
  ['business_email', ''],
  ['business_address', ''],
  ['business_zip', ''],
];
for (const [key, value] of defaults) {
  const exists = db.prepare('SELECT key FROM settings WHERE key=?').get(key);
  if (!exists) db.prepare('INSERT INTO settings (key,value) VALUES (?,?)').run(key, value);
}

module.exports = db;
