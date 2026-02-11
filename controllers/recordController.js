var db = require('../database/db').db;

function addRecord(req, res) {
  var pet_id = req.body.pet_id;
  var record_type = req.body.record_type;
  var record_date = req.body.record_date;
  var details = req.body.details || null;

  if (!pet_id || !record_type || !record_date) {
    return res.status(400).json({ error: "pet_id, record_type, record_date are required" });
  }

  db.get(
    "SELECT id FROM pets WHERE id = ? AND user_id = ?",
    [pet_id, req.user.id],
    function(err, pet) {
      if (err) return res.status(500).json({ error: err.message });
      if (!pet) return res.status(403).json({ error: "You do not own this pet" });

      db.run(
        "INSERT INTO medical_records (user_id, pet_id, record_type, record_date, details) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, pet_id, record_type, record_date, details],
        function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          return res.status(201).json({ message: "Medical record added", id: this.lastID });
        }
      );
    }
  );
}

function getRecordsByPet(req, res) {
  var petId = req.params.petId;

  db.get(
    "SELECT id FROM pets WHERE id = ? AND user_id = ?",
    [petId, req.user.id],
    function(err, pet) {
      if (err) return res.status(500).json({ error: err.message });
      if (!pet) return res.status(403).json({ error: "You do not own this pet" });

      db.all(
        "SELECT * FROM medical_records WHERE pet_id = ? ORDER BY record_date DESC",
        [petId],
        function(err2, rows) {
          if (err2) return res.status(500).json({ error: err2.message });
          return res.json({ message: "Medical records fetched", records: rows });
        }
      );
    }
  );
}

module.exports = {
  addRecord: addRecord,
  getRecordsByPet: getRecordsByPet
};
