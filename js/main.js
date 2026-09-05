// Interacción del sitio. Sin dependencias.
(function () {
  'use strict';

  // --- Filtros de hechizos -------------------------------------------------
  var filtros = document.querySelectorAll('.filtro');
  var filtrables = '.hechizo, .fila-hilo';
  var vacio = document.querySelector('#sin-resultados');

  function aplicar() {
    var activos = {};
    filtros.forEach(function (b) {
      if (b.getAttribute('aria-pressed') === 'true') {
        (activos[b.dataset.campo] = activos[b.dataset.campo] || []).push(b.dataset.valor);
      }
    });
    var visibles = 0;
    document.querySelectorAll(filtrables).forEach(function (h) {
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

  // --- Buscador de conversaciones -----------------------------------------
  // El índice puede estar paginado, así que buscar solo en las filas visibles
  // daría resultados incompletos: se trae indice.json una vez y busca en todo.
  var caja = document.querySelector('#buscar-hilo');
  var lista = document.querySelector('.hilos');
  if (caja && lista) {
    var original = lista.innerHTML;
    var paginador = document.querySelector('.paginas');
    var todo = null;
    var pidiendo = false;

    function pinta(hilos) {
      lista.innerHTML = hilos.map(function (h) {
        return '<li class="fila-hilo" data-estado="' + h.estado + '">'
          + '<a href="' + h.url + '">'
          + '<span class="lacre lacre--mini" aria-hidden="true">'
          + ((h.con[0] || '?').charAt(0).toUpperCase()) + '</span>'
          + '<span class="fila-texto"><strong></strong><span class="con"></span></span>'
          + (h.estado === 'abierto' ? '<span class="marca-abierto">espera respuesta</span>' : '')
          + '</a></li>';
      }).join('');
      // El texto se pone como texto, nunca como HTML: viene de content/, pero
      // pasar por innerHTML lo haría interpretable.
      lista.querySelectorAll('.fila-hilo').forEach(function (li, i) {
        li.querySelector('strong').textContent = hilos[i].titulo;
        li.querySelector('.con').textContent =
          (hilos[i].con.length ? 'con ' + hilos[i].con.join(' y ') + ' · ' : '')
          + hilos[i].cartas + (hilos[i].cartas === 1 ? ' carta' : ' cartas');
      });
    }

    function buscar() {
      var q = caja.value.trim().toLowerCase();
      if (!q) {
        lista.innerHTML = original;
        if (paginador) paginador.hidden = false;
        aplicar();
        return;
      }
      if (paginador) paginador.hidden = true;
      if (!todo) { traer(buscar); return; }
      var terminos = q.split(/\s+/);
      pinta(todo.filter(function (h) {
        var heno = (h.titulo + ' ' + h.asunto + ' ' + h.con.join(' ')).toLowerCase();
        return terminos.every(function (t) { return heno.indexOf(t) !== -1; });
      }));
      aplicar();
    }

    function traer(luego) {
      if (pidiendo) return;
      pidiendo = true;
      fetch(caja.dataset.indice)
        .then(function (r) { return r.json(); })
        .then(function (j) { todo = j; luego(); })
        .catch(function () { todo = []; luego(); })
        .then(function () { pidiendo = false; });
    }

    caja.addEventListener('input', buscar);
    // Se precarga al enfocar: cuando termine de escribir ya está.
    caja.addEventListener('focus', function () { if (!todo) traer(function () {}); });
  }

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
