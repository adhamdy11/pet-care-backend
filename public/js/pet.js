// Page for one pet: /pet.html?id=5
const petId = Number(getQueryParam('id'));

const recordForm = document.getElementById('record-form');
const reminderForm = document.getElementById('reminder-form');

async function loadPet() {
  // There is no GET /pets/:id route, so we load the user's pets and pick this one.
  // The backend only returns the logged-in user's pets, so another user's id is never found.
  const data = await api('GET', '/pets');
  const pet = data.pets.find((p) => p.id === petId);

  if (!pet) {
    document.getElementById('pet-name').textContent = 'Pet not found';
    document.querySelector('.grid-2').classList.add('hidden');
    return false;
  }

  document.title = pet.name + ' - PetCare';
  document.getElementById('pet-name').textContent = pet.name;
  const details = [pet.species, pet.breed, pet.age !== null ? pet.age + ' years' : null]
    .filter((value) => value)
    .join(' · ');
  document.getElementById('pet-details').textContent = details;
  return true;
}

// ---------- Medical records ----------

async function loadRecords() {
  const data = await api('GET', '/records/pet/' + petId);
  const list = document.getElementById('record-list');
  list.innerHTML = '';

  if (data.records.length === 0) {
    list.appendChild(createElement('li', 'No medical records yet.', 'empty'));
    return;
  }

  for (const record of data.records) {
    const item = createElement('li');
    const title = createElement('strong', record.record_type);
    item.appendChild(title);
    item.appendChild(createElement('span', ' · ' + formatDate(record.record_date), 'muted'));
    if (record.details) item.appendChild(createElement('div', record.details));

    const actions = createElement('div', null, 'form-actions');
    actions.appendChild(createButton('Edit', 'button-secondary button-small', () => editRecord(record)));
    actions.appendChild(createButton('Delete', 'button-danger button-small', () => deleteRecord(record)));
    item.appendChild(actions);
    list.appendChild(item);
  }
}

function editRecord(record) {
  document.getElementById('record-id').value = record.id;
  document.getElementById('record-type').value = record.record_type;
  document.getElementById('record-date').value = record.record_date;
  document.getElementById('record-details').value = record.details || '';
  document.getElementById('record-save').textContent = 'Save record';
  document.getElementById('record-cancel').classList.remove('hidden');
}

function resetRecordForm() {
  recordForm.reset();
  document.getElementById('record-id').value = '';
  document.getElementById('record-save').textContent = 'Add record';
  document.getElementById('record-cancel').classList.add('hidden');
}

async function deleteRecord(record) {
  if (!confirm('Delete this ' + record.record_type + ' record?')) return;
  try {
    await api('DELETE', '/records/' + record.id);
    showMessage('message', 'Record deleted.', 'success');
    await loadRecords();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
}

recordForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = document.getElementById('record-id').value;
  const record = {
    pet_id: petId,
    record_type: document.getElementById('record-type').value.trim(),
    record_date: document.getElementById('record-date').value,
    details: valueOrNull(document.getElementById('record-details'))
  };

  if (record.record_type === '' || record.record_date === '') {
    showMessage('message', 'A record needs a type and a date.', 'error');
    return;
  }

  try {
    if (id) {
      await api('PUT', '/records/' + id, record);
      showMessage('message', 'Record updated.', 'success');
    } else {
      await api('POST', '/records', record);
      showMessage('message', 'Record added.', 'success');
    }
    resetRecordForm();
    await loadRecords();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
});

document.getElementById('record-cancel').addEventListener('click', resetRecordForm);

// ---------- Reminders ----------

async function loadReminders() {
  const data = await api('GET', '/reminders/pet/' + petId);
  const list = document.getElementById('reminder-list');
  list.innerHTML = '';

  if (data.reminders.length === 0) {
    list.appendChild(createElement('li', 'No reminders yet.', 'empty'));
    return;
  }

  const today = todayString();

  for (const reminder of data.reminders) {
    const item = createElement('li');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = reminder.is_done === 1;
    checkbox.className = 'inline-check';
    checkbox.setAttribute('aria-label', 'Mark "' + reminder.title + '" as done');
    checkbox.addEventListener('change', () => setReminderDone(reminder, checkbox.checked));

    const label = createElement('label', null, 'check-label');
    label.appendChild(checkbox);
    label.appendChild(createElement('span', reminder.title, reminder.is_done ? 'done-text' : ''));
    item.appendChild(label);

    const meta = createElement('div', 'Due ' + formatDate(reminder.due_date) + ' ', 'muted');
    if (reminder.is_done) {
      meta.appendChild(createElement('span', 'Done', 'badge done'));
    } else if (reminder.due_date < today) {
      meta.appendChild(createElement('span', 'Overdue', 'badge overdue'));
    }
    item.appendChild(meta);

    if (reminder.notes) item.appendChild(createElement('div', reminder.notes));

    const actions = createElement('div', null, 'form-actions');
    actions.appendChild(createButton('Edit', 'button-secondary button-small', () => editReminder(reminder)));
    actions.appendChild(createButton('Delete', 'button-danger button-small', () => deleteReminder(reminder)));
    item.appendChild(actions);
    list.appendChild(item);
  }
}

async function setReminderDone(reminder, done) {
  try {
    await api('PUT', '/reminders/' + reminder.id, { is_done: done });
    await loadReminders();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
}

function editReminder(reminder) {
  document.getElementById('reminder-id').value = reminder.id;
  document.getElementById('reminder-title').value = reminder.title;
  document.getElementById('reminder-date').value = reminder.due_date;
  document.getElementById('reminder-notes').value = reminder.notes || '';
  document.getElementById('reminder-save').textContent = 'Save reminder';
  document.getElementById('reminder-cancel').classList.remove('hidden');
}

function resetReminderForm() {
  reminderForm.reset();
  document.getElementById('reminder-id').value = '';
  document.getElementById('reminder-save').textContent = 'Add reminder';
  document.getElementById('reminder-cancel').classList.add('hidden');
}

async function deleteReminder(reminder) {
  if (!confirm('Delete the reminder "' + reminder.title + '"?')) return;
  try {
    await api('DELETE', '/reminders/' + reminder.id);
    showMessage('message', 'Reminder deleted.', 'success');
    await loadReminders();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
}

reminderForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = document.getElementById('reminder-id').value;
  const reminder = {
    pet_id: petId,
    title: document.getElementById('reminder-title').value.trim(),
    due_date: document.getElementById('reminder-date').value,
    notes: valueOrNull(document.getElementById('reminder-notes'))
  };

  if (reminder.title === '' || reminder.due_date === '') {
    showMessage('message', 'A reminder needs a title and a due date.', 'error');
    return;
  }

  try {
    if (id) {
      await api('PUT', '/reminders/' + id, reminder);
      showMessage('message', 'Reminder updated.', 'success');
    } else {
      await api('POST', '/reminders', reminder);
      showMessage('message', 'Reminder added.', 'success');
    }
    resetReminderForm();
    await loadReminders();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
});

document.getElementById('reminder-cancel').addEventListener('click', resetReminderForm);

// ---------- Start ----------

async function start() {
  await requireLogin();
  const found = await loadPet();
  if (found) {
    await Promise.all([loadRecords(), loadReminders()]);
  }
}

start().catch((err) => showMessage('message', err.message, 'error'));
