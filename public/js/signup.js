const signupForm = document.getElementById('signup-form');

// The same rules as the backend (utils/validation.js). Checking here gives the user
// instant feedback, but the backend still checks again because browser checks can be skipped.
function checkSignup(username, email, password, confirmPassword) {
  if (username === '' || username.length > 30) {
    return 'Username is required (max 30 characters).';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.';
  }
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must be 8-72 characters and contain at least one letter and one number.';
  }
  if (password !== confirmPassword) {
    return 'The two passwords do not match.';
  }
  return null;
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  const error = checkSignup(username, email, password, confirmPassword);
  if (error) {
    showMessage('message', error, 'error');
    return;
  }

  const button = document.getElementById('signup-button');
  button.disabled = true;

  try {
    await api('POST', '/auth/signup', { username: username, email: email, password: password });
    window.location.href = '/login.html?registered=1';
  } catch (err) {
    showMessage('message', err.message, 'error');
    button.disabled = false;
  }
});
