const petForm = document.getElementById('pet-form');
const petList = document.getElementById('pet-list');

const fields = {
  id: document.getElementById('pet-id'),
  name: document.getElementById('name'),
  species: document.getElementById('species'),
  breed: document.getElementById('breed'),
  age: document.getElementById('age'),
  notes: document.getElementById('notes')
};

async function loadPets() {
  const data = await api('GET', '/pets');
  petList.innerHTML = '';

  if (data.pets.length === 0) {
    petList.appendChild(createElement('p', 'You have not added any pets yet.', 'empty'));
    return;
  }

  for (const pet of data.pets) {
    petList.appendChild(createPetCard(pet));
  }
}

function createPetCard(pet) {
  const card = createElement('article', null, 'pet-card');
  card.appendChild(createElement('h3', pet.name));

  const details = [pet.species, pet.breed, pet.age !== null ? pet.age + ' years' : null]
    .filter((value) => value)
    .join(' · ');
  card.appendChild(createElement('div', details || 'No details yet', 'details'));

  if (pet.notes) card.appendChild(createElement('p', pet.notes));

  const actions = createElement('div', null, 'form-actions');

  const openLink = createElement('a', 'Records & reminders', 'button button-small');
  openLink.href = '/pet.html?id=' + pet.id;
  actions.appendChild(openLink);

  actions.appendChild(createButton('Edit', 'button-secondary button-small', () => startEdit(pet)));
  actions.appendChild(createButton('Delete', 'button-danger button-small', () => deletePet(pet)));
  card.appendChild(actions);
  return card;
}

function startEdit(pet) {
  fields.id.value = pet.id;
  fields.name.value = pet.name;
  fields.species.value = pet.species || '';
  fields.breed.value = pet.breed || '';
  fields.age.value = pet.age !== null ? pet.age : '';
  fields.notes.value = pet.notes || '';

  document.getElementById('form-title').textContent = 'Edit ' + pet.name;
  document.getElementById('save-button').textContent = 'Save changes';
  document.getElementById('cancel-button').classList.remove('hidden');
  fields.name.focus();
}

function resetForm() {
  petForm.reset();
  fields.id.value = '';
  document.getElementById('form-title').textContent = 'Add a pet';
  document.getElementById('save-button').textContent = 'Add pet';
  document.getElementById('cancel-button').classList.add('hidden');
}

async function deletePet(pet) {
  if (!confirm('Delete ' + pet.name + '? Its appointments, records and reminders will also be deleted.')) {
    return;
  }
  try {
    await api('DELETE', '/pets/' + pet.id);
    showMessage('message', pet.name + ' was deleted.', 'success');
    resetForm();
    await loadPets();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
}

petForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const pet = {
    name: fields.name.value.trim(),
    species: valueOrNull(fields.species),
    breed: valueOrNull(fields.breed),
    age: fields.age.value === '' ? null : Number(fields.age.value),
    notes: valueOrNull(fields.notes)
  };

  if (pet.name === '') {
    showMessage('message', 'Please enter the pet\'s name.', 'error');
    return;
  }
  if (pet.age !== null && !(Number.isInteger(pet.age) && pet.age >= 0 && pet.age <= 100)) {
    showMessage('message', 'Age must be a whole number between 0 and 100.', 'error');
    return;
  }

  try {
    if (fields.id.value) {
      await api('PUT', '/pets/' + fields.id.value, pet);
      showMessage('message', 'Pet updated.', 'success');
    } else {
      await api('POST', '/pets', pet);
      showMessage('message', pet.name + ' was added.', 'success');
    }
    resetForm();
    await loadPets();
  } catch (err) {
    showMessage('message', err.message, 'error');
  }
});

document.getElementById('cancel-button').addEventListener('click', () => {
  resetForm();
  hideMessage('message');
});

requireLogin().then(loadPets).catch((err) => showMessage('message', err.message, 'error'));
