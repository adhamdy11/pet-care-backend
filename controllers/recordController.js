const { get, all, run } = require('../database/db');
const { isNonEmptyString, isOptionalString, isValidDate, toId, mergeUpdate } = require('../utils/validation');

const RECORD_FIELDS = ['record_type', 'record_date', 'details'];

function checkRecord(record) {
  if (!isNonEmptyString(record.record_type, 50)) return 'record_type is required (max 50 characters)';
  if (!isValidDate(record.record_date)) return 'record_date must be a valid date in YYYY-MM-DD format';
  if (!isOptionalString(record.details, 2000)) return 'details must be text (max 2000 characters)';
  return null;
}

async function addRecord(req, res) {
  const petId = toId(req.body.pet_id);
  if (!petId) return res.status(400).json({ error: 'A valid pet_id is required' });

  const record = mergeUpdate({}, req.body, RECORD_FIELDS);
  const error = checkRecord(record);
  if (error) return res.status(400).json({ error });

  const pet = await get('SELECT id FROM pets WHERE id = ? AND user_id = ?', [petId, req.user.id]);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });

  const result = await run(
    'INSERT INTO medical_records (user_id, pet_id, record_type, record_date, details) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, petId, record.record_type, record.record_date, record.details ?? null]
  );
  res.status(201).json({ message: 'Medical record added', id: result.insertId });
}

async function getRecordsByPet(req, res) {
  const petId = toId(req.params.petId);
  if (!petId) return res.status(400).json({ error: 'Invalid pet id' });

  const pet = await get('SELECT id FROM pets WHERE id = ? AND user_id = ?', [petId, req.user.id]);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });

  const records = await all(
    'SELECT * FROM medical_records WHERE pet_id = ? ORDER BY record_date DESC',
    [petId]
  );
  res.json({ message: 'Medical records fetched', records: records });
}

async function updateRecord(req, res) {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid record id' });

  const existing = await get('SELECT * FROM medical_records WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Record not found' });

  const record = mergeUpdate(existing, req.body, RECORD_FIELDS);
  const error = checkRecord(record);
  if (error) return res.status(400).json({ error });

  await run(
    'UPDATE medical_records SET record_type = ?, record_date = ?, details = ? WHERE id = ? AND user_id = ?',
    [record.record_type, record.record_date, record.details, id, req.user.id]
  );
  res.json({ message: 'Medical record updated' });
}

async function deleteRecord(req, res) {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid record id' });

  const result = await run('DELETE FROM medical_records WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Record not found' });

  res.json({ message: 'Medical record deleted' });
}

module.exports = { addRecord, getRecordsByPet, updateRecord, deleteRecord };
