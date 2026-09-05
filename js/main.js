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
  // La miniatura no se sustituye por la foto: se convierte en ella. Es la
  // misma imagen, así que animar la caja de una a otra da la continuidad que
  // un fundido no da. Sin View Transitions se abre y se cierra sin más.
  var visor = document.querySelector('dialog.visor');
  if (visor) {
    var img = visor.querySelector('img');
    var pie = visor.querySelector('p');
    var quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
    var origen = null;   // la miniatura de la que salió la foto abierta

    function conViaje(cambiar, sale, entra) {
      if (!document.startViewTransition || quieto.matches) { cambiar(); return; }
      // El nombre ha de ser único en cada captura: lo lleva el que sale
      // antes de cambiar el DOM y el que entra después.
      if (sale) sale.style.viewTransitionName = 'foto';
      document.documentElement.classList.add('viaja-foto');
      var vt = document.startViewTransition(function () {
        if (sale) sale.style.viewTransitionName = '';
        cambiar();
        var d = entra();
        if (d) d.style.viewTransitionName = 'foto';
      });
      vt.finished.finally(function () {
        if (sale) sale.style.viewTransitionName = '';
        var d = entra();
        if (d) d.style.viewTransitionName = '';
        document.documentElement.classList.remove('viaja-foto');
      });
    }

    document.querySelectorAll('.galeria button').forEach(function (b) {
      b.addEventListener('click', function () {
        origen = b.querySelector('img');
        conViaje(function () {
          img.src = b.dataset.grande;
          img.alt = b.dataset.alt;
          pie.textContent = b.dataset.alt;
          visor.showModal();
        }, origen, function () { return img; });
      });
    });

    function cerrar() {
      var vuelve = origen;
      conViaje(function () { visor.close(); }, img, function () { return vuelve; });
    }
    visor.querySelector('.cerrar').addEventListener('click', cerrar);
    visor.addEventListener('click', function (e) { if (e.target === visor) cerrar(); });
    // Escape cierra el <dialog> por su cuenta: hay que limpiar el nombre.
    visor.addEventListener('close', function () {
      img.style.viewTransitionName = '';
      if (origen) origen.style.viewTransitionName = '';
    });
  }
})();
