const loginForm = document.getElementById('login-form');

if (getQueryParam('registered')) {
  showMessage('message', 'Account created. You can now log in.', 'success');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showMessage('message', 'Please enter your email and password.', 'error');
    return;
  }

  const button = document.getElementById('login-button');
  button.disabled = true;

  try {
    // The server answers with Set-Cookie headers (token + csrfToken).
    // We do not save the token anywhere ourselves.
    await api('POST', '/auth/login', { email: email, password: password });
    window.location.href = '/dashboard.html';
  } catch (err) {
    showMessage('message', err.message, 'error');
    button.disabled = false;
  }
});
