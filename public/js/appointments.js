const appointmentForm = document.getElementById('appointment-form');
const rows = document.getElementById('appointment-rows');

const fields = {
  id: document.getElementById('appointment-id'),
  pet: document.getElementById('pet'),
  date: document.getElementById('date'),
  type: document.getElementById('type'),
  status: document.getElementById('status'),
  notes: document.getElementById('notes')
};

// pet id -> pet name, so the table can show names instead of ids.
const petNames = {};

async function loadPets() {
  const data = await api('GET', '/pets');
  fields.pet.innerHTML = '';

  for (const pet of data.pets) {
    petNames[pet.id] = pet.name;
    const option = createElement('option', pet.name);
    option.value = pet.id;
    fields.pet.appendChild(option);
  }

  if (data.pets.length === 0) {
    document.getElementById('no-pets').classList.remove('hidden');
    appointmentForm.classList.add('hidden');
  }
}

async function loadAppointments() {
  const data = await api('GET', '/appointments');
  rows.innerHTML = '';

  if (data.appointments.length === 0) {
    const row = createElement('tr');
    const cell = createElement('td', 'No appointments yet.', 'empty');
    cell.colSpan = 6;
    row.appendChild(cell);
    rows.appendChild(row);
    return;
  }

  for (const appointment of data.appointments) {
    rows.appendChild(createRow(appointment));
  }
}

function createRow(appointment) {
  const row = createElement('tr');
  row.appendChild(createElement('td', formatDate(appointment.date)));
  row.appendChild(createElement('td', petNames[appointment.pet_id]));
  row.appendChild(createElement('td', appointment.type));

  const statusCell = createElement('td');
  statusCell.appendChild(createElement('span', appointment.status, 'badge ' + appointment.status));
  row.appendChild(statusCell);

  row.appendChild(createElement('td', appointment.notes || ''));

  const actions = createElement('td', null, 'actions');
  if (appointment.status === 'scheduled') {
    actions.appendChild(createButton('Mark completed', 'button-secondary button-small',
      () => setStatus(appointment, 'completed')));
  }
  actions.appendChild(createButton('Edit', 'button-secondary button-small', () => startEdit(appointment)));
  actions.appendChild(createButton('Delete', 'button-danger button-small', () => deleteAppointment(appointment)));
  row.appendChild(actions);
  return row;
}

async function setStatus(appointment, status) {
  try {
    await api('PUT', '/appointments/' + appointment.id, { status: status });
    showMessage('message', 'Appointment marked as ' + status + '.', 'success');
    await loadAppointments();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
}

function startEdit(appointment) {
  fields.id.value = appointment.id;
  fields.pet.value = appointment.pet_id;
  fields.pet.disabled = true; // the backend does not move an appointment to another pet
  fields.date.value = appointment.date;
  fields.type.value = appointment.type;
  fields.status.value = appointment.status;
  fields.notes.value = appointment.notes || '';

  document.getElementById('form-title').textContent = 'Edit appointment';
  document.getElementById('save-button').textContent = 'Save changes';
  document.getElementById('cancel-button').classList.remove('hidden');
  document.getElementById('form-card').scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
  appointmentForm.reset();
  fields.id.value = '';
  fields.pet.disabled = false;
  document.getElementById('form-title').textContent = 'Book an appointment';
  document.getElementById('save-button').textContent = 'Book appointment';
  document.getElementById('cancel-button').classList.add('hidden');
}

async function deleteAppointment(appointment) {
  if (!confirm('Delete this ' + appointment.type + ' appointment?')) return;
  try {
    await api('DELETE', '/appointments/' + appointment.id);
    showMessage('message', 'Appointment deleted.', 'success');
    await loadAppointments();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
}

appointmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const appointment = {
    date: fields.date.value,
    type: fields.type.value.trim(),
    status: fields.status.value,
    notes: valueOrNull(fields.notes)
  };

  if (appointment.date === '' || appointment.type === '') {
    showMessage('message', 'Please choose a date and enter the appointment type.', 'error');
    return;
  }

  try {
    if (fields.id.value) {
      await api('PUT', '/appointments/' + fields.id.value, appointment);
      showMessage('message', 'Appointment updated.', 'success');
    } else {
      appointment.pet_id = Number(fields.pet.value);
      await api('POST', '/appointments', appointment);
      showMessage('message', 'Appointment booked.', 'success');
    }
    resetForm();
    await loadAppointments();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
});

document.getElementById('cancel-button').addEventListener('click', resetForm);

async function start() {
  await requireLogin();
  await loadPets();
  await loadAppointments();
}

start().catch((err) => showMessage('message', err.message, 'error'));
