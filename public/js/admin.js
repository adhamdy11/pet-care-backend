// Hiding the Admin link is only for convenience. The real protection is on the server:
// /admin routes check the role in the database and return 403 for normal users.
async function loadUsers(currentUser) {
  const data = await api('GET', '/admin/all-users');
  const rows = document.getElementById('user-rows');
  rows.innerHTML = '';

  for (const user of data.users) {
    const row = createElement('tr');
    row.appendChild(createElement('td', user.id));
    row.appendChild(createElement('td', user.username));
    row.appendChild(createElement('td', user.email));

    const roleCell = createElement('td');
    const actions = createElement('td', null, 'actions');

    if (user.id === currentUser.id) {
      // The backend does not allow admins to change their own role.
      roleCell.appendChild(createElement('span', user.role, 'badge'));
      actions.appendChild(createElement('span', 'You', 'muted'));
    } else {
      const select = document.createElement('select');
      select.setAttribute('aria-label', 'Role for ' + user.username);
      for (const role of ['user', 'admin']) {
        const option = createElement('option', role);
        option.value = role;
        select.appendChild(option);
      }
      select.value = user.role;
      roleCell.appendChild(select);
      actions.appendChild(createButton('Save', 'button-small', () => saveRole(user, select.value)));
    }

    row.appendChild(roleCell);
    row.appendChild(actions);
    rows.appendChild(row);
  }
}

async function saveRole(user, role) {
  try {
    await api('PUT', '/admin/update-role/' + user.id, { role: role });
    showMessage('message', user.username + ' is now ' + (role === 'admin' ? 'an admin' : 'a user') + '.', 'success');
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
}

async function start() {
  const user = await requireLogin();
  if (user.role !== 'admin') {
    window.location.href = '/dashboard.html';
    return;
  }
  await loadUsers(user);
}

start().catch((err) => showMessage('message', err.message, 'error'));
