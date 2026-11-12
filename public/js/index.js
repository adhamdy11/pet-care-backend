// If the user is already logged in, skip the landing page and open the dashboard.
fetch('/auth/me', { credentials: 'same-origin' }).then((response) => {
  if (response.ok) window.location.href = '/dashboard.html';
});
