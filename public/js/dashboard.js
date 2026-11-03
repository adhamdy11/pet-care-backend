async function loadDashboard(user) {
  document.getElementById('welcome').textContent = 'Welcome, ' + user.username;

  const petData = await api('GET', '/pets');
  const appointmentData = await api('GET', '/appointments');
  const pets = petData.pets;

  // Reminders are stored per pet, so we ask for each pet's reminders at the same time.
  const reminderLists = await Promise.all(
    pets.map((pet) => api('GET', '/reminders/pet/' + pet.id))
  );

  const petNames = {};
  for (const pet of pets) petNames[pet.id] = pet.name;

  const today = todayString();

  // Dates are stored as YYYY-MM-DD text, so comparing them as strings gives the right order.
  const upcoming = appointmentData.appointments
    .filter((a) => a.status === 'scheduled' && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const openReminders = reminderLists
    .flatMap((data) => data.reminders)
    .filter((r) => !r.is_done)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const overdue = openReminders.filter((r) => r.due_date < today);

  document.getElementById('stat-pets').textContent = pets.length;
  document.getElementById('stat-upcoming').textContent = upcoming.length;
  document.getElementById('stat-open').textContent = openReminders.length;
  document.getElementById('stat-overdue').textContent = overdue.length;

  const upcomingList = document.getElementById('upcoming-list');
  if (upcoming.length === 0) {
    upcomingList.appendChild(createElement('li', 'No upcoming appointments.', 'empty'));
  }
  for (const appointment of upcoming.slice(0, 5)) {
    const item = createElement('li');
    item.appendChild(createElement('strong', appointment.type + ' for ' + petNames[appointment.pet_id]));
    item.appendChild(createElement('div', formatDate(appointment.date), 'muted'));
    upcomingList.appendChild(item);
  }

  const reminderList = document.getElementById('reminder-list');
  if (openReminders.length === 0) {
    reminderList.appendChild(createElement('li', 'No open reminders.', 'empty'));
  }
  for (const reminder of openReminders.slice(0, 5)) {
    const item = createElement('li');
    const link = createElement('a', reminder.title);
    link.href = '/pet.html?id=' + reminder.pet_id;
    item.appendChild(link);

    const meta = createElement('div', petNames[reminder.pet_id] + ' · due ' + formatDate(reminder.due_date) + ' ', 'muted');
    if (reminder.due_date < today) meta.appendChild(createElement('span', 'Overdue', 'badge overdue'));
    item.appendChild(meta);
    reminderList.appendChild(item);
  }
}

requireLogin().then(loadDashboard).catch((err) => showMessage('message', err.message, 'error'));
