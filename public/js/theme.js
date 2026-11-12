// Loaded in <head> so the saved theme is applied before the page is drawn (no flash).
// The theme is a user preference, not sensitive data, so it is kept in a normal cookie
// that JavaScript can read. It lasts one year and is never sent to other websites.
(function () {
  const match = document.cookie.match(/(?:^|; )theme=(light|dark)/);
  if (match) {
    document.documentElement.setAttribute('data-theme', match[1]);
  }
})();
