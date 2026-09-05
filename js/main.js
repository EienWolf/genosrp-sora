// Interacción del sitio. Sin dependencias.
(function () {
  'use strict';

  // --- Filtros de hechizos -------------------------------------------------
  var filtros = document.querySelectorAll('.filtro');
  var hechizos = document.querySelectorAll('.hechizo');
  var vacio = document.querySelector('#sin-resultados');

  function aplicar() {
    var activos = {};
    filtros.forEach(function (b) {
      if (b.getAttribute('aria-pressed') === 'true') {
        (activos[b.dataset.campo] = activos[b.dataset.campo] || []).push(b.dataset.valor);
      }
    });
    var visibles = 0;
    hechizos.forEach(function (h) {
      var pasa = Object.keys(activos).every(function (campo) {
        return activos[campo].indexOf(h.dataset[campo]) !== -1;
      });
      h.hidden = !pasa;
      if (pasa) visibles++;
    });
    if (vacio) vacio.hidden = visibles > 0;
  }

  filtros.forEach(function (b) {
    b.addEventListener('click', function () {
      var activo = b.getAttribute('aria-pressed') === 'true';
      // Un filtro por campo: elegir «medimagia» descarta «duelo».
      filtros.forEach(function (o) {
        if (o.dataset.campo === b.dataset.campo) o.setAttribute('aria-pressed', 'false');
      });
      b.setAttribute('aria-pressed', activo ? 'false' : 'true');
      aplicar();
    });
  });

  // --- Visor de la galería -------------------------------------------------
  var visor = document.querySelector('dialog.visor');
  if (visor) {
    var img = visor.querySelector('img');
    var pie = visor.querySelector('p');
    document.querySelectorAll('.galeria button').forEach(function (b) {
      b.addEventListener('click', function () {
        img.src = b.dataset.grande;
        img.alt = b.dataset.alt;
        pie.textContent = b.dataset.alt;
        visor.showModal();
      });
    });
    visor.querySelector('.cerrar').addEventListener('click', function () { visor.close(); });
    visor.addEventListener('click', function (e) { if (e.target === visor) visor.close(); });
  }
})();
