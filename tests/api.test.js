// End-to-end tests: start the real server on a temporary database and send HTTP requests to it.
// Run with: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn, execFileSync, spawnSync } = require('node:child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 3999;
const BASE = 'http://localhost:' + PORT;
const ROOT = path.join(__dirname, '..');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'petcare-test-'));

const env = {
  ...process.env,
  PORT: String(PORT),
  JWT_SECRET: 'test-secret',
  DB_PATH: path.join(tmpDir, 'test.sqlite'),
  AUTH_LOG_PATH: path.join(tmpDir, 'auth.log'),
  COOKIE_SECURE: 'true',
  CLIENT_ORIGIN: '',
  LOGIN_MAX_ATTEMPTS: '30'
};

let server;

async function api(method, url, options = {}) {
  const headers = { ...options.headers };
  let body;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }
  if (options.token) headers.Authorization = 'Bearer ' + options.token;
  if (options.cookie) headers.Cookie = options.cookie;

  const res = await fetch(BASE + url, { method, headers, body });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (err) { /* not JSON */ }
  return { status: res.status, body: json, text, headers: res.headers };
}

before(async () => {
  server = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: 'pipe' });
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(BASE + '/');
      if (res.ok) return;
    } catch (err) { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Server did not start');
});

after(async () => {
  // Wait for the server to exit so Windows releases the SQLite file before we delete it.
  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill();
  await exited;
  fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const state = {};

test('server refuses to start without JWT_SECRET', () => {
  const result = spawnSync(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...env, JWT_SECRET: '', PORT: '3998' },
    encoding: 'utf8',
    timeout: 5000
  });
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /JWT_SECRET is not set/);
});

test('GET /health works and security headers are set', async () => {
  const res = await api('GET', '/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.message, 'Pet Care Backend is running');
  assert.strictEqual(res.headers.get('x-powered-by'), null);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
  assert.ok(res.headers.get('content-security-policy'));
  assert.ok(res.headers.get('strict-transport-security'));
});

test('GET / serves the frontend with a strict Content-Security-Policy', async () => {
  const res = await api('GET', '/');
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const csp = res.headers.get('content-security-policy');
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline/);
});

test('unknown route returns JSON 404', async () => {
  const res = await api('GET', '/nope');
  assert.strictEqual(res.status, 404);
  assert.deepStrictEqual(res.body, { error: 'Route not found' });
});

test('malformed JSON returns 400 without a stack trace', async () => {
  const res = await api('POST', '/auth/signup', { body: '{bad' });
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(res.body, { error: 'Invalid JSON body' });
});

test('request with no body returns a validation error, not a crash', async () => {
  const res = await api('POST', '/auth/signup');
  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /username/);
});

test('oversized body returns 413', async () => {
  const res = await api('POST', '/auth/signup', { body: { username: 'x'.repeat(20000) } });
  assert.strictEqual(res.status, 413);
});

test('signup validates input', async () => {
  const bad = [
    { email: 'a@test.com', password: 'Password1' },
    { username: 'a', email: 'not-an-email', password: 'Password1' },
    { username: 'a', email: 'a@test.com', password: '123456' },
    { username: 'a', email: 'a@test.com', password: 'onlyletters' },
    { username: 'a', email: 'a@test.com', password: 12345678 },
    { username: 'x'.repeat(31), email: 'a@test.com', password: 'Password1' }
  ];
  for (const body of bad) {
    const res = await api('POST', '/auth/signup', { body });
    assert.strictEqual(res.status, 400, JSON.stringify(body));
  }
});

test('signup creates users and rejects duplicate emails (case-insensitive)', async () => {
  let res = await api('POST', '/auth/signup', { body: { username: 'alice', email: 'Alice@Test.com', password: 'Password1' } });
  assert.strictEqual(res.status, 201);
  assert.deepStrictEqual(res.body, { message: 'User created successfully' });

  res = await api('POST', '/auth/signup', { body: { username: 'bob', email: 'bob@test.com', password: 'Password2' } });
  assert.strictEqual(res.status, 201);

  res = await api('POST', '/auth/signup', { body: { username: 'alice2', email: 'alice@test.com', password: 'Password1' } });
  assert.strictEqual(res.status, 409);
});

