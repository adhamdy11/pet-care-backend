const { get, all, run } = require('../database/db');
const { isNonEmptyString, isOptionalString, toId, mergeUpdate } = require('../utils/validation');

const PET_FIELDS = ['name', 'species', 'breed', 'age', 'notes'];

// Returns an error message, or null if the pet data is valid.
function checkPet(pet) {
  if (!isNonEmptyString(pet.name, 50)) return 'name is required (max 50 characters)';
  if (!isOptionalString(pet.species, 50)) return 'species must be text (max 50 characters)';
  if (!isOptionalString(pet.breed, 50)) return 'breed must be text (max 50 characters)';
  if (pet.age !== undefined && pet.age !== null &&
      !(Number.isInteger(pet.age) && pet.age >= 0 && pet.age <= 100)) {
    return 'age must be a whole number between 0 and 100';
  }
  if (!isOptionalString(pet.notes, 1000)) return 'notes must be text (max 1000 characters)';
  return null;
}

async function createPet(req, res) {
  const pet = mergeUpdate({}, req.body, PET_FIELDS);
  const error = checkPet(pet);
  if (error) return res.status(400).json({ error });

  const result = await run(
    'INSERT INTO pets (user_id, name, species, breed, age, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, pet.name, pet.species ?? null, pet.breed ?? null, pet.age ?? null, pet.notes ?? null]
  );
  res.status(201).json({ message: 'Pet created', id: result.lastID });
}

async function getMyPets(req, res) {
  const pets = await all('SELECT * FROM pets WHERE user_id = ? ORDER BY id', [req.user.id]);
  res.json({ message: 'Pets fetched', pets: pets });
}

async function updatePet(req, res) {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid pet id' });

  const existing = await get('SELECT * FROM pets WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Pet not found' });

  const pet = mergeUpdate(existing, req.body, PET_FIELDS);
  const error = checkPet(pet);
  if (error) return res.status(400).json({ error });

  await run(
    'UPDATE pets SET name = ?, species = ?, breed = ?, age = ?, notes = ? WHERE id = ? AND user_id = ?',
    [pet.name, pet.species, pet.breed, pet.age, pet.notes, id, req.user.id]
  );
  res.json({ message: 'Pet updated' });
}

// Deleting a pet also deletes its appointments, records and reminders (ON DELETE CASCADE).
async function deletePet(req, res) {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid pet id' });

  const result = await run('DELETE FROM pets WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (result.changes === 0) return res.status(404).json({ error: 'Pet not found' });

  res.json({ message: 'Pet deleted' });
}

module.exports = { createPet, getMyPets, updatePet, deletePet };
