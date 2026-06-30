require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'admin/layout');
app.set('layout extractScripts', true);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'chief-cornerstone-secret',
  resave: false,
  saveUninitialized: false,
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin/login');
}

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.render('home', { layout: false }));
app.get('/services', (req, res) => res.render('services', { layout: false }));
app.get('/services/lawn-maintenance', (req, res) => res.render('services/lawn-maintenance', { layout: false }));
app.get('/services/landscape-design', (req, res) => res.render('services/landscape-design', { layout: false }));
app.get('/services/tree-trimming', (req, res) => res.render('services/tree-trimming', { layout: false }));
app.get('/services/irrigation', (req, res) => res.render('services/irrigation', { layout: false }));
app.get('/services/hardscaping', (req, res) => res.render('services/hardscaping', { layout: false }));
app.get('/services/seasonal-cleanup', (req, res) => res.render('services/seasonal-cleanup', { layout: false }));
app.get('/about', (req, res) => res.render('about', { layout: false }));
app.get('/gallery', (req, res) => {
  const galleryItems = db.prepare('SELECT * FROM gallery WHERE published=1 ORDER BY sort_order ASC, created_at DESC').all();
  res.render('gallery', { layout: false, galleryItems });
});
app.get('/contact', (req, res) => res.render('contact', { layout: false, sent: !!req.query.sent }));

app.get('/testimonials', (req, res) => res.render('testimonials', { layout: false }));
app.get('/faq', (req, res) => res.render('faq', { layout: false }));
app.get('/service-area', (req, res) => res.render('service-area', { layout: false }));
app.get('/blog', (req, res) => res.render('blog', { layout: false }));
app.get('/privacy', (req, res) => res.render('legal/privacy', { layout: false }));
app.get('/terms', (req, res) => res.render('legal/terms', { layout: false }));

app.post('/contact', (req, res) => {
  const { name, phone, email, zip, service, message } = req.body;
  db.prepare('INSERT INTO contact_requests (name,phone,email,zip,service,message) VALUES (?,?,?,?,?,?)')
    .run(name||null, phone||null, email||null, zip||null, service||null, message||null);
  res.redirect('/contact?sent=1');
});

// ── ADMIN AUTH ────────────────────────────────────────────────────────────────

app.get('/admin/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === (process.env.ADMIN_USER || 'admin') &&
      password === (process.env.ADMIN_PASS || 'changeme')) {
    req.session.admin = true;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: 'Incorrect username or password.' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────

app.get('/admin', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];

  const clientCount = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
  const employeeCount = db.prepare("SELECT COUNT(*) as c FROM employees WHERE status='Active'").get().c;
  const jobCount = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status='Scheduled'").get().c;
  const revenue = db.prepare("SELECT SUM(price) as t FROM jobs WHERE status='Completed'").get().t || 0;

  const todayJobs = db.prepare(`SELECT jobs.*, clients.name as client_name FROM jobs LEFT JOIN clients ON jobs.client_id=clients.id WHERE jobs.scheduled_date=? ORDER BY jobs.created_at ASC`).all(today);
  const tomorrowJobs = db.prepare(`SELECT jobs.*, clients.name as client_name FROM jobs LEFT JOIN clients ON jobs.client_id=clients.id WHERE jobs.scheduled_date=? ORDER BY jobs.created_at ASC`).all(tomorrow);
  const weekJobs = db.prepare(`SELECT jobs.*, clients.name as client_name FROM jobs LEFT JOIN clients ON jobs.client_id=clients.id WHERE jobs.scheduled_date > ? AND jobs.scheduled_date <= ? ORDER BY jobs.scheduled_date ASC`).all(tomorrow, weekEnd);
  const recentLeads = db.prepare('SELECT * FROM contact_requests ORDER BY created_at DESC LIMIT 5').all();
  const newLeads = db.prepare('SELECT COUNT(*) as c FROM contact_requests').get().c;

  res.render('admin/dashboard', { clientCount, employeeCount, jobCount, revenue, todayJobs, tomorrowJobs, weekJobs, recentLeads, newLeads, today, tomorrow });
});

