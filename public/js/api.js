// Shared helpers used by every page.

function getCookie(name) {
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

// Sends a JSON request to the backend and returns the parsed JSON response.
// The login token is in an HttpOnly cookie, so this code never sees it: the browser
// attaches it automatically. For requests that change data we copy the csrfToken
// cookie into the X-CSRF-Token header, which the backend compares with the cookie.
async function api(method, url, body) {
  const options = {
    method: method,
    headers: {},
    credentials: 'same-origin'
  };

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  if (method !== 'GET') {
    const csrfToken = getCookie('csrfToken');
    if (csrfToken) options.headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  // Session expired or not logged in: send the user back to the login page.
  if (response.status === 401 && !url.startsWith('/auth/login')) {
    window.location.href = '/login.html';
    throw new Error('Please log in again');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong (' + response.status + ')');
  }

  return data;
}

// Used at the top of every page that needs a logged-in user.
// Returns the user from GET /auth/me and fills in the header.
async function requireLogin() {
  const data = await api('GET', '/auth/me');
  const user = data.user;

  document.getElementById('header-username').textContent = user.username;
  if (user.role === 'admin') {
    document.getElementById('admin-link').classList.remove('hidden');
  }

  document.getElementById('logout-button').addEventListener('click', logout);
  document.getElementById('theme-button').addEventListener('click', toggleTheme);
  return user;
}

async function logout() {
  await api('POST', '/auth/logout');
  window.location.href = '/login.html';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);

  let cookie = 'theme=' + next + '; Path=/; Max-Age=31536000; SameSite=Strict';
  if (window.location.protocol === 'https:') cookie += '; Secure';
  document.cookie = cookie;
}

// Shows a success or error message in a page element.
function showMessage(elementId, text, type) {
  const box = document.getElementById(elementId);
  box.textContent = text;
  box.className = 'message ' + type;
}

function hideMessage(elementId) {
  document.getElementById(elementId).className = 'message hidden';
}

// Creates an element with text. textContent is used everywhere instead of innerHTML,
// so anything a user typed (e.g. "<script>") is shown as plain text and never run.
function createElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function createButton(text, className, onClick) {
  const button = createElement('button', text, className);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

// Today's date as YYYY-MM-DD in the user's local time zone.
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + month + '-' + day;
}

// "2026-11-03" -> "3 Nov 2026"
function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// Empty text boxes are sent as null so the backend stores "no value" instead of "".
function valueOrNull(input) {
  const value = input.value.trim();
  return value === '' ? null : value;
}

// Reads ?id=5 from the page URL.
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