test('login rejects wrong credentials', async () => {
  let res = await api('POST', '/auth/login', { body: { email: 'alice@test.com', password: 'WrongPass1' } });
  assert.strictEqual(res.status, 401);
  res = await api('POST', '/auth/login', { body: { email: 'nobody@test.com', password: 'Password1' } });
  assert.strictEqual(res.status, 401);
  res = await api('POST', '/auth/login', { body: { email: 'alice@test.com' } });
  assert.strictEqual(res.status, 400);
});

test('login returns a token and sets secure cookies', async () => {
  const res = await api('POST', '/auth/login', { body: { email: 'ALICE@test.com', password: 'Password1' } });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.message, 'Login successful');
  assert.ok(res.body.token);

  const cookies = res.headers.getSetCookie();
  const tokenCookie = cookies.find((c) => c.startsWith('token='));
  const csrfCookie = cookies.find((c) => c.startsWith('csrfToken='));
  assert.ok(tokenCookie && csrfCookie);
  assert.match(tokenCookie, /HttpOnly/);
  assert.match(tokenCookie, /Secure/);
  assert.match(tokenCookie, /SameSite=Strict/);
  assert.match(tokenCookie, /Max-Age=7200/);
  assert.doesNotMatch(csrfCookie, /HttpOnly/);
  assert.match(csrfCookie, /SameSite=Strict/);

  state.aliceToken = res.body.token;
  state.aliceCsrf = res.body.csrfToken;
  state.aliceCookie = tokenCookie.split(';')[0] + '; ' + csrfCookie.split(';')[0];

  const bob = await api('POST', '/auth/login', { body: { email: 'bob@test.com', password: 'Password2' } });
  state.bobToken = bob.body.token;
});

test('GET /auth/me works with Bearer token and with cookie', async () => {
  let res = await api('GET', '/auth/me', { token: state.aliceToken });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(Object.keys(res.body.user).sort(), ['email', 'id', 'role', 'username']);
  assert.strictEqual(res.body.user.email, 'alice@test.com');

  res = await api('GET', '/auth/me', { cookie: state.aliceCookie });
  assert.strictEqual(res.status, 200);
});

test('protected routes reject missing, malformed and forged tokens', async () => {
  let res = await api('GET', '/pets');
  assert.strictEqual(res.status, 401);
  res = await api('GET', '/pets', { headers: { Authorization: 'Token abc' } });
  assert.strictEqual(res.status, 401);
  res = await api('GET', '/pets', { token: 'not.a.jwt' });
  assert.strictEqual(res.status, 401);

  const jwt = require('jsonwebtoken');
  const forged = jwt.sign({ id: 1 }, 'wrong-secret');
  res = await api('GET', '/pets', { token: forged });
  assert.strictEqual(res.status, 401);

  const expired = jwt.sign({ id: 1, exp: Math.floor(Date.now() / 1000) - 60 }, 'test-secret');
  res = await api('GET', '/pets', { token: expired });
  assert.strictEqual(res.status, 401);
});

test('cookie requests that change data need the CSRF header', async () => {
  let res = await api('POST', '/pets', { cookie: state.aliceCookie, body: { name: 'NoCsrf' } });
  assert.strictEqual(res.status, 403);

  res = await api('POST', '/pets', { cookie: state.aliceCookie, headers: { 'X-CSRF-Token': 'wrong' }, body: { name: 'BadCsrf' } });
  assert.strictEqual(res.status, 403);

  res = await api('POST', '/pets', { cookie: state.aliceCookie, headers: { 'X-CSRF-Token': state.aliceCsrf }, body: { name: 'Milo', species: 'Cat' } });
  assert.strictEqual(res.status, 201);
  state.miloId = res.body.id;
});

test('pets: create with validation', async () => {
  let res = await api('POST', '/pets', { token: state.aliceToken, body: { name: 'Rex', species: 'Dog', breed: 'Husky', age: 3, notes: 'Friendly' } });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.message, 'Pet created');
  state.rexId = res.body.id;

  const bad = [{}, { name: '' }, { name: '   ' }, { name: 'X', age: 'abc' }, { name: 'X', age: -1 }, { name: 'X', age: 2.5 }, { name: 123 }, { name: 'X', species: 5 }];
  for (const body of bad) {
    res = await api('POST', '/pets', { token: state.aliceToken, body });
    assert.strictEqual(res.status, 400, JSON.stringify(body));
  }
});

