const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 10;

// ip address -> { count, windowStart }. Kept in memory, so it resets when the server restarts.
const attempts = new Map();

function loginRateLimit(req, res, next) {
  const now = Date.now();
  const entry = attempts.get(req.ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(req.ip, { count: 1, windowStart: now });
    return next();
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  }
  next();
}

module.exports = loginRateLimit;
