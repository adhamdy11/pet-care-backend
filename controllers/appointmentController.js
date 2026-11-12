const { get, all, run } = require('../database/db');
const { isNonEmptyString, isOptionalString, isValidDate, toId, mergeUpdate } = require('../utils/validation');

const APPOINTMENT_FIELDS = ['date', 'type', 'notes', 'status'];
const STATUSES = ['scheduled', 'completed', 'cancelled'];

function checkAppointment(appointment) {
  if (!isValidDate(appointment.date)) return 'date must be a valid date in YYYY-MM-DD format';
  if (!isNonEmptyString(appointment.type, 50)) return 'type is required (max 50 characters)';
  if (!isOptionalString(appointment.notes, 1000)) return 'notes must be text (max 1000 characters)';
  if (appointment.status !== undefined && !STATUSES.includes(appointment.status)) {
    return 'status must be one of: ' + STATUSES.join(', ');
  }
  return null;
}

async function createAppointment(req, res) {
  const petId = toId(req.body.pet_id);
  if (!petId) return res.status(400).json({ error: 'A valid pet_id is required' });

  const appointment = mergeUpdate({}, req.body, APPOINTMENT_FIELDS);
  const error = checkAppointment(appointment);
  if (error) return res.status(400).json({ error });

  const pet = await get('SELECT id FROM pets WHERE id = ? AND user_id = ?', [petId, req.user.id]);
  if (!pet) return res.status(404).json({ error: 'Pet not found' });

  const result = await run(
    'INSERT INTO appointments (user_id, pet_id, date, type, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, petId, appointment.date, appointment.type, appointment.notes ?? null, appointment.status ?? 'scheduled']
  );
  res.status(201).json({ message: 'Appointment created', id: result.insertId });
}

async function getMyAppointments(req, res) {
  const appointments = await all(
    'SELECT * FROM appointments WHERE user_id = ? ORDER BY date DESC',
    [req.user.id]
  );
  res.json({ message: 'Appointments fetched', appointments: appointments });
}

async function updateAppointment(req, res) {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid appointment id' });

  const existing = await get('SELECT * FROM appointments WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Appointment not found' });

  const appointment = mergeUpdate(existing, req.body, APPOINTMENT_FIELDS);
  const error = checkAppointment(appointment);
  if (error) return res.status(400).json({ error });

  await run(
    'UPDATE appointments SET date = ?, type = ?, notes = ?, status = ? WHERE id = ? AND user_id = ?',
    [appointment.date, appointment.type, appointment.notes, appointment.status, id, req.user.id]
  );
  res.json({ message: 'Appointment updated' });
}

async function deleteAppointment(req, res) {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid appointment id' });

  const result = await run('DELETE FROM appointments WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Appointment not found' });

  res.json({ message: 'Appointment deleted' });
}

module.exports = { createAppointment, getMyAppointments, updateAppointment, deleteAppointment };
