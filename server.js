const express = require('express');
const path = require('path');
const { DatabaseSync } = require('node:sqlite'); // built into Node 22.13+, no native install needed
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Database (in-memory, seeded on startup) ----------
const db = new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  )
`);

const insertUser = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
insertUser.run('admin@juice-sh.op', bcrypt.hashSync('Admin#1234', 10));
insertUser.run('jim@juice-sh.op', bcrypt.hashSync('Ncc-1701', 10));

// Prepared statement: the email is bound as a parameter, never concatenated
// into the SQL string, so input like  admin' or 1=1;--  is treated as plain text.
const findUserByEmail = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?');

// Hash used to keep response time similar when the email does not exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// ---------- Server-side validation ----------
function validateLogin(body) {
  const errors = {};
  const { email, password } = body || {};

  if (typeof email !== 'string' || email.trim() === '') {
    errors.email = 'Email is required.';
  } else if (!email.includes('@')) {
    errors.email = 'Email must contain "@".';
  } else if (email.length > 254) {
    errors.email = 'Email is too long.';
  }

  if (typeof password !== 'string' || password === '') {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (password.length > 128) {
    errors.password = 'Password is too long.';
  }

  return errors;
}

// ---------- Middleware & routes ----------
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/login', (req, res) => {
  const errors = validateLogin(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const email = req.body.email.trim();
  const { password } = req.body;

  const user = findUserByEmail.get(email);
  const hash = user ? user.password_hash : DUMMY_HASH;
  const passwordOk = bcrypt.compareSync(password, hash);

  if (!user || !passwordOk) {
    // Same message for unknown email and wrong password
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  res.json({ success: true, message: `Welcome back, ${user.email}!` });
});

app.listen(PORT, () => {
  console.log(`Login demo running at http://localhost:${PORT}`);
});