test('pets: list only returns your own pets', async () => {
  let res = await api('GET', '/pets', { token: state.aliceToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.pets.length, 2);

  res = await api('GET', '/pets', { token: state.bobToken });
  assert.strictEqual(res.body.pets.length, 0);
});

test('pets: update is partial and validated', async () => {
  let res = await api('PUT', '/pets/' + state.rexId, { token: state.aliceToken, body: { age: 4 } });
  assert.strictEqual(res.status, 200);
  res = await api('GET', '/pets', { token: state.aliceToken });
  const rex = res.body.pets.find((p) => p.id === state.rexId);
  assert.strictEqual(rex.age, 4);
  assert.strictEqual(rex.breed, 'Husky');

  res = await api('PUT', '/pets/' + state.rexId, { token: state.aliceToken, body: { name: null } });
  assert.strictEqual(res.status, 400);
  res = await api('PUT', '/pets/abc', { token: state.aliceToken, body: { age: 1 } });
  assert.strictEqual(res.status, 400);
  res = await api('PUT', '/pets/9999', { token: state.aliceToken, body: { age: 1 } });
  assert.strictEqual(res.status, 404);
});

test('pets: another user cannot update or delete them', async () => {
  let res = await api('PUT', '/pets/' + state.rexId, { token: state.bobToken, body: { name: 'Stolen' } });
  assert.strictEqual(res.status, 404);
  res = await api('DELETE', '/pets/' + state.rexId, { token: state.bobToken });
  assert.strictEqual(res.status, 404);
});

test('SQL injection in input is stored as plain text', async () => {
  const res = await api('POST', '/pets', { token: state.bobToken, body: { name: "x'); DROP TABLE users; --" } });
  assert.strictEqual(res.status, 201);
  const me = await api('GET', '/auth/me', { token: state.aliceToken });
  assert.strictEqual(me.status, 200);
  const pets = await api('GET', '/pets', { token: state.bobToken });
  assert.strictEqual(pets.body.pets[0].name, "x'); DROP TABLE users; --");
  state.bobPetId = res.body.id;
});

test('appointments: create, validate, list, update, delete', async () => {
  let res = await api('POST', '/appointments', { token: state.aliceToken, body: { pet_id: state.rexId, date: '2026-02-20', type: 'Vet Checkup', notes: 'General health check' } });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.message, 'Appointment created');
  const apptId = res.body.id;

  const bad = [
    { pet_id: state.rexId, type: 'Vet' },
    { pet_id: state.rexId, date: 'yesterday', type: 'Vet' },
    { pet_id: state.rexId, date: '2026-02-30', type: 'Vet' },
    { pet_id: state.rexId, date: '2026-02-20' },
    { pet_id: 'abc', date: '2026-02-20', type: 'Vet' },
    { pet_id: true, date: '2026-02-20', type: 'Vet' },
    { pet_id: state.rexId, date: '2026-02-20', type: 'Vet', status: 'unknown' }
  ];
  for (const body of bad) {
    res = await api('POST', '/appointments', { token: state.aliceToken, body });
    assert.strictEqual(res.status, 400, JSON.stringify(body));
  }

  res = await api('POST', '/appointments', { token: state.aliceToken, body: { pet_id: state.bobPetId, date: '2026-02-20', type: 'Vet' } });
  assert.strictEqual(res.status, 404, 'cannot book for another user\'s pet');

  res = await api('GET', '/appointments', { token: state.aliceToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.appointments.length, 1);
  assert.strictEqual(res.body.appointments[0].status, 'scheduled');

  res = await api('PUT', '/appointments/' + apptId, { token: state.aliceToken, body: { status: 'completed' } });
  assert.strictEqual(res.status, 200);
  res = await api('PUT', '/appointments/' + apptId, { token: state.aliceToken, body: { status: '<script>' } });
  assert.strictEqual(res.status, 400);
  res = await api('PUT', '/appointments/' + apptId, { token: state.bobToken, body: { status: 'cancelled' } });
  assert.strictEqual(res.status, 404);

  res = await api('GET', '/appointments', { token: state.aliceToken });
  assert.strictEqual(res.body.appointments[0].status, 'completed');

  res = await api('DELETE', '/appointments/' + apptId, { token: state.bobToken });
  assert.strictEqual(res.status, 404);
  res = await api('DELETE', '/appointments/' + apptId, { token: state.aliceToken });
  assert.strictEqual(res.status, 200);
  res = await api('DELETE', '/appointments/' + apptId, { token: state.aliceToken });
  assert.strictEqual(res.status, 404);
});

test('medical records: create, validate, list, update, delete', async () => {
  let res = await api('POST', '/records', { token: state.aliceToken, body: { pet_id: state.rexId, record_type: 'Vaccination', record_date: '2026-01-10', details: 'Rabies' } });
  assert.strictEqual(res.status, 201);
  const recordId = res.body.id;

  res = await api('POST', '/records', { token: state.aliceToken, body: { pet_id: state.rexId, record_type: 'Vaccination' } });
  assert.strictEqual(res.status, 400);
  res = await api('POST', '/records', { token: state.aliceToken, body: { pet_id: 9999, record_type: 'X', record_date: '2026-01-10' } });
  assert.strictEqual(res.status, 404);

  res = await api('GET', '/records/pet/' + state.rexId, { token: state.aliceToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.records.length, 1);
  res = await api('GET', '/records/pet/' + state.rexId, { token: state.bobToken });
  assert.strictEqual(res.status, 404);

  res = await api('PUT', '/records/' + recordId, { token: state.aliceToken, body: { details: 'Rabies booster' } });
  assert.strictEqual(res.status, 200);
  res = await api('PUT', '/records/' + recordId, { token: state.bobToken, body: { details: 'x' } });
  assert.strictEqual(res.status, 404);
  res = await api('GET', '/records/pet/' + state.rexId, { token: state.aliceToken });
  assert.strictEqual(res.body.records[0].details, 'Rabies booster');

  res = await api('DELETE', '/records/' + recordId, { token: state.aliceToken });
  assert.strictEqual(res.status, 200);
});

test('reminders: create, validate, list, mark done, delete', async () => {
  let res = await api('POST', '/reminders', { token: state.aliceToken, body: { pet_id: state.rexId, title: 'Give Medication', due_date: '2026-02-22', notes: 'After dinner' } });
  assert.strictEqual(res.status, 201);
  const reminderId = res.body.id;

  res = await api('POST', '/reminders', { token: state.aliceToken, body: { pet_id: state.rexId, title: 'X', due_date: '22/02/2026' } });
  assert.strictEqual(res.status, 400);

  res = await api('GET', '/reminders/pet/' + state.rexId, { token: state.aliceToken });
  assert.strictEqual(res.body.reminders.length, 1);
  assert.strictEqual(res.body.reminders[0].is_done, 0);

  res = await api('PUT', '/reminders/' + reminderId, { token: state.aliceToken, body: { is_done: true } });
  assert.strictEqual(res.status, 200);
  res = await api('PUT', '/reminders/' + reminderId, { token: state.aliceToken, body: { is_done: 'yes' } });
  assert.strictEqual(res.status, 400);
  res = await api('GET', '/reminders/pet/' + state.rexId, { token: state.aliceToken });
  assert.strictEqual(res.body.reminders[0].is_done, 1);

  res = await api('DELETE', '/reminders/' + reminderId, { token: state.bobToken });
  assert.strictEqual(res.status, 404);
  res = await api('DELETE', '/reminders/' + reminderId, { token: state.aliceToken });
  assert.strictEqual(res.status, 200);
});

test('deleting a pet also deletes its appointments, records and reminders', async () => {
  await api('POST', '/appointments', { token: state.aliceToken, body: { pet_id: state.miloId, date: '2026-03-01', type: 'Grooming' } });
  await api('POST', '/records', { token: state.aliceToken, body: { pet_id: state.miloId, record_type: 'Checkup', record_date: '2026-03-01' } });
  await api('POST', '/reminders', { token: state.aliceToken, body: { pet_id: state.miloId, title: 'Feed', due_date: '2026-03-02' } });

  let res = await api('DELETE', '/pets/' + state.miloId, { token: state.aliceToken });
  assert.strictEqual(res.status, 200);

  // Check the database file directly to prove the child rows are really gone.
  const sqlite3 = require('sqlite3');
  const db = new sqlite3.Database(env.DB_PATH);
  const count = (table) => new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS n FROM ' + table + ' WHERE pet_id = ?', [state.miloId], (err, row) => {
      if (err) reject(err); else resolve(row.n);
    });
  });
  assert.strictEqual(await count('appointments'), 0);
  assert.strictEqual(await count('medical_records'), 0);
  assert.strictEqual(await count('reminders'), 0);
  db.close();
});

