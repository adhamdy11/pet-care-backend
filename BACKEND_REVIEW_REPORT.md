# Backend Review Report – Pet Care Management System

**Module:** KH5041CMD – The Internet and Web Technologies
**Repository:** https://github.com/adhamdy11/pet-care-backend
**Branch:** `backend-review-refactor` (the original code is untouched on `main`)
**Review date:** 3 November 2026

---

## Contents

1. [Summary](#1-summary)
2. [How the review was done](#2-how-the-review-was-done)
3. [About the "AI-generated" concern](#3-about-the-ai-generated-concern)
4. [Bugs confirmed by running the original code](#4-bugs-confirmed-by-running-the-original-code)
5. [File-by-file review](#5-file-by-file-review)
6. [New files](#6-new-files)
7. [Key concepts to be able to explain](#7-key-concepts-to-be-able-to-explain)
8. [Testing](#8-testing)
9. [Coursework brief compliance](#9-coursework-brief-compliance)
10. [Differences between the code and the submitted report](#10-differences-between-the-code-and-the-submitted-report)
11. [Final summary](#11-final-summary)
12. [Disclosure of AI assistance in this refactoring](#12-disclosure-of-ai-assistance-in-this-refactoring)

---

## 1. Summary

The original backend was small (18 files) and its overall structure – routes → middleware → controllers → SQLite – was sensible and matched the report. All the main features worked for the "happy path" shown in the Postman screenshots.

However, running the code showed real problems:

- The server **crashed completely** on login if `JWT_SECRET` was missing.
- Error responses **leaked stack traces, file paths and raw SQLite error messages** to the client.
- In Express 5, a request with no JSON body **crashed the handler** (`Cannot read properties of undefined`).
- There was almost **no input validation** (any string accepted as an email, a date or an appointment status; `"123456"` or even `"1"` accepted as a password).
- A user's **role was trusted from the token**, so a demoted admin kept admin access for up to 2 hours, and an admin could demote themselves (locking the system out of admins).
- Several **coursework brief requirements were missing**: secure cookies (HttpOnly / Secure / SameSite), CSRF protection, security headers, authentication-event logging, a logout endpoint, a README and multiple commits.

The refactored version fixes all of these, keeps the same folder structure and URL design, adds no new npm packages, and is covered by 28 automated tests that all pass.

---

## 2. How the review was done

1. The original project folder on the laptop no longer existed, so the repository was cloned from GitHub. The Git history has **one commit** (`71dec0a`, 12 Feb 2026, "Initial backend commit") containing all 18 files.
2. Every file was read in full and compared with the submitted report (`Internet_Web_Final_PDF_2.pdf`) and the assignment brief (`KH5041CMD_CW.pdf`).
3. The **original** server was started and sent real HTTP requests (with `curl`) to confirm each suspected bug before any code was changed (results in section 4).
4. A new branch `backend-review-refactor` was created. The `main` branch and its history were not modified.
5. After refactoring, an automated test suite was written and run, and the server was started normally with `npm start` and a `.env` file.

---

## 3. About the "AI-generated" concern

**Important:** It is not possible to tell reliably from code alone whether it was written by a person or by an AI tool. Nothing below is proof of how the code was written. What can be done is to point out specific features that a reader *might* see as generic or inconsistent, and separate those from real technical problems.

### 3.1 What the original code actually looks like

The original code is short, has **no comments at all**, and uses one consistent style in every file (`var`, `function () {}`, callbacks, `module.exports = { a: a }`). It does *not* show some patterns often associated with generated code, such as long explanatory comments, unused helper functions or over-engineered abstractions. So the concerns are more likely to come from the points below than from the code style itself.

### 3.2 Points a reviewer might notice

| # | Observation | Why it may look generic or questionable | Stylistic or technical? |
|---|---|---|---|
| 1 | **The whole project arrived in a single commit** at 02:33, with no earlier history. | There is no visible record of the project being built step by step. The brief explicitly requires "multiple commits showing progressive development". | Process / compliance issue, not a code issue. |
| 2 | **Every controller is the same template** – same pet-ownership query copied five times, same `if (err) return res.status(500).json({ error: err.message })` line after every query, same `module.exports` block. | Very uniform, repeated code can read as generated from a template. | Mostly stylistic, but returning `err.message` is a real security problem (see 4.3). |
| 3 | **Old-style JavaScript combined with very new packages.** The code uses `var` and `function` callbacks (common in older tutorials) while `package.json` uses Express 5.2, dotenv 17 and bcryptjs 3. The brief asks for modern JavaScript (ES6+). | Mixing styles from different eras can look like code assembled from different sources. | Stylistic, but `var` is also against the brief's "JS6" requirement. |
| 4 | **Code written for Express 4 running on Express 5.** Handlers assume `req.body` is always an object, which was true in Express 4 but not in Express 5. | Suggests the code was not written against the version actually installed. | **Technical bug** (crash, see 4.2). |
| 5 | **The report and the code disagree** in several places (endpoint names, response messages, table design, screenshots – see section 10). The report also contains template leftovers such as "Use Case #1: [Share Playlist]" and references to the Spotify and Apple Music APIs. | When the report does not match the code, it is harder to show that the author knows the code well. | Documentation issue. |
| 6 | **The report claims features the code did not have** – e.g. "validating inputs" (almost none existed), and a `public` folder with frontend files (none exists). | Over-stated claims can make a reader doubt the rest. | Documentation issue, plus the validation gap is technical. |
| 7 | **No README, no `.env.example`, default `package.json`** (`"main": "index.js"` although the file is `server.js`; placeholder test script). | Not an AI pattern – this looks unfinished rather than generated – but the brief requires a README. | Compliance issue. |
| 8 | **Parts that need careful explanation in a demo**: why `function (err) { this.lastID }` is used instead of an arrow function, what `db.serialize()` does, why `PRAGMA foreign_keys = ON` is needed, how `jwt.verify` works. | If these cannot be explained, it can look like the code was not written by the presenter. | Understanding issue – section 7 explains all of these. |

### 3.3 What was *not* found

- No unused imports, unused functions or unused variables in the original JavaScript files.
- No excessive comments.
- No needlessly complex abstractions.
- SQL queries were already parameterised (`?` placeholders), so there was **no SQL injection** vulnerability.
- Ownership checks (`WHERE ... AND user_id = ?`) were present on all user data.

These are genuine strengths of the original and should be acknowledged in the discussion.

---

## 4. Bugs confirmed by running the original code

Each of these was reproduced against the original `main` branch with real HTTP requests before any change was made.

### 4.1 Server crash when `JWT_SECRET` is missing

```
POST /auth/login  →  no response; server process exits
Error: secretOrPrivateKey must have a value
    at controllers/authController.js:43:21
```

`jwt.sign` threw inside a SQLite callback, which is outside Express's error handling, so the whole Node process died. Anyone could take the server down by logging in.

### 4.2 Crash on a request with no body (Express 5)

```
POST /auth/signup   (no body)
→ 500 HTML page: "TypeError: Cannot read properties of undefined (reading 'username')
   at signup (/home/.../controllers/authController.js:6:27) ..."
```

In Express 5, `req.body` is `undefined` when no JSON was sent, so `req.body.username` throws.

### 4.3 Information disclosure in error responses

- Malformed JSON returned Express's HTML error page with a full stack trace and server file paths.
- Database errors were sent to the client: `{"error":"SQLITE_CONSTRAINT: NOT NULL constraint failed: pets.name"}` (sending `{"name": null}` to `PUT /pets/1`).
- Unknown URLs returned an HTML page instead of JSON.
- Every response included `X-Powered-By: Express`.

These tell an attacker the framework, database, table/column names and folder layout.

### 4.4 No input validation

All of these were accepted with `201 Created`:

- signup with email `not-an-email` and password `x` (or `1`)
- a pet with `"age": "abc"`
- an appointment with `"date": "yesterday-ish"`
- an appointment status of `<script>alert(1)</script>` (stored and returned as-is – harmless in JSON, but a stored XSS risk once a frontend displays it)

### 4.5 Stale role in the token / admin self-lockout

The login token contained the user's role, and `requireAdmin` trusted it without checking the database:

```
1. Admin logs in → token says role "admin"
2. Admin is demoted to "user" in the database
3. Old token still opens GET /admin/all-users → 200 OK (for up to 2 hours)
```

An admin could also change their **own** role to `user`, and because every signup creates a normal user, there was no way to create a new admin except by editing the database by hand.

### 4.6 Other issues found by reading the code

- `initDb()` was not awaited, so the server could accept requests before the tables existed (only on the very first start).
- `bcrypt.hashSync` / `compareSync` block the whole server while hashing.
- `cors()` with no options allowed **any** website to call the API.
- `reminders.is_done` could never be changed – there was no update route, so the column was useless.
- Missing (or another user's) `pet_id` returned **403 "You do not own this pet"** on some routes but **404 "Pet not found"** on others.
- No limit on the request body size or on login attempts.

---

## 5. File-by-file review

### 5.1 `server.js`

**1. Original implementation**
Loaded `.env`, registered `cors()` and `express.json()`, called `initDb()`, mounted six routers and started listening.

Sections needing attention: `app.use(cors())` (any origin), `initDb()` not awaited, no 404 handler, no error handler, no check for `JWT_SECRET`, no security headers.

**2. AI-related concerns**
None specific to this file. It closely follows the standard Express "hello world" layout used in course material, which is normal. Concerns here are technical only.

**3. Exact changes**

Before:
```js
var app = express();
app.use(cors());
app.use(express.json());

initDb();
...
app.listen(port, function() { ... });
```

After:
```js
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and set a long random value.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || false, credentials: true }));
app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
  if (!req.body) req.body = {};
  next();
});
...
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

initDb().then(() => app.listen(port, ...)).catch(...);
```

- Fails fast with a clear message if `JWT_SECRET` is missing (fixes 4.1).
- Removes the `X-Powered-By` header and adds security headers.
- CORS now only allows the frontend origin set in `.env` (`CLIENT_ORIGIN`). `credentials: true` lets that frontend send cookies.
- Limits JSON bodies to 10 KB.
- Makes `req.body` always an object (fixes 4.2).
- JSON 404 for unknown routes, and one central error handler that logs the real error on the server but sends only a generic message (fixes 4.3).
- Waits for the tables to be created before listening.

**API behaviour changes:** unknown routes, bad JSON and server errors now return JSON instead of HTML. Browsers on other origins are blocked unless `CLIENT_ORIGIN` is set (Postman is not a browser, so it is unaffected).

**4. Technical explanation**
Express runs middleware **in the order it is registered**. Every request goes through security headers → CORS → JSON parser → body fix → the matching router. If no router answers, the 404 middleware runs. A middleware with **four** parameters `(err, req, res, next)` is an *error handler*: Express calls it when something throws. In Express 5, if an `async` handler throws or a Promise rejects, Express automatically passes the error here – this is why the controllers no longer need `if (err) return res.status(500)...` after every query.

**5. Testing:** tests 1–6 (startup without secret, headers, 404, bad JSON, empty body, oversized body). All passed.

---

### 5.2 `database/db.js`

**1. Original implementation**
Opened `database/petcare.sqlite`, and `initDb()` created five tables inside `db.serialize()`. Exported the raw `db` object, so every controller used callbacks.

Sections needing attention: SQL built with `"..." + "..."` string concatenation (hard to read), no constraints on `role`, `status` or `is_done`, `initDb` returned nothing so it could not be awaited.

**2. AI-related concerns**
None in particular. The schema matches the report's design. Concerns are readability and data integrity only.

**3. Exact changes**

Before:
```js
db.run(
  "CREATE TABLE IF NOT EXISTS users (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    ...
    "role TEXT NOT NULL DEFAULT 'user'" +
  ");"
);
```

After:
```js
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}
// run() and all() are the same idea

async function initDb() {
  await run('PRAGMA foreign_keys = ON');
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      ...
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'))
    )
  `);
  ...
}
```

- Added three small Promise helpers `run`, `get` and `all`.
- SQL is written with template literals (backticks), so each table reads like normal SQL.
- Added `CHECK` constraints: `role` must be `user`/`admin`, appointment `status` must be `scheduled`/`completed`/`cancelled`, `is_done` must be 0/1. This is a second line of defence behind the JavaScript validation.
- `DB_PATH` can be set in `.env` (used by the tests to run on a temporary database).
- Removed `.verbose()` (only useful for debugging).

**API behaviour changes:** none.

**4. Technical explanation**
The `sqlite3` package gives results through **callbacks**. A **Promise** is an object representing a result that will arrive later; wrapping the callback in `new Promise(...)` lets the controllers write `const pet = await get(...)` instead of nesting callbacks. `run()` uses `function (err) { ... }` instead of an arrow function on purpose: sqlite3 puts `lastID` (the new row's id) and `changes` (number of rows affected) on `this`, and arrow functions do not have their own `this`.

`PRAGMA foreign_keys = ON` is needed because SQLite **does not enforce foreign keys by default**. Without it, `ON DELETE CASCADE` would do nothing. The app uses one database connection, so setting it once at startup is enough.

`CREATE TABLE IF NOT EXISTS` only creates a table the first time. Note: a database created by the *old* code would not get the new `CHECK` constraints (the old database no longer exists, so this does not matter now).

**5. Testing:** every test uses these helpers. Test 22 opens the database file directly and confirms that deleting a pet removes its appointments, records and reminders (foreign keys + cascade working).

---

### 5.3 `middleware/authMiddleware.js`

**1. Original implementation**
Read `Authorization: Bearer <token>`, verified it with `jwt.verify`, and put the decoded token into `req.user`.

Sections needing attention: trusted the role inside the token, did not support cookies, no CSRF check, did not restrict the JWT algorithm.

**2. AI-related concerns**
None. This is the standard pattern from Express/JWT tutorials. Concerns are technical.

**3. Exact changes**

Before:
```js
jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
  if (err) return res.status(401).json({ error: "Invalid or expired token" });
  req.user = decoded;
  next();
});
```

After (shortened):
```js
// token comes from "Authorization: Bearer ..." or from the HttpOnly "token" cookie
payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

if (usingCookie && !SAFE_METHODS.includes(req.method)) {
  const csrfCookie = readCookie(req, 'csrfToken');
  if (!csrfCookie || req.get('X-CSRF-Token') !== csrfCookie) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
}

const user = await get('SELECT id, username, email, role FROM users WHERE id = ?', [payload.id]);
if (!user) return res.status(401).json({ error: 'User no longer exists' });
req.user = user;
```

- Accepts the token from the Bearer header (Postman) **or** from the `token` cookie (future browser frontend).
- For cookie-based requests that change data (POST/PUT/DELETE), requires a CSRF token header.
- Loads the user **from the database** on each request, so role changes and deleted accounts take effect immediately (fixes 4.5).
- Only accepts tokens signed with HS256.

**API behaviour changes:** a missing token now returns `"Not logged in"` instead of `"Missing Authorization header"`. Requests from deleted users now get 401.

**4. Technical explanation**
A **middleware** is a function `(req, res, next)` that runs before the controller. It either sends a response (stopping the request) or calls `next()` to continue.

A **JWT** has three parts: header, payload (here just `{ id, iat, exp }`) and signature. `jwt.verify` recomputes the signature with `JWT_SECRET`; if anyone changed the payload or used another secret, verification fails. It also rejects expired tokens. The payload is only *encoded*, not encrypted – anyone can read it – which is why no sensitive data is put in it.

**CSRF** (Cross-Site Request Forgery): a browser automatically attaches cookies to requests, even when another website triggers them. The fix used is the **double-submit cookie** pattern: at login the server sets a second cookie, `csrfToken`, which JavaScript *can* read. The frontend copies it into an `X-CSRF-Token` header. A malicious site cannot read our cookies, so it cannot produce the matching header. Bearer-token requests do not need this check because browsers never add the `Authorization` header automatically. `SameSite=Strict` on the cookies is a second layer of protection.

`readCookie` splits the raw `Cookie` header (`"token=abc; csrfToken=xyz"`) by `;` and then by the first `=`. Values are not URL-decoded because JWTs and hex strings only contain URL-safe characters.

**5. Testing:** tests 11–13, 24 and 25 (Bearer and cookie login, missing/malformed/forged/expired tokens, CSRF missing/wrong/correct, role change applying to an existing token). All passed.

---

### 5.4 `middleware/adminMiddleware.js`

**1. Original:** returned 403 unless `req.user.role === 'admin'`, where the role came from the token.

**2. AI-related concerns:** none.

**3. Changes:** the code is almost the same, but it is now correct because `req.user` is loaded from the database by `verifyToken`. The `!req.user` check was removed because this middleware is always used after `verifyToken`.

**4. Explanation:** this is the **principle of least privilege** – only users whose *current* database role is `admin` can reach admin routes.

**5. Testing:** tests 23–25. All passed.

---

### 5.5 Route files (`authRoutes`, `adminRoutes`, `petRoutes`, `appointmentRoutes`, `recordRoutes`, `reminderRoutes`)

**1. Original implementation**
Each file created an Express Router and mapped URLs to controller functions, repeating `verifyToken` (and `requireAdmin`) on every line.

**2. AI-related concerns:** the six files are near-identical, which is normal for Express routers. Stylistic only.

**3. Exact changes**

Before:
```js
router.post('/', verifyToken, petController.createPet);
router.get('/', verifyToken, petController.getMyPets);
router.put('/:id', verifyToken, petController.updatePet);
router.delete('/:id', verifyToken, petController.deletePet);
```

After:
```js
router.use(verifyToken);

router.post('/', petController.createPet);
router.get('/', petController.getMyPets);
router.put('/:id', petController.updatePet);
router.delete('/:id', petController.deletePet);
```

- `router.use(verifyToken)` protects every route in the file in one line, so a new route cannot accidentally be left unprotected.
- `authRoutes`: added `POST /auth/logout` and the login rate limiter.
- `recordRoutes` and `reminderRoutes`: added `PUT /:id` and `DELETE /:id` so medical records and reminders can be managed fully (the use case diagram says "Manage Medical Records" / "Manage Reminders", and `is_done` needed an update route).
- `const` instead of `var`.

**API behaviour changes:** four new endpoints (records PUT/DELETE, reminders PUT/DELETE) and `POST /auth/logout`. Existing URLs are unchanged.

**4. Explanation:** `router.use(fn)` runs `fn` for every request that reaches this router, before the route handlers.

**5. Testing:** every route is exercised in tests 7–28.

---

### 5.6 `controllers/authController.js`

**1. Original implementation**
`signup` hashed the password with `bcrypt.hashSync` and inserted the user; `login` compared with `compareSync` and returned a JWT containing id, email, role and username; `me` returned the profile.

Sections needing attention: no email/password validation, blocking bcrypt calls, error detection with `String(err.message).indexOf("UNIQUE")`, role in token, no cookies, no logging, no logout.

**2. AI-related concerns:** none specific. The technical gaps are the issue.

**3. Exact changes**

Before:
```js
if (!username || !email || !password) { ... }
var hashed = bcrypt.hashSync(password, 10);
...
var token = jwt.sign(
  { id: user.id, email: user.email, role: user.role, username: user.username },
  process.env.JWT_SECRET, { expiresIn: '2h' });
return res.json({ message: "Login successful", token: token });
```

After:
```js
if (!isStrongPassword(password)) {
  return res.status(400).json({ error: 'password must be 8-72 characters and contain at least one letter and one number' });
}
const cleanEmail = email.trim().toLowerCase();
const hashedPassword = await bcrypt.hash(password, 10);
...
const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '2h' });
const csrfToken = crypto.randomBytes(32).toString('hex');

res.cookie('token', token, { ...cookieOptions, httpOnly: true });
res.cookie('csrfToken', csrfToken, { ...cookieOptions, httpOnly: false });

logAuthEvent(req, 'LOGIN_SUCCESS', cleanEmail);
res.json({ message: 'Login successful', token: token, csrfToken: csrfToken });
```

with
```js
const cookieOptions = {
  secure: process.env.COOKIE_SECURE !== 'false',
  sameSite: 'strict',
  maxAge: 2 * 60 * 60 * 1000,
  path: '/'
};
```

- Validates username, email format and password strength.
- Stores emails in lower case, so `Alice@Test.com` and `alice@test.com` are the same account.
- Uses the async `bcrypt.hash` / `bcrypt.compare` so the server is not blocked.
- Detects duplicate emails with `err.code === 'SQLITE_CONSTRAINT'`.
- Token payload is only `{ id }` – the rest is read from the database.
- Sets the `token` cookie (HttpOnly, Secure, SameSite=Strict, 2-hour lifetime) and a `csrfToken` cookie.
- Logs signup/login successes and failures.
- New `logout` clears both cookies. `me` now just returns `req.user` (already loaded from the database).

**API behaviour changes:** passwords such as `123456` (used in the report's Postman screenshots) are now rejected. Login also returns `csrfToken` and sets cookies. The token is still returned in the JSON body so Postman testing works as described in the report.

**4. Technical explanation**
**bcrypt** is a slow, salted hash. The `10` is the *cost factor*: 2¹⁰ rounds. A random salt is stored inside the hash, so the same password gives a different hash each time, and `bcrypt.compare` re-hashes the login attempt to compare. bcrypt only uses the first 72 bytes of a password, which is why the maximum is 72.

**Cookie flags:**
- `HttpOnly` – JavaScript in the browser cannot read the cookie, so an XSS bug cannot steal the session.
- `Secure` – the cookie is only sent over HTTPS. For local testing on plain `http://localhost`, `.env` sets `COOKIE_SECURE=false`.
- `SameSite=Strict` – the browser does not send the cookie on requests started by other websites (CSRF protection).
- `maxAge` – the cookie expires after 2 hours, the same as the JWT.
- No sensitive data is stored in cookies – only the signed token and a random CSRF value.

**5. Testing:** tests 5–13, 26–28. All passed.

---

### 5.7 `controllers/adminController.js`

**1. Original:** `getAllUsers` returned users without passwords (good); `updateRole` validated the role and updated it.

**2. AI-related concerns:** none.

**3. Changes**
```js
if (id === req.user.id) {
  return res.status(400).json({ error: 'You cannot change your own role' });
}
...
logAuthEvent(req, 'ROLE_CHANGED user_id=' + id + ' role=' + role, req.user.email);
```
- Validates the `:id` parameter (400 for non-numbers).
- Admins cannot change their own role (prevents locking the system out of admins).
- Role changes are written to the security log.

**API behaviour changes:** new 400 response for changing your own role or an invalid id.

**4. Explanation:** the first admin is created with `npm run make-admin -- email` (see 6.4).

**5. Testing:** tests 23–25. All passed.

---

### 5.8 `controllers/petController.js`

**1. Original implementation**
Create, list, update and delete pets, all filtered by `user_id = req.user.id` (good ownership checks). Update merged new values with stored ones using five repeated `(req.body.x !== undefined) ? req.body.x : pet.x` lines.

Sections needing attention: no type checks (age `"abc"` accepted), `name: null` caused a raw SQLite error, five repeated ternaries.

**2. AI-related concerns:** the repeated ternary lines and identical callback skeleton are the "template-like" pattern from section 3.2 #2. Stylistic, but the missing validation is technical.

**3. Exact changes**

Before:
```js
var name = (req.body.name !== undefined) ? req.body.name : pet.name;
var species = (req.body.species !== undefined) ? req.body.species : pet.species;
var breed = (req.body.breed !== undefined) ? req.body.breed : pet.breed;
var age = (req.body.age !== undefined) ? req.body.age : pet.age;
var notes = (req.body.notes !== undefined) ? req.body.notes : pet.notes;
```

After:
```js
const PET_FIELDS = ['name', 'species', 'breed', 'age', 'notes'];
...
const pet = mergeUpdate(existing, req.body, PET_FIELDS);
const error = checkPet(pet);
if (error) return res.status(400).json({ error });
```

- One `checkPet()` function validates the pet for both create and update (name required, max lengths, age a whole number 0–100).
- `mergeUpdate()` replaces the repeated ternaries.
- Invalid `:id` → 400.
- `async/await` replaces the nested callbacks.

**API behaviour changes:** invalid data now returns 400 with a clear message instead of being stored or causing a 500.

**4. Explanation:** the `WHERE id = ? AND user_id = ?` in every query is the **ownership check** – another user's pet simply is not found, so the response is 404 and does not reveal that the pet exists.

**5. Testing:** tests 14–18 and 22. All passed.

---

### 5.9 `controllers/appointmentController.js`

**1. Original:** create (with pet ownership check), list, update, delete.

**2. AI-related concerns:** same template pattern as the other controllers. Stylistic.

**3. Changes**
- `date` must be a real date in `YYYY-MM-DD` format (`2026-02-30` is rejected).
- `status` must be `scheduled`, `completed` or `cancelled`.
- `pet_id` must be a positive whole number (`true`, `"abc"` rejected).
- Another user's or a missing pet now returns **404 "Pet not found"** instead of 403, matching the pets endpoints.

Before:
```js
if (!pet) return res.status(403).json({ error: "You do not own this pet" });
```
After:
```js
const pet = await get('SELECT id FROM pets WHERE id = ? AND user_id = ?', [petId, req.user.id]);
if (!pet) return res.status(404).json({ error: 'Pet not found' });
```

**API behaviour changes:** 403 → 404 for pets you do not own; stricter validation.

**4. Explanation:** the report's use case scenario step 2b says "Pet ID does not exist → system denies the request" – 404 is the correct status for that and is consistent across all endpoints.

**5. Testing:** test 19. All passed.

---

### 5.10 `controllers/recordController.js`

**1. Original:** add a record and list records for a pet, with ownership checks.

**2. AI-related concerns:** the ownership query was copied twice in this file and twice in the reminders file. Stylistic.

**3. Changes:** validation (`record_type` required, `record_date` a valid date), 403 → 404 as above, and new `updateRecord` / `deleteRecord` functions following exactly the same pattern as pets.

**API behaviour changes:** new `PUT /records/:id` and `DELETE /records/:id`.

**4. Explanation:** the update/delete queries use `WHERE id = ? AND user_id = ?`, so only the owner can change a record.

**5. Testing:** test 20. All passed.

---

### 5.11 `controllers/reminderController.js`

**1. Original:** create a reminder and list reminders for a pet. The `is_done` column existed but could never be changed.

**2. AI-related concerns:** a database column with no code using it can look unplanned. Technical gap.

**3. Changes:** validation, 403 → 404, and new `updateReminder` (e.g. `{"is_done": true}`) and `deleteReminder`. `is_done` accepts `true/false/0/1` and is stored as 0/1 because SQLite has no boolean type.

**API behaviour changes:** new `PUT /reminders/:id` and `DELETE /reminders/:id`.

**5. Testing:** test 21. All passed.

---

### 5.12 `package.json` and `package-lock.json`

**1. Original:** default `npm init` values (`"main": "index.js"`, placeholder test script, empty description). `npm audit` reported 11 vulnerabilities (including critical/high ones in `tar` and `body-parser`).

**2. AI-related concerns:** none – this looks unfinished rather than generated.

**3. Changes**
- `main` → `server.js`; added scripts `start`, `dev`, `test`, `make-admin`; description; `engines: node >= 20.17`.
- Ran `npm audit fix` (non-breaking updates in the lock file, e.g. `body-parser`).
- Upgraded `sqlite3` from 5.1.7 to **6.0.1**. The remaining vulnerabilities were in sqlite3's *install-time* build tools (`node-gyp`, `tar`), which v6 updates. The JavaScript API is the same.
- Result: `npm audit` → **found 0 vulnerabilities**.

**No new packages were added.** The brief requires approval for third-party plugins, so every new feature (cookie reading, security headers, rate limiting, logging, tests) was written with plain Node/Express.

### 5.13 `.gitignore`

Added `logs/` and changed `database/petcare.sqlite` to `database/*.sqlite`, so the database, log files and `.env` are never committed.

---

## 6. New files

### 6.1 `utils/validation.js`
Small, reusable checks: `isNonEmptyString`, `isOptionalString`, `isValidEmail`, `isStrongPassword`, `isValidDate`, `toId` and `mergeUpdate`. Keeping them in one file avoids copying the same checks into six controllers. Each controller has its own short `checkPet` / `checkAppointment` / ... function that lists that resource's rules.

`isValidDate` example:
```js
if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
const date = new Date(value + 'T00:00:00Z');
return !isNaN(date) && date.toISOString().startsWith(value);
```
JavaScript turns `2026-02-30` into 2 March; comparing the result back with the input catches impossible dates.

### 6.2 `utils/authLogger.js`
Writes security events to `logs/auth.log` as one JSON object per line:
```json
{"time":"2026-11-03T03:02:49.799Z","event":"LOGIN_SUCCESS","email":"adham@test.com","ip":"127.0.0.1"}
```
Events: `SIGNUP_SUCCESS`, `SIGNUP_FAILED`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `ROLE_CHANGED`. This meets the brief's "log authentication events (success/failure, IP, timestamp)". Using `JSON.stringify` means an email containing a newline cannot create fake log lines (**log injection**). Passwords are never logged.

### 6.3 `middleware/securityHeaders.js`
Sets five headers on every response:

| Header | Purpose |
|---|---|
| `X-Content-Type-Options: nosniff` | Browser must not guess content types |
| `X-Frame-Options: DENY` | Page cannot be put in an iframe (clickjacking) |
| `Referrer-Policy: no-referrer` | URLs are not leaked to other sites |
| `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` | API responses may not load any scripts/styles |
| `Strict-Transport-Security` | Browser must use HTTPS for this site in future (only takes effect over HTTPS) |

This was written by hand rather than with the `helmet` package so it adds no dependency and every header can be explained. **Note for the frontend phase:** the CSP must be relaxed when HTML pages are served from this server.

Evidence (`curl -i http://localhost:3000/auth/me`):
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### 6.4 `middleware/loginRateLimit.js`
Allows `LOGIN_MAX_ATTEMPTS` (default 10) login requests per IP address every 15 minutes, then returns **429 Too Many Requests**. It uses a `Map` in memory. This slows down password-guessing (brute force) attacks.

### 6.5 `scripts/makeAdmin.js`
`npm run make-admin -- someone@example.com` sets that user's role to `admin`. Before this, the only way to create an admin was to edit the database by hand.

### 6.6 `tests/api.test.js`
28 end-to-end tests (section 8).

### 6.7 `README.md`, `.env.example`
The README covers the project description, setup steps, the third-party packages and the API list (required by the brief). `.env.example` documents every setting without containing real secrets.

---

## 7. Key concepts to be able to explain

**Request flow.** `POST /pets` → `securityHeaders` → `cors` → `express.json()` (turns the JSON text into `req.body`) → `petRoutes` → `verifyToken` (checks the token, loads `req.user`) → `petController.createPet` (validates, inserts, responds) → if anything throws, the error handler in `server.js`.

**MVC-style structure.** Routes decide *which* function handles a URL; controllers contain the logic; `database/db.js` is the data (model) layer; middleware holds shared checks. There is no view layer yet because the frontend has not been built.

**`async` / `await`.** An `async` function always returns a Promise. `await` pauses that function (not the whole server) until the Promise finishes. Other requests keep being served meanwhile – this is how Node handles many users on one thread.

**Parameterised queries (SQL injection).** `run('INSERT INTO pets (name) VALUES (?)', [name])` sends the SQL and the values **separately** to SQLite, so a value like `x'); DROP TABLE users; --` is stored as text and never executed. Test 18 proves this.

**Authentication vs authorisation.** Authentication = *who are you?* (`verifyToken`). Authorisation = *are you allowed?* (`requireAdmin` for roles, `WHERE user_id = ?` for ownership).

**Stateless JWT vs cookies.** The server does not store sessions; the signed token *is* the session. Putting the token in an HttpOnly cookie protects it from JavaScript; the CSRF token protects against forged requests.

**HTTP status codes used.** 200 OK, 201 Created, 400 Bad Request (invalid input), 401 Unauthorized (not logged in / bad token), 403 Forbidden (logged in but not allowed, or bad CSRF token), 404 Not Found (also used for other users' data), 409 Conflict (email taken), 413 Payload Too Large, 429 Too Many Requests, 500 Internal Server Error.

**Foreign keys and cascade.** `pets.user_id` references `users.id`; appointments, records and reminders reference both. `ON DELETE CASCADE` deletes child rows automatically when a pet is deleted. `user_id` is stored on child tables as well as `pet_id` so ownership can be checked with one simple query.

---

## 8. Testing

### 8.1 How to run
```bash
npm test
```
Uses Node's built-in test runner (`node --test`). The test file starts the real server on port 3999 with a temporary database and log file, sends HTTP requests with `fetch`, and deletes the temporary files afterwards.

### 8.2 Results (actually executed on 3 Nov 2026, Node 22.23.4, Linux)

```
ok 1 - server refuses to start without JWT_SECRET
ok 2 - GET / works and security headers are set
ok 3 - unknown route returns JSON 404
ok 4 - malformed JSON returns 400 without a stack trace
ok 5 - request with no body returns a validation error, not a crash
ok 6 - oversized body returns 413
ok 7 - signup validates input
ok 8 - signup creates users and rejects duplicate emails (case-insensitive)
ok 9 - login rejects wrong credentials
ok 10 - login returns a token and sets secure cookies
ok 11 - GET /auth/me works with Bearer token and with cookie
ok 12 - protected routes reject missing, malformed and forged tokens
ok 13 - cookie requests that change data need the CSRF header
ok 14 - pets: create with validation
ok 15 - pets: list only returns your own pets
ok 16 - pets: update is partial and validated
ok 17 - pets: another user cannot update or delete them
ok 18 - SQL injection in input is stored as plain text
ok 19 - appointments: create, validate, list, update, delete
ok 20 - medical records: create, validate, list, update, delete
ok 21 - reminders: create, validate, list, mark done, delete
ok 22 - deleting a pet also deletes its appointments, records and reminders
ok 23 - admin routes are blocked for normal users
ok 24 - make-admin script promotes a user, and the change applies to the existing token
ok 25 - admin can change roles, with validation
ok 26 - logout clears both cookies
ok 27 - auth events are logged as JSON lines with time, event, email and IP
ok 28 - login is rate limited per IP
# tests 28
# pass 28
# fail 0
```

### 8.3 Other checks performed
- **Manual run:** `npm start` with a `.env` created from `.env.example`; replayed the report's Postman flow (signup → login → create pet → create appointment → list appointments) with `curl`. All succeeded, except that the report's password `123456` is now rejected (expected – new password policy).
- **Original code:** the bugs in section 4 were reproduced against the original `main` branch. Running the new test suite against the original code gave 2 passes and 26 failures; many of those failures cascade from earlier ones (e.g. no cookies → later tests have no session), so section 4 is the clearer evidence.
- **`npm audit`:** 11 vulnerabilities before, **0** after.

### 8.4 Not tested
- **Windows.** The main testing was done on Linux. On the Windows laptop (3 Nov 2026) `npm install` worked and all 28 tests passed, but the test cleanup step failed with `EPERM` because the server still had the SQLite file open when the temp folder was deleted (Windows locks open files). The `after()` hook now waits for the server process to exit before deleting the folder. After this fix the tests were re-run on Linux and on the Windows laptop: 28 tests, 28 pass, 0 fail on both.
- **HTTPS / Secure cookie in a real browser** – needs a deployed HTTPS server (cloud setup is part of the final submission).
- **A real browser frontend** using the cookies and CSRF header – the frontend does not exist yet.
- Load / performance testing and penetration testing with tools such as OWASP ZAP or Burp Suite.

---

## 9. Coursework brief compliance

| Brief requirement | Status |
|---|---|
| Credentials saved on server, verified at login | ✅ (bcrypt hashes) |
| Passwords hashed and securely validated | ✅ async bcrypt, password policy |
| Session or token login with HttpOnly, SameSite | ✅ JWT in HttpOnly SameSite=Strict cookie |
| Secure flag | ✅ on by default; `COOKIE_SECURE=false` only for local http testing |
| Cookie expiration, no sensitive data in cookies | ✅ 2 hours; only signed token + random CSRF value |
| Log authentication events (success/failure, IP, timestamp) | ✅ `logs/auth.log` |
| Input validation | ✅ all endpoints |
| Prepared statements | ✅ (already present originally) |
| Authentication / authorisation | ✅ JWT, roles checked against DB, ownership checks |
| Security headers | ✅ 5 headers, `X-Powered-By` removed |
| Anti-CSRF tokens | ✅ double-submit cookie |
| Logout endpoint (Milestone 3) | ✅ `POST /auth/logout` |
| Principle of least privilege | ✅ admin checks use current DB role; admins cannot self-demote |
| README (≥100 words, plugins, run steps) | ✅ |
| Multiple commits showing progress | ⚠️ the original history is one commit and cannot honestly be changed; this branch adds several real commits – keep committing regularly from now on |
| Data encryption at rest | ❌ SQLite file is not encrypted (see limitations) |
| HTTPS / secure communication, cloud setup | ❌ deployment task, not backend code |
| Frontend, frontend validation, pen-testing | ❌ later milestones – intentionally not done here |

---

## 10. Differences between the code and the submitted report

These are in the report, not the code. Fix them before re-submitting so the report and code agree:

1. **Admin endpoints:** report says `/admin/allusers` and `/admin/updaterole/:id`; the code uses `/admin/all-users` and `/admin/update-role/:id`.
2. **Messages:** report shows `"Record added"` and `"Userrole updated"`; code returns `"Medical record added"` and `"User role updated"`. The report's `GET /records/pet/:petId` response box is empty.
3. **Appointments table (8.2.1):** the table in the report is a copy of the Pets table (name, species, breed, age). The real columns are `id, user_id, pet_id, date, type, notes, status`.
4. **Status codes:** the report's use case says a missing pet is "denied"; it is now 404 consistently (was 403 on some routes).
5. **Screenshots are mislabelled:** "Pet Creation" shows a signup request; "GET Appointment" shows a POST; "Adding Records" and "GET Records" show `/appointments`; "GET Reminder" shows a POST. The signup uses `adham@tests.com` but login uses `adham@test.com`.
6. **Template leftovers:** "Use Case #1: [Share Playlist]", "[figure 1 caption]", "[Submission Date]", and references to the Spotify and Apple Music APIs, which are unrelated to this project.
7. **Section 6.3 "Authentication Technologies"** actually describes Postman.
8. **Section 7.2** says a `public` folder contains the frontend files; there is no `public` folder.
9. **Use case diagram:** the Admin side shows "Manage Reminders" twice with an include arrow; it should show admin use cases (View All Users, Update User Role).
10. **Security section** says inputs are validated – this is now true, but was not in the submitted code.
11. **New in this version** (should be added to the report): cookies, CSRF token, logout, security headers, rate limiting, auth log, `PUT/DELETE` for records and reminders, password policy, `make-admin` script, automated tests.

---

## 11. Final summary

### 11.1 Files modified
`server.js`, `database/db.js`, `middleware/authMiddleware.js`, `middleware/adminMiddleware.js`, all six files in `routes/`, all six files in `controllers/`, `package.json`, `package-lock.json`, `.gitignore`.

### 11.2 Files added
`utils/validation.js`, `utils/authLogger.js`, `middleware/securityHeaders.js`, `middleware/loginRateLimit.js`, `scripts/makeAdmin.js`, `tests/api.test.js`, `README.md`, `.env.example`, `BACKEND_REVIEW_REPORT.md`.

### 11.3 Bugs and security issues fixed
1. Server crash on login when `JWT_SECRET` is missing.
2. Crash when a request has no JSON body (Express 5).
3. Stack traces, file paths and SQLite errors sent to clients.
4. `X-Powered-By` header revealing Express.
5. No input validation (emails, passwords, dates, statuses, ages, ids).
6. Weak passwords accepted.
7. Role trusted from the token – demoted admins kept access.
8. Admins could demote themselves; no way to create an admin.
9. Deleted users' tokens still worked.
10. Any website could call the API (open CORS).
11. No secure cookies, no CSRF protection, no security headers.
12. No authentication logging.
13. No login rate limiting; no request size limit.
14. Blocking bcrypt calls.
15. Server could start before the tables existed.
16. Inconsistent 403/404 for missing pets.
17. `is_done` could never be updated.
18. 11 known dependency vulnerabilities (now 0).

### 11.4 Unnecessary or repeated code removed
- `if (err) return res.status(500).json({ error: err.message })` after every query (25 lines across the controllers) – replaced by one error handler.
- Nested callbacks – replaced by `async/await`.
- Repeated `(req.body.x !== undefined) ? req.body.x : old.x` lines – replaced by `mergeUpdate()`.
- `verifyToken` repeated on every route line – replaced by `router.use(verifyToken)`.
- String-concatenated SQL – replaced by template literals.
- `.verbose()` and the redundant `!req.user` check.

### 11.5 New dependencies
**None.** `sqlite3` was upgraded from 5.1.7 to 6.0.1 and other packages received patch updates through `npm audit fix`.

### 11.6 Remaining limitations
- **Logout cannot invalidate a copied token.** Logout clears the cookies, but a token that was copied elsewhere stays valid until it expires (2 h). A token blocklist table would fix this.
- The token is still returned in the login JSON so Postman can use it. Once the frontend uses cookies only, consider removing it from the response so JavaScript never sees it.
- **No encryption at rest:** the SQLite file is plain (passwords are hashed). Full encryption would need SQLCipher or disk encryption.
- **Signup reveals whether an email is registered** (409). Common trade-off for usability.
- The rate limiter is in memory (resets on restart, per server). Behind a cloud proxy, `app.set('trust proxy', 1)` is needed so `req.ip` is the real client IP.
- The CSP header must be relaxed when the frontend is served from this server.
- No pagination on list endpoints.
- Tested on Windows after one test-cleanup fix (see 8.4).

---

## 12. Disclosure of AI assistance in this refactoring

So that it can be disclosed accurately to the lecturer:

- This review and refactoring were carried out by **Claude (Anthropic's AI assistant, model Claude Opus 5.5)** on 3 November 2026, at the student's request.
- The AI **cloned the repository, read and ran the original code, wrote all the changed and new code in this branch, wrote the tests, ran them, and wrote this report and the README.**
- The student provided the requirements (assignment brief, original report and a detailed task description) and decides what to keep.
- Every commit on the `backend-review-refactor` branch carries a `Co-Authored-By: Claude` line, so the Git history shows which work involved AI assistance. No commits were backdated and the original `main` history was not changed.
- Nothing was pushed to GitHub.
- The AI did not judge who wrote the original code; section 3 lists observations only.

The student should read through every file and section 7 before the discussion, and be ready to explain any line in their own words.