// ── CLIENTS ───────────────────────────────────────────────────────────────────

app.get('/admin/clients', requireAuth, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY name ASC').all();
  res.render('admin/clients', { clients, saved: !!req.query.saved });
});

app.post('/admin/clients/save', requireAuth, (req, res) => {
  const { id, name, email, phone, address, city, state, zip, service_type, status, notes } = req.body;
  if (id) {
    db.prepare('UPDATE clients SET name=?,email=?,phone=?,address=?,city=?,state=?,zip=?,service_type=?,status=?,notes=? WHERE id=?')
      .run(name, email||null, phone||null, address||null, city||null, state||'TX', zip||null, service_type||null, status||'Active', notes||null, id);
  } else {
    db.prepare('INSERT INTO clients (name,email,phone,address,city,state,zip,service_type,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(name, email||null, phone||null, address||null, city||null, state||'TX', zip||null, service_type||null, status||'Active', notes||null);
  }
  res.redirect('/admin/clients?saved=1');
});

app.post('/admin/clients/delete/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id);
  res.redirect('/admin/clients');
});

// ── EMPLOYEES ─────────────────────────────────────────────────────────────────

app.get('/admin/employees', requireAuth, (req, res) => {
  const employees = db.prepare('SELECT * FROM employees ORDER BY name ASC').all();
  res.render('admin/employees', { employees, saved: !!req.query.saved });
});

app.post('/admin/employees/save', requireAuth, (req, res) => {
  const { id, name, role, phone, email, hourly_rate, status } = req.body;
  if (id) {
    db.prepare('UPDATE employees SET name=?,role=?,phone=?,email=?,hourly_rate=?,status=? WHERE id=?')
      .run(name, role||null, phone||null, email||null, hourly_rate||0, status||'Active', id);
  } else {
    db.prepare('INSERT INTO employees (name,role,phone,email,hourly_rate,status) VALUES (?,?,?,?,?,?)')
      .run(name, role||null, phone||null, email||null, hourly_rate||0, status||'Active');
  }
  res.redirect('/admin/employees?saved=1');
});

app.post('/admin/employees/delete/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM employees WHERE id=?').run(req.params.id);
  res.redirect('/admin/employees');
});

// ── EXPENSES ──────────────────────────────────────────────────────────────────

app.get('/admin/expenses', requireAuth, (req, res) => {
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC').all();
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  res.render('admin/expenses', { expenses, total, saved: !!req.query.saved });
});

app.post('/admin/expenses/save', requireAuth, (req, res) => {
  const { id, category, description, amount, date } = req.body;
  if (id) {
    db.prepare('UPDATE expenses SET category=?,description=?,amount=?,date=? WHERE id=?')
      .run(category, description||null, amount||0, date||null, id);
  } else {
    db.prepare('INSERT INTO expenses (category,description,amount,date) VALUES (?,?,?,?)')
      .run(category, description||null, amount||0, date||null);
  }
  res.redirect('/admin/expenses?saved=1');
});

app.post('/admin/expenses/delete/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id=?').run(req.params.id);
  res.redirect('/admin/expenses');
});

// ── JOBS ──────────────────────────────────────────────────────────────────────

app.get('/admin/jobs', requireAuth, (req, res) => {
  const jobs = db.prepare('SELECT jobs.*, clients.name as client_name FROM jobs LEFT JOIN clients ON jobs.client_id=clients.id ORDER BY scheduled_date DESC').all();
  const clients = db.prepare('SELECT * FROM clients ORDER BY name ASC').all();
  res.render('admin/jobs', { jobs, clients, saved: !!req.query.saved });
});