test('admin routes are blocked for normal users', async () => {
  let res = await api('GET', '/admin/all-users', { token: state.aliceToken });
  assert.strictEqual(res.status, 403);
  res = await api('GET', '/admin/all-users');
  assert.strictEqual(res.status, 401);
});

test('make-admin script promotes a user, and the change applies to the existing token', async () => {
  const output = execFileSync(process.execPath, ['scripts/makeAdmin.js', 'alice@test.com'], { cwd: ROOT, env, encoding: 'utf8' });
  assert.match(output, /is now an admin/);

  const res = await api('GET', '/admin/all-users', { token: state.aliceToken });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.users.length, 2);
  for (const user of res.body.users) {
    assert.strictEqual(user.password, undefined);
  }
});

test('admin can change roles, with validation', async () => {
  const users = (await api('GET', '/admin/all-users', { token: state.aliceToken })).body.users;
  const alice = users.find((u) => u.email === 'alice@test.com');
  const bob = users.find((u) => u.email === 'bob@test.com');

  let res = await api('PUT', '/admin/update-role/' + bob.id, { token: state.aliceToken, body: { role: 'superuser' } });
  assert.strictEqual(res.status, 400);
  res = await api('PUT', '/admin/update-role/9999', { token: state.aliceToken, body: { role: 'admin' } });
  assert.strictEqual(res.status, 404);
  res = await api('PUT', '/admin/update-role/' + alice.id, { token: state.aliceToken, body: { role: 'user' } });
  assert.strictEqual(res.status, 400, 'admin cannot demote themselves');

  res = await api('PUT', '/admin/update-role/' + bob.id, { token: state.aliceToken, body: { role: 'admin' } });
  assert.strictEqual(res.status, 200);
  res = await api('GET', '/admin/all-users', { token: state.bobToken });
  assert.strictEqual(res.status, 200, 'bob is admin straight away');

  res = await api('PUT', '/admin/update-role/' + alice.id, { token: state.bobToken, body: { role: 'user' } });
  assert.strictEqual(res.status, 200);
  res = await api('GET', '/admin/all-users', { token: state.aliceToken });
  assert.strictEqual(res.status, 403, 'demoted admin loses access with the same token');
});

test('logout clears both cookies', async () => {
  const res = await api('POST', '/auth/logout');
  assert.strictEqual(res.status, 200);
  const cookies = res.headers.getSetCookie();
  assert.ok(cookies.some((c) => c.startsWith('token=;') && /Expires=Thu, 01 Jan 1970/.test(c)));
  assert.ok(cookies.some((c) => c.startsWith('csrfToken=;')));
});

test('auth events are logged as JSON lines with time, event, email and IP', async () => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const lines = fs.readFileSync(env.AUTH_LOG_PATH, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const events = lines.map((l) => l.event);
  for (const expected of ['SIGNUP_SUCCESS', 'SIGNUP_FAILED', 'LOGIN_FAILED', 'LOGIN_SUCCESS', 'LOGOUT']) {
    assert.ok(events.includes(expected), expected);
  }
  assert.ok(events.some((e) => e.startsWith('ROLE_CHANGED')));
  for (const line of lines) {
    assert.ok(line.time && line.ip);
  }
});

test('login is rate limited per IP', async () => {
  let res;
  for (let i = 0; i < 31; i++) {
    res = await api('POST', '/auth/login', { body: { email: 'bob@test.com', password: 'WrongPass1' } });
  }
  assert.strictEqual(res.status, 429);
});
