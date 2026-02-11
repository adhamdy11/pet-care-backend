var db = require('../database/db').db;

function getAllUsers(req, res) {
  db.all("SELECT id, username, email, role FROM users", [], function(err, rows) {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: "All users fetched", users: rows });
  });
}

function updateRole(req, res) {
  var id = req.params.id;
  var role = req.body.role;

  if (!role || (role !== 'user' && role !== 'admin')) {
    return res.status(400).json({ error: "role must be 'user' or 'admin'" });
  }

  db.run("UPDATE users SET role = ? WHERE id = ?", [role, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "User not found" });

    return res.json({ message: "User role updated" });
  });
}

module.exports = {
  getAllUsers: getAllUsers,
  updateRole: updateRole
};
