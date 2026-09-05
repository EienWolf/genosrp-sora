(function () {
  'use strict';

  // Año actual en el pie de página.
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Tema claro/oscuro: por defecto sigue al sistema; la elección manual se recuerda.
  var STORAGE_KEY = 'theme';
  var toggle = document.querySelector('.theme-toggle');

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function apply(theme) {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  }

  apply(stored());

  if (toggle) {
    toggle.addEventListener('click', function () {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var current = stored() || (prefersDark ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* modo privado */ }
    });
  }
})();
