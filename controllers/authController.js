const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { get, run } = require('../database/db');
const { isNonEmptyString, isValidEmail, isStrongPassword } = require('../utils/validation');
const { logAuthEvent } = require('../utils/authLogger');

const SESSION_HOURS = 2;

const cookieOptions = {
  secure: process.env.COOKIE_SECURE !== 'false',
  sameSite: 'strict',
  maxAge: SESSION_HOURS * 60 * 60 * 1000,
  path: '/'
};

async function signup(req, res) {
  const { username, email, password } = req.body;

  if (!isNonEmptyString(username, 30)) {
    return res.status(400).json({ error: 'username is required (max 30 characters)' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      error: 'password must be 8-72 characters and contain at least one letter and one number'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await run(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')",
      [username.trim(), cleanEmail, hashedPassword]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      logAuthEvent(req, 'SIGNUP_FAILED', cleanEmail);
      return res.status(409).json({ error: 'Email already exists' });
    }
    throw err;
  }

  logAuthEvent(req, 'SIGNUP_SUCCESS', cleanEmail);
  res.status(201).json({ message: 'User created successfully' });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await get('SELECT * FROM users WHERE email = ?', [cleanEmail]);
  const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;

  if (!passwordMatches) {
    logAuthEvent(req, 'LOGIN_FAILED', cleanEmail);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: SESSION_HOURS + 'h'
  });
  const csrfToken = crypto.randomBytes(32).toString('hex');

  res.cookie('token', token, { ...cookieOptions, httpOnly: true });
  res.cookie('csrfToken', csrfToken, { ...cookieOptions, httpOnly: false });

  logAuthEvent(req, 'LOGIN_SUCCESS', cleanEmail);
  res.json({ message: 'Login successful', token: token, csrfToken: csrfToken });
}

function logout(req, res) {
  res.clearCookie('token', { ...cookieOptions, httpOnly: true });
  res.clearCookie('csrfToken', cookieOptions);
  logAuthEvent(req, 'LOGOUT', null);
  res.json({ message: 'Logged out' });
}

function me(req, res) {
  res.json({ message: 'User profile fetched', user: req.user });
}

module.exports = { signup, login, logout, me };
