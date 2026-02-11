var db = require('../database/db').db;

function createAppointment(req, res) {
  var pet_id = req.body.pet_id;
  var date = req.body.date;
  var type = req.body.type;
  var notes = req.body.notes || null;

  if (!pet_id || !date || !type) {
    return res.status(400).json({ error: "pet_id, date, type are required" });
  }

  db.get("SELECT id FROM pets WHERE id = ? AND user_id = ?", [pet_id, req.user.id], function(err, pet) {
    if (err) return res.status(500).json({ error: err.message });
    if (!pet) return res.status(403).json({ error: "You do not own this pet" });

    db.run(
      "INSERT INTO appointments (user_id, pet_id, date, type, notes) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, pet_id, date, type, notes],
      function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        return res.status(201).json({ message: "Appointment created", id: this.lastID });
      }
    );
  });
}

function getMyAppointments(req, res) {
  db.all(
    "SELECT * FROM appointments WHERE user_id = ? ORDER BY date DESC",
    [req.user.id],
    function(err, rows) {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ message: "Appointments fetched", appointments: rows });
    }
  );
}

function updateAppointment(req, res) {
  var id = req.params.id;

  db.get("SELECT * FROM appointments WHERE id = ? AND user_id = ?", [id, req.user.id], function(err, appt) {
    if (err) return res.status(500).json({ error: err.message });
    if (!appt) return res.status(404).json({ error: "Appointment not found" });

    var date = (req.body.date !== undefined) ? req.body.date : appt.date;
    var type = (req.body.type !== undefined) ? req.body.type : appt.type;
    var notes = (req.body.notes !== undefined) ? req.body.notes : appt.notes;
    var status = (req.body.status !== undefined) ? req.body.status : appt.status;

    db.run(
      "UPDATE appointments SET date=?, type=?, notes=?, status=? WHERE id=? AND user_id=?",
      [date, type, notes, status, id, req.user.id],
      function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        return res.json({ message: "Appointment updated" });
      }
    );
  });
}

function deleteAppointment(req, res) {
  var id = req.params.id;

  db.run("DELETE FROM appointments WHERE id = ? AND user_id = ?", [id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Appointment not found" });

    return res.json({ message: "Appointment deleted" });
  });
}

module.exports = {
  createAppointment: createAppointment,
  getMyAppointments: getMyAppointments,
  updateAppointment: updateAppointment,
  deleteAppointment: deleteAppointment
};
