const { get, all, run } = require('../database/db');
const { isNonEmptyString, isOptionalString, isValidDate, toId, mergeUpdate } = require('../utils/validation');

const REMINDER_FIELDS = ['title', 'due_date', 'notes', 'is_done'];

function checkReminder(reminder) {
  if (!isNonEmptyString(reminder.title, 100)) return 'title is required (max 100 characters)';
  if (!isValidDate(reminder.due_date)) return 'due_date must be a valid date in YYYY-MM-DD format';
  if (!isOptionalString(reminder.notes, 1000)) return 'notes must be text (max 1000 characters)';
  if (reminder.is_done !== undefined && ![true, false, 0, 1].includes(reminder.is_done)) {
    return 'is_done must be true or false';
  }
  return null;
}

async function createReminder(req, res) {
  const petId = toId(req.body.pet_id);
  if (!petId) return res.status(400).json({ error: 'A valid pet_id is required' });

  const reminder = mergeUpdate({}, req.body, REMINDER_FIELDS);
  const error = checkReminder(reminder);
  if (error) return res.status(400).json({ error });

  const pet = await get('SELECT id FROM pets WHERE id = ? AND user_id = ?', [petId, req.user.id]);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });

  const result = await run(
    'INSERT INTO reminders (user_id, pet_id, title, due_date, notes, is_done) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, petId, reminder.title, reminder.due_date, reminder.notes ?? null, reminder.is_done ? 1 : 0]
  );
  res.status(201).json({ message: 'Reminder created', id: result.insertId });
}

async function getRemindersByPet(req, res) {
  const petId = toId(req.params.petId);
  if (!petId) return res.status(400).json({ error: 'Invalid pet id' });

  const pet = await get('SELECT id FROM pets WHERE id = ? AND user_id = ?', [petId, req.user.id]);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });

  const reminders = await all(
    'SELECT * FROM reminders WHERE pet_id = ? ORDER BY due_date ASC',
    [petId]
  );
  res.json({ message: 'Reminders fetched', reminders: reminders });
}

async function updateReminder(req, res) {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid reminder id' });

  const existing = await get('SELECT * FROM reminders WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Reminder not found' });

  const reminder = mergeUpdate(existing, req.body, REMINDER_FIELDS);
  const error = checkReminder(reminder);
  if (error) return res.status(400).json({ error });

  await run(
    'UPDATE reminders SET title = ?, due_date = ?, notes = ?, is_done = ? WHERE id = ? AND user_id = ?',
    [reminder.title, reminder.due_date, reminder.notes, reminder.is_done ? 1 : 0, id, req.user.id]
  );
  res.json({ message: 'Reminder updated' });
}

async function deleteReminder(req, res) {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid reminder id' });

  const result = await run('DELETE FROM reminders WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Reminder not found' });

  res.json({ message: 'Reminder deleted' });
}

module.exports = { createReminder, getRemindersByPet, updateReminder, deleteReminder };
