var db = require('../database/db').db;

function createPet(req, res) {
  var name = req.body.name;
  var species = req.body.species || null;
  var breed = req.body.breed || null;
  var age = (req.body.age !== undefined) ? req.body.age : null;
  var notes = req.body.notes || null;

  if (!name) return res.status(400).json({ error: "name is required" });

  var sql = "INSERT INTO pets (user_id, name, species, breed, age, notes) VALUES (?, ?, ?, ?, ?, ?)";
  db.run(sql, [req.user.id, name, species, breed, age, notes], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    return res.status(201).json({ message: "Pet created", id: this.lastID });
  });
}

function getMyPets(req, res) {
  db.all("SELECT * FROM pets WHERE user_id = ?", [req.user.id], function(err, rows) {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: "Pets fetched", pets: rows });
  });
}

function updatePet(req, res) {
  var petId = req.params.id;

  db.get("SELECT * FROM pets WHERE id = ? AND user_id = ?", [petId, req.user.id], function(err, pet) {
    if (err) return res.status(500).json({ error: err.message });
    if (!pet) return res.status(404).json({ error: "Pet not found" });

    var name = (req.body.name !== undefined) ? req.body.name : pet.name;
    var species = (req.body.species !== undefined) ? req.body.species : pet.species;
    var breed = (req.body.breed !== undefined) ? req.body.breed : pet.breed;
    var age = (req.body.age !== undefined) ? req.body.age : pet.age;
    var notes = (req.body.notes !== undefined) ? req.body.notes : pet.notes;

    db.run(
      "UPDATE pets SET name=?, species=?, breed=?, age=?, notes=? WHERE id=? AND user_id=?",
      [name, species, breed, age, notes, petId, req.user.id],
      function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        return res.json({ message: "Pet updated" });
      }
    );
  });
}

function deletePet(req, res) {
  var petId = req.params.id;

  db.run("DELETE FROM pets WHERE id = ? AND user_id = ?", [petId, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Pet not found" });

    return res.json({ message: "Pet deleted" });
  });
}

module.exports = {
  createPet: createPet,
  getMyPets: getMyPets,
  updatePet: updatePet,
  deletePet: deletePet
};