app.post('/admin/jobs/save', requireAuth, (req, res) => {
  const { id, client_id, title, service_type, status, scheduled_date, completed_date, price, notes } = req.body;
  if (id) {
    db.prepare('UPDATE jobs SET client_id=?,title=?,service_type=?,status=?,scheduled_date=?,completed_date=?,price=?,notes=? WHERE id=?')
      .run(client_id||null, title, service_type||null, status||'Scheduled', scheduled_date||null, completed_date||null, price||0, notes||null, id);
  } else {
    db.prepare('INSERT INTO jobs (client_id,title,service_type,status,scheduled_date,completed_date,price,notes) VALUES (?,?,?,?,?,?,?,?)')
      .run(client_id||null, title, service_type||null, status||'Scheduled', scheduled_date||null, completed_date||null, price||0, notes||null);
  }
  res.redirect('/admin/jobs?saved=1');
});

app.post('/admin/jobs/delete/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM jobs WHERE id=?').run(req.params.id);
  res.redirect('/admin/jobs');
});

// ── FINANCIALS ────────────────────────────────────────────────────────────────

app.get('/admin/financials/overview', requireAuth, (req, res) => {
  const jobs = db.prepare('SELECT * FROM jobs ORDER BY scheduled_date DESC').all();
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  const employees = db.prepare("SELECT * FROM employees WHERE status='Active'").all();
  res.render('admin/financials-overview', { jobs, expenses, employees });
});

app.get('/admin/financials/payroll', requireAuth, (req, res) => {
  const employees = db.prepare('SELECT * FROM employees ORDER BY name ASC').all();
  const expenses = db.prepare("SELECT * FROM expenses WHERE category='Labor' ORDER BY date DESC").all();
  res.render('admin/financials-payroll', { employees, expenses, saved: !!req.query.saved });
});

app.get('/admin/financials/overhead', requireAuth, (req, res) => {
  const expenses = db.prepare("SELECT * FROM expenses ORDER BY date DESC").all();
  const overhead = expenses.filter(e => ['Overhead','Insurance','Vehicle','Equipment','Marketing'].includes(e.category));
  res.render('admin/financials-overhead', { expenses, overhead, saved: !!req.query.saved });
});

app.get('/admin/financials/taxes', requireAuth, (req, res) => {
  const jobs = db.prepare("SELECT * FROM jobs WHERE status='Completed' ORDER BY scheduled_date DESC").all();
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  res.render('admin/financials-taxes', { jobs, expenses });
});

// ── GALLERY ───────────────────────────────────────────────────────────────────

app.get('/admin/gallery', requireAuth, (req, res) => {
  const items = db.prepare('SELECT * FROM gallery ORDER BY sort_order ASC, created_at DESC').all();
  res.render('admin/gallery', { items, saved: !!req.query.saved });
});

app.post('/admin/gallery/save', requireAuth, (req, res) => {
  const { id, title, service_type, description, image_url, published } = req.body;
  if (id) {
    db.prepare('UPDATE gallery SET title=?,service_type=?,description=?,image_url=?,published=? WHERE id=?')
      .run(title, service_type||null, description||null, image_url||null, published?1:0, id);
  } else {
    db.prepare('INSERT INTO gallery (title,service_type,description,image_url,published) VALUES (?,?,?,?,?)')
      .run(title, service_type||null, description||null, image_url||null, published?1:0);
  }
  res.redirect('/admin/gallery?saved=1');
});

app.post('/admin/gallery/delete/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM gallery WHERE id=?').run(req.params.id);
  res.redirect('/admin/gallery');
});

// ── CONTACT REQUESTS ──────────────────────────────────────────────────────────

app.get('/admin/leads', requireAuth, (req, res) => {
  const leads = db.prepare('SELECT * FROM contact_requests ORDER BY created_at DESC').all();
  res.render('admin/leads', { leads });
});

app.post('/admin/leads/delete/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM contact_requests WHERE id=?').run(req.params.id);
  res.redirect('/admin/leads');
});

// ── CUSTOMER INBOX ────────────────────────────────────────────────────────────

