// Every signup gets the 'user' role, so the first admin has to be created here.
// Usage: npm run make-admin -- someone@example.com
require('dotenv').config();
const { initDb, run, pool } = require('../database/db');

const email = process.argv[2];

if (!email) {
  console.log('Usage: npm run make-admin -- someone@example.com');
  process.exit(1);
}

initDb()
  .then(() => run("UPDATE users SET role = 'admin' WHERE email = ?", [email.trim().toLowerCase()]))
  .then((result) => {
    if (result.affectedRows === 0) {
      console.log('No user found with that email. Sign up first.');
    } else {
      console.log(email + ' is now an admin.');
    }
    return pool.end();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
