const fs = require('fs');
const path = require('path');

const logFile = process.env.AUTH_LOG_PATH || path.join(__dirname, '..', 'logs', 'auth.log');
fs.mkdirSync(path.dirname(logFile), { recursive: true });

// Each event is written as one line of JSON. JSON.stringify escapes newlines,
// so a user cannot fake extra log lines by putting "\n" in their email.
function logAuthEvent(req, event, email) {
  const entry = {
    time: new Date().toISOString(),
    event: event,
    email: email || null,
    ip: req.ip
  };

  fs.appendFile(logFile, JSON.stringify(entry) + '\n', (err) => {
    if (err) console.error('Could not write auth log:', err.message);
  });
}

module.exports = { logAuthEvent };