app.get('/admin/inbox/customers', requireAuth, (req, res) => {
  const messages = db.prepare('SELECT * FROM customer_messages ORDER BY created_at DESC').all();
  const unread = messages.filter(m => m.status === 'Unread').length;
  res.render('admin/inbox-customers', { messages, unread, saved: !!req.query.saved });
});

app.post('/admin/inbox/customers/save', requireAuth, (req, res) => {
  const { client_name, client_email, client_phone, subject, message } = req.body;
  db.prepare('INSERT INTO customer_messages (client_name,client_email,client_phone,subject,message) VALUES (?,?,?,?,?)')
    .run(client_name||null, client_email||null, client_phone||null, subject||null, message);
  res.redirect('/admin/inbox/customers?saved=1');
});

app.post('/admin/inbox/customers/read/:id', requireAuth, (req, res) => {
  db.prepare("UPDATE customer_messages SET status='Read' WHERE id=?").run(req.params.id);
  res.redirect('/admin/inbox/customers');
});

app.post('/admin/inbox/customers/delete/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM customer_messages WHERE id=?').run(req.params.id);
  res.redirect('/admin/inbox/customers');
});

// ── EMPLOYEE INBOX ────────────────────────────────────────────────────────────

app.get('/admin/inbox/employees', requireAuth, (req, res) => {
  const messages = db.prepare('SELECT * FROM employee_messages ORDER BY created_at DESC').all();
  const employees = db.prepare("SELECT * FROM employees WHERE status='Active' ORDER BY name ASC").all();
  const unread = messages.filter(m => m.status === 'Unread').length;
  res.render('admin/inbox-employees', { messages, employees, unread, saved: !!req.query.saved });
});

app.post('/admin/inbox/employees/save', requireAuth, (req, res) => {
  const { employee_name, employee_id, subject, message, type } = req.body;
  db.prepare('INSERT INTO employee_messages (employee_name,employee_id,subject,message,type) VALUES (?,?,?,?,?)')
    .run(employee_name||null, employee_id||null, subject||null, message, type||'General');
  res.redirect('/admin/inbox/employees?saved=1');
});

app.post('/admin/inbox/employees/read/:id', requireAuth, (req, res) => {
  db.prepare("UPDATE employee_messages SET status='Read' WHERE id=?").run(req.params.id);
  res.redirect('/admin/inbox/employees');
});

app.post('/admin/inbox/employees/delete/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM employee_messages WHERE id=?').run(req.params.id);
  res.redirect('/admin/inbox/employees');
});

// ── ANALYTICS ────────────────────────────────────────────────────────────────

app.get('/admin/analytics', requireAuth, (req, res) => {
  const jobs = db.prepare('SELECT * FROM jobs ORDER BY scheduled_date ASC').all();
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date ASC').all();
  const clients = db.prepare('SELECT * FROM clients').all();
  const employees = db.prepare('SELECT * FROM employees').all();
  res.render('admin/analytics', { jobs, expenses, clients, employees });
});

// ── JOB STATUS UPDATE ────────────────────────────────────────────────────────

app.post('/admin/jobs/status/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE jobs SET status=? WHERE id=?').run(status, req.params.id);
  res.redirect(req.headers.referer || '/admin');
});

// ── WEATHER + SOIL ────────────────────────────────────────────────────────────

app.get('/admin/weather', requireAuth, (req, res) => {
  const zip = req.query.zip || (db.prepare("SELECT value FROM settings WHERE key='business_zip'").get() || {}).value || '';
  res.render('admin/weather', { zip, apiKey: process.env.WEATHER_API_KEY || '' });
});

app.get('/admin/soil', requireAuth, (req, res) => res.render('admin/soil'));

// ── SETTINGS ──────────────────────────────────────────────────────────────────

app.get('/admin/settings', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.render('admin/settings', { settings, saved: !!req.query.saved });
});

app.post('/admin/settings/save', requireAuth, (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run(key, value);
  }
  res.redirect('/admin/settings?saved=1');
});

// ── START ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => console.log(`Chief Cornerstone running on port ${PORT}`));
