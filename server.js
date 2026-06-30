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
  const { id, client_id, title, service_type, status, scheduled_date, completed_date, price, estimated_hours, actual_hours, notes } = req.body;
  if (id) {
    db.prepare('UPDATE jobs SET client_id=?,title=?,service_type=?,status=?,scheduled_date=?,completed_date=?,price=?,estimated_hours=?,actual_hours=?,notes=? WHERE id=?')
      .run(client_id||null, title, service_type||null, status||'Scheduled', scheduled_date||null, completed_date||null, price||0, estimated_hours||0, actual_hours||0, notes||null, id);
  } else {
    db.prepare('INSERT INTO jobs (client_id,title,service_type,status,scheduled_date,completed_date,price,estimated_hours,actual_hours,notes) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(client_id||null, title, service_type||null, status||'Scheduled', scheduled_date||null, completed_date||null, price||0, estimated_hours||0, actual_hours||0, notes||null);
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

// ── KPI DASHBOARD ─────────────────────────────────────────────────────────────

app.get('/admin/kpi', requireAuth, (req, res) => {
  const jobs = db.prepare('SELECT jobs.*, clients.name as client_name FROM jobs LEFT JOIN clients ON jobs.client_id=clients.id ORDER BY scheduled_date DESC').all();
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
  const clients = db.prepare('SELECT * FROM clients').all();
  const employees = db.prepare("SELECT * FROM employees WHERE status='Active'").all();
  const leads = db.prepare('SELECT * FROM contact_requests ORDER BY created_at DESC').all();
  res.render('admin/kpi', { jobs, expenses, clients, employees, leads });
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

// ── DEMO SEED ────────────────────────────────────────────────────────────────

app.get('/admin/seed-demo', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
  if (existing > 0) return res.send('<h2>Already seeded. <a href="/admin">Go to Dashboard</a></h2>');

  // Clients
  const clients = [
    ['Robert & Linda Patterson', 'rpatterson@email.com', '512-448-7821', '1425 Cedar Hill Rd', 'Austin', 'TX', '78745', 'Lawn Maintenance', 'Active', 'Weekly mow, edge, blow. Back gate code is 4412.'],
    ['Oak Creek HOA', 'mgr@oakcreekhoa.org', '512-310-9940', '800 Oak Creek Blvd', 'Round Rock', 'TX', '78664', 'Landscape Design', 'Active', 'Common areas and entrance. Contract renewed annually. Contact is Jennifer Marsh.'],
    ['Marcus Johnson', 'marcus.j@gmail.com', '512-884-2231', '3312 Pecan Grove Dr', 'Pflugerville', 'TX', '78660', 'Irrigation', 'Active', 'Full drip system installed 2024. Spring startup and fall winterize.'],
    ['Sunrise Baptist Church', 'office@sunrisebaptist.org', '512-459-7700', '6001 N Lamar Blvd', 'Austin', 'TX', '78752', 'Seasonal Cleanup', 'Active', 'Bi-annual cleanup — spring and fall. Large parking lot islands.'],
    ['Diana Reyes', 'dreyes@yahoo.com', '737-210-4488', '921 Bluebonnet Ln', 'Cedar Park', 'TX', '78613', 'Lawn Maintenance', 'Active', 'Bi-weekly service. Has a dog — close side gate after every visit.'],
    ['The Hartwell Family', 'chad.hartwell@outlook.com', '512-771-3356', '5544 Rolling Hills Dr', 'Georgetown', 'TX', '78628', 'Hardscaping', 'Active', 'New patio and retaining wall project. Phase 2 (fire pit) scheduled for fall.'],
  ];
  const insertClient = db.prepare('INSERT INTO clients (name,email,phone,address,city,state,zip,service_type,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?)');
  for (const c of clients) insertClient.run(...c);
  const clientRows = db.prepare('SELECT id, name FROM clients').all();
  const cid = {};
  for (const r of clientRows) cid[r.name.split(' ')[0] + r.name.split(' ')[1]] = r.id;

  // Employees
  const employees = [
    ['Carlos Mendez', 'Lead Foreman', '512-334-8821', 'carlos.m@gmail.com', 22, 'Active'],
    ['James Whitfield', 'Crew Member', '512-771-2240', 'jwhitfield@gmail.com', 17, 'Active'],
    ['Miguel Santos', 'Irrigation Tech', '512-884-5591', 'msantos@email.com', 20, 'Active'],
    ['Tyler Brooks', 'Crew Member', '737-210-8840', 'tbrooks@gmail.com', 16, 'Active'],
  ];
  const insertEmp = db.prepare('INSERT INTO employees (name,role,phone,email,hourly_rate,status) VALUES (?,?,?,?,?,?)');
  for (const e of employees) insertEmp.run(...e);

  // Get client IDs by index
  const cl = db.prepare('SELECT id FROM clients ORDER BY id ASC').all().map(r => r.id);

  // Jobs — mix of completed, scheduled, in-progress
  const today = new Date();
  const d = (offset) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split('T')[0];
  };
  const jobs = [
    [cl[0], 'Weekly Lawn Maintenance', 'Lawn Maintenance', 'Completed', d(-28), d(-28), 95, 2, 2.0, 'Mow, edge, blow. Looks great.'],
    [cl[0], 'Weekly Lawn Maintenance', 'Lawn Maintenance', 'Completed', d(-21), d(-21), 95, 2, 2.5, 'Took longer — had to double-cut back yard.'],
    [cl[0], 'Weekly Lawn Maintenance', 'Lawn Maintenance', 'Completed', d(-14), d(-14), 95, 2, 2.0, null],
    [cl[0], 'Weekly Lawn Maintenance', 'Lawn Maintenance', 'Completed', d(-7), d(-7), 95, 2, 1.75, null],
    [cl[0], 'Weekly Lawn Maintenance', 'Lawn Maintenance', 'Scheduled', d(1), null, 95, 2, 0, null],
    [cl[1], 'Common Area Spring Cleanup', 'Seasonal Cleanup', 'Completed', d(-45), d(-43), 1850, 14, 16, 'Full entrance replant and mulch. Slightly over on hours.'],
    [cl[1], 'Monthly Maintenance — Common Areas', 'Lawn Maintenance', 'Completed', d(-15), d(-15), 420, 4, 4.0, null],
    [cl[1], 'Monthly Maintenance — Common Areas', 'Lawn Maintenance', 'Scheduled', d(3), null, 420, 4, 0, null],
    [cl[2], 'Irrigation System Spring Startup', 'Irrigation', 'Completed', d(-30), d(-30), 285, 3, 2.75, 'Zone 4 head replaced. All zones checked and running.'],
    [cl[2], 'Drip System Zone Repair', 'Irrigation', 'Completed', d(-10), d(-10), 195, 2, 2.5, 'Emitter replacement on pecan bed.'],
    [cl[3], 'Spring Grounds Cleanup', 'Seasonal Cleanup', 'Completed', d(-60), d(-58), 975, 8, 9, 'Three-man crew. Parking islands replanted. Over by 1 hr.'],
    [cl[4], 'Bi-Weekly Lawn Maintenance', 'Lawn Maintenance', 'Completed', d(-14), d(-14), 85, 1.5, 1.5, null],
    [cl[4], 'Bi-Weekly Lawn Maintenance', 'Lawn Maintenance', 'In Progress', d(0), null, 85, 1.5, 0, 'Carlos and Tyler on site now.'],
    [cl[5], 'Patio & Retaining Wall — Phase 1', 'Hardscaping', 'Completed', d(-20), d(-17), 4800, 32, 35, 'Three-day job. Slight overrun due to rock layer discovered on day 2.'],
    [cl[5], 'Fire Pit — Phase 2 Consultation', 'Hardscaping', 'Scheduled', d(14), null, 150, 1, 0, 'On-site estimate for phase 2 fire pit build.'],
  ];
  const insertJob = db.prepare('INSERT INTO jobs (client_id,title,service_type,status,scheduled_date,completed_date,price,estimated_hours,actual_hours,notes) VALUES (?,?,?,?,?,?,?,?,?,?)');
  for (const j of jobs) insertJob.run(...j);

  // Expenses
  const expenses = [
    ['Fuel', 'Truck fuel — week of ' + d(-28), 280, d(-28)],
    ['Fuel', 'Truck fuel — week of ' + d(-21), 195, d(-21)],
    ['Fuel', 'Truck fuel — week of ' + d(-14), 245, d(-14)],
    ['Fuel', 'Truck fuel — week of ' + d(-7), 210, d(-7)],
    ['Labor', 'Crew payroll — ' + d(-28) + ' through ' + d(-21), 2240, d(-21)],
    ['Labor', 'Crew payroll — ' + d(-14) + ' through ' + d(-7), 1980, d(-7)],
    ['Equipment', 'Mower blade replacement + tune-up', 385, d(-35)],
    ['Equipment', 'Trailer tire replacement', 290, d(-18)],
    ['Materials', 'Mulch — 12 cubic yards for HOA job', 520, d(-46)],
    ['Materials', 'Bedding plants and drip emitters', 148, d(-10)],
    ['Insurance', 'Monthly liability insurance', 420, d(-30)],
    ['Advertising', 'Google Ads — local search', 150, d(-30)],
    ['Software', 'Chief Cornerstone monthly hosting', 99, d(-30)],
  ];
  const insertExp = db.prepare('INSERT INTO expenses (category,description,amount,date) VALUES (?,?,?,?)');
  for (const e of expenses) insertExp.run(...e);

  // Contact requests
  const leads = [
    ['Brandon Willis', '512-443-9921', 'bwillis@gmail.com', '78717', 'Lawn Maintenance', 'Looking for weekly mowing service for my home in Leander. Yard is about 1/4 acre. Can you give me a quote?', 'New'],
    ['Kimberly Ochoa', '737-210-5582', null, '78664', 'Landscape Design', 'We just bought a new home and the backyard is completely bare. Want to add beds, a small patio, and some trees. Would love to get your thoughts.', 'New'],
    ['First Choice Property Mgmt', '512-339-8810', 'service@firstchoicepm.com', '78745', 'Seasonal Cleanup', 'We manage 4 residential properties in South Austin and need a reliable crew for spring and fall cleanups. Are you taking on commercial clients?', 'Contacted'],
  ];
  const insertLead = db.prepare('INSERT INTO contact_requests (name,phone,email,zip,service,message,status) VALUES (?,?,?,?,?,?,?)');
  for (const l of leads) insertLead.run(...l);

  // Customer messages
  const msgs = [
    ['Diana Reyes', 'dreyes@yahoo.com', '737-210-4488', 'Service question', 'Hey — just wanted to ask if you all can add trimming the hedges along my driveway to my regular visit? There are about 6 large bushes. Let me know what that would add to the cost.', 'Unread', null, null],
    ['Robert Patterson', 'rpatterson@email.com', '512-448-7821', 'Thank you!', 'Just wanted to say the yard looks fantastic. My wife and I really appreciate how consistent your crew has been. We will be recommending you to our neighbors on Cedar Hill.', 'Read', d(-5), 'Thank you Robert! That means a lot to us. We really enjoy working with you both. We will pass along the kind words to Carlos and the crew.'],
  ];
  const insertMsg = db.prepare('INSERT INTO customer_messages (client_name,client_email,client_phone,subject,message,status,replied_at,reply_text) VALUES (?,?,?,?,?,?,?,?)');
  for (const m of msgs) insertMsg.run(...m);

  // Update settings
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('business_name', 'Chief Cornerstone Landscaping');
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('business_phone', '512-555-0190');
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('business_email', 'info@chiefcornerstonelandscaping.com');
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('business_address', '4200 Manchaca Rd, Austin, TX 78704');
  db.prepare('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)').run('business_zip', '78704');

  res.send(`
    <html><body style="font-family:sans-serif;padding:40px;background:#f0f7e8;color:#1A2E1A">
    <h2 style="color:#228B22">✓ Demo data seeded successfully!</h2>
    <ul style="line-height:2.2">
      <li>6 clients added</li>
      <li>4 employees added</li>
      <li>15 jobs added (completed, scheduled, in-progress)</li>
      <li>13 expenses added</li>
      <li>3 quote requests added</li>
      <li>2 customer messages added</li>
    </ul>
    <a href="/admin" style="background:#228B22;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Go to Dashboard →</a>
    </body></html>
  `);
});

// ── START ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => console.log(`Chief Cornerstone running on port ${PORT}`));
