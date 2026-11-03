const { all, run } = require('../database/db');
const { toId } = require('../utils/validation');
const { logAuthEvent } = require('../utils/authLogger');

async function getAllUsers(req, res) {
  const users = await all('SELECT id, username, email, role FROM users ORDER BY id');
  res.json({ message: 'All users fetched', users: users });
}

async function updateRole(req, res) {
  const id = toId(req.params.id);
  const role = req.body.role;

  if (!id) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  if (role !== 'user' && role !== 'admin') {
    return res.status(400).json({ error: "role must be 'user' or 'admin'" });
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  const result = await run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  logAuthEvent(req, 'ROLE_CHANGED user_id=' + id + ' role=' + role, req.user.email);
  res.json({ message: 'User role updated' });
}

module.exports = { getAllUsers, updateRole };
