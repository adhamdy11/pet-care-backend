var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var db = require('../database/db').db;

function signup(req, res) {
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, password are required" });
  }

  var hashed = bcrypt.hashSync(password, 10);

  var sql = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')";
  db.run(sql, [username, email, hashed], function(err) {
    if (err) {
      if (String(err.message).indexOf("UNIQUE") !== -1) {
        return res.status(409).json({ error: "Email already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    return res.status(201).json({ message: "User created successfully" });
  });
}

function login(req, res) {
  var email = req.body.email;
  var password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], function(err, user) {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    var ok = bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    var token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({ message: "Login successful", token: token });
  });
}

function me(req, res) {
  db.get("SELECT id, username, email, role FROM users WHERE id = ?", [req.user.id], function(err, row) {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "User not found" });

    return res.json({ message: "User profile fetched", user: row });
  });
}

module.exports = {
  signup: signup,
  login: login,
  me: me
};
