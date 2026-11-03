const jwt = require('jsonwebtoken');
const { get } = require('../database/db');

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Reads one cookie from the raw "Cookie" request header.
function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

// Accepts the JWT from either the "Authorization: Bearer" header (Postman / API clients)
// or the HttpOnly "token" cookie (browser frontend).
async function verifyToken(req, res, next) {
  let token;
  let usingCookie = false;

  const header = req.headers.authorization;
  if (header) {
    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid Authorization format' });
    }
    token = parts[1];
  } else {
    token = readCookie(req, 'token');
    usingCookie = true;
  }

  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Browsers send cookies automatically, so requests that change data must also
  // send the CSRF token in a header. Another website cannot read our cookie to copy it.
  if (usingCookie && !SAFE_METHODS.includes(req.method)) {
    const csrfCookie = readCookie(req, 'csrfToken');
    if (!csrfCookie || req.get('X-CSRF-Token') !== csrfCookie) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
  }

  // Load the user from the database so a deleted user or a changed role takes effect immediately.
  const user = await get('SELECT id, username, email, role FROM users WHERE id = ?', [payload.id]);
  if (!user) {
    return res.status(401).json({ error: 'User no longer exists' });
  }

  req.user = user;
  next();
}

module.exports = { verifyToken };
