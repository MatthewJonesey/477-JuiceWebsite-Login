# Juice Shop Login Clone

A small Node.js app that mimics the login page of [OWASP Juice Shop](https://owasp-juice.shop/) and demonstrates secure login handling:

- Email and password fields styled like Juice Shop's dark theme
- **Client-side validation** (HTML + JavaScript): empty fields are blocked, the email must contain `@`, and the password must be at least 8 characters
- **Server-side validation** (Express): the same rules are enforced again, because client-side checks can be bypassed
- **SQL injection protection**: the login query uses a **prepared statement** (parameter binding) instead of string concatenation
- Passwords are stored as **bcrypt hashes**, and failed logins return one generic message so attackers can't tell whether an email exists

> This is a learning project. Unlike the real Juice Shop, it is intentionally **not** vulnerable.

## Requirements

- [Node.js](https://nodejs.org/) 22.13 or newer (uses the built-in `node:sqlite` module, so there are no native packages to compile)

## How to run

```bash
git clone <your-repo-url>
cd juice-shop-login
npm install
npm start
```

Open <http://localhost:3000>.

To use a different port: `PORT=8080 npm start` (macOS/Linux) or `set PORT=8080 && npm start` (Windows cmd).

## Demo accounts

The app uses an in-memory SQLite database that is re-created each time the server starts.

| Email               | Password     |
|---------------------|--------------|
| admin@juice-sh.op   | Admin#1234   |
| jim@juice-sh.op     | Ncc-1701     |

## Try it

| Input | Result |
|-------|--------|
| Empty email or password | Blocked in the browser, no request is sent |
| `admin` (no `@`) | Blocked by the client-side check |
| Password `short` | Blocked: fewer than 8 characters |
| Email `admin' or 1=1;--` | Blocked: no `@` |
| Email `admin' or 1=1;--@x.com`, any 8+ character password | Passes validation, reaches the database, and fails with "Invalid email or password." The prepared statement treats the whole value as a literal email. |
| Valid demo account | "Welcome back, ..." |

You can also bypass the browser and call the API directly to confirm the server validates on its own:

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"","password":"x"}'
# -> 400 with per-field errors
```

## How SQL injection is prevented

Vulnerable (do **not** do this):

```js
db.prepare(`SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`).get();
```

With `admin' or 1=1;--`, the query becomes `... WHERE email = 'admin' or 1=1;--' ...`, which returns the first user.

This project (see `server.js`):

```js
const findUserByEmail = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?');
const user = findUserByEmail.get(email);
```

The SQL text is fixed ahead of time and the email is passed separately as data, so it can never change the structure of the query. The password is never put in SQL at all: it is checked with `bcrypt.compareSync` against the stored hash.

## Project structure

```
juice-shop-login/
├── public/
│   └── index.html   # login form + client-side validation
├── server.js        # Express server, server-side validation, SQLite
├── package.json
└── README.md
```

