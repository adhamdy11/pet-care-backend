var db = require('../database/db').db;

function createReminder(req, res) {
  var pet_id = req.body.pet_id;
  var title = req.body.title;
  var due_date = req.body.due_date;
  var notes = req.body.notes || null;

  if (!pet_id || !title || !due_date) {
    return res.status(400).json({ error: "pet_id, title, due_date are required" });
  }

  db.get(
    "SELECT id FROM pets WHERE id = ? AND user_id = ?",
    [pet_id, req.user.id],
    function(err, pet) {
      if (err) return res.status(500).json({ error: err.message });
      if (!pet) return res.status(403).json({ error: "You do not own this pet" });

      db.run(
        "INSERT INTO reminders (user_id, pet_id, title, due_date, notes) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, pet_id, title, due_date, notes],
        function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          return res.status(201).json({ message: "Reminder created", id: this.lastID });
        }
      );
    }
  );
}

function getRemindersByPet(req, res) {
  var petId = req.params.petId;

  db.get(
    "SELECT id FROM pets WHERE id = ? AND user_id = ?",
    [petId, req.user.id],
    function(err, pet) {
      if (err) return res.status(500).json({ error: err.message });
      if (!pet) return res.status(403).json({ error: "You do not own this pet" });

      db.all(
        "SELECT * FROM reminders WHERE pet_id = ? ORDER BY due_date ASC",
        [petId],
        function(err2, rows) {
          if (err2) return res.status(500).json({ error: err2.message });
          return res.json({ message: "Reminders fetched", reminders: rows });
        }
      );
    }
  );
}

module.exports = {
  createReminder: createReminder,
  getRemindersByPet: getRemindersByPet
};
