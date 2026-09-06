/* ============================================================
   Atmósfera — el cielo, la varita y el movimiento del sitio.

   Todo cuelga de un único requestAnimationFrame: el paralaje, las
   partículas, el cursor y el trazado de la cronología comparten el
   mismo latido, así que el coste no crece al añadir efectos.

   El cambio de página NO se hace aquí: lo hace el navegador con View
   Transitions, declarado en el CSS. Interceptar el clic para pintar un velo
   añadía 220 ms de espera a cada navegación y dejaba costuras a la vista.

   Con «menos movimiento» solo se pinta el cielo, y quieto: es fondo, no
   animación, y sin él la página se queda a oscuras. Todo lo demás —inercia,
   varita, chispas, revelados— no llega a existir.

   Sin JavaScript el sitio se ve entero e igual de legible: los
   estilos de revelado viven bajo .animar, que solo pone este fichero.
   ============================================================ */
(function () {
  'use strict';

  var raiz = document.documentElement;
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fino = window.matchMedia('(hover: hover) and (pointer: fine)');
  var parado = quieto.matches;

  if (!parado) raiz.classList.add('animar');

  var PALETA = ['#e0a63c', '#4a9ee0', '#e8eaf2'];
  var tareas = [];
  var raton = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, dentro: false };
  var alto = innerHeight;
  var ancho = innerWidth;

  addEventListener('resize', function () { alto = innerHeight; ancho = innerWidth; }, { passive: true });

  var mezcla = function (a, b, k) { return a + (b - a) * k; };
  // window y document también reciben eventos de puntero, y no son Element:
  // closest solo existe en Element.
  var cerca = function (nodo, sel) {
    return nodo && typeof nodo.closest === 'function' ? nodo.closest(sel) : null;
  };
  var tope = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* Un punto de luz se lee como lunar; con cuatro puntas se lee como
     estrella. La misma forma sirve para el cielo y para las chispas. */
  function estrella4(ctx, x, y, r) {
    ctx.beginPath();
    for (var k = 0; k < 8; k++) {
      var ang = k * Math.PI / 4 - Math.PI / 2;
      var rr = k % 2 ? r * 0.38 : r;
      ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  /* Ajusta un lienzo a la ventana teniendo en cuenta la densidad de
     píxeles, y devuelve su contexto ya escalado. */
  function ajustar(lienzo) {
    var ctx = lienzo.getContext('2d');
    var dpr = Math.min(devicePixelRatio || 1, 2);
    lienzo.width = Math.round(innerWidth * dpr);
    lienzo.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  // ---------------------------------------------------- el latido único
  var previo = performance.now();
  function latido(ahora) {
    var dt = Math.min((ahora - previo) / 1000, 0.05);
    previo = ahora;
    for (var i = 0; i < tareas.length; i++) tareas[i](dt, ahora);
    requestAnimationFrame(latido);
  }

  // ---------------------------------------------------------- el cielo
  // Tres capas de estrellas a distinta profundidad, más las cuatro que
  // Astrolium proyecta y que tienen nombre. Se desplazan con el scroll y,
  // más sutilmente, con el puntero: cuanto más cerca está una capa, más se
  // mueve, y el cielo cobra volumen.
  (function () {
    var lienzo = document.querySelector('canvas.firmamento');
    if (!lienzo || !lienzo.getContext) return;
    var ctx = ajustar(lienzo);

    var azar = Math.random;
    var capas = [0.012, 0.035, 0.08].map(function (prof, i) {
      var estrellas = [];
      for (var j = 0; j < 140 + i * 40; j++) {
        estrellas.push({
          x: azar(), y: azar(),
          r: (azar() * 0.9 + 0.3) * (1 + i * 0.5),
          a: azar() * 0.5 + 0.2,
          fase: azar() * 6.2832,
          v: azar() * 1.2 + 0.4,
        });
      }
      return { prof: prof, estrellas: estrellas };
    });

    // El rojo del sitio está reservado al hueco de memoria; el de Betelgeuse
    // es más cálido a propósito, y además es su color real.
    var NOMBRADAS = [
      { x: .78, y: .18, c: '#4a9ee0', r: 3.2, fase: 0 },   // Regulus
      { x: .22, y: .26, c: '#e0a63c', r: 3.4, fase: 2 },   // Arcturus
      { x: .58, y: .42, c: '#f2f4ff', r: 3.6, fase: 4 },   // Sirio
      { x: .12, y: .58, c: '#e07a5f', r: 2.8, fase: 1 },   // Betelgeuse
    ];

    var px = 0, py = 0;   // desvío suavizado del puntero

    // El cielo es infinito: al salir por un borde se entra por el opuesto.
    var vuelta = function (v, techo) { return ((v % techo) + techo) % techo; };

    function pintar(t, mueve) {
      var y = mueve ? window.scrollY : 0;
      ctx.clearRect(0, 0, ancho, alto);

      for (var i = 0; i < capas.length; i++) {
        var cap = capas[i];
        var dx = px * cap.prof * 900;
        var dy = -y * cap.prof * 0.8 + py * cap.prof * 500;
        ctx.fillStyle = '#e8eaf2';
        for (var j = 0; j < cap.estrellas.length; j++) {
          var e = cap.estrellas[j];
          ctx.globalAlpha = mueve
            ? e.a * (0.65 + 0.35 * Math.sin(t * e.v + e.fase))
            : e.a;
          ctx.beginPath();
          ctx.arc(vuelta(e.x * ancho + dx, ancho), vuelta(e.y * alto + dy, alto),
                  e.r, 0, 6.2832);
          ctx.fill();
        }
      }

      for (var n = 0; n < NOMBRADAS.length; n++) {
        var s = NOMBRADAS[n];
        var p = 0.05;
        var ex = vuelta(s.x * ancho + px * p * 900, ancho);
        var ey = vuelta(s.y * alto - y * p * 0.8 + py * p * 500, alto);
        var k = mueve ? 0.7 + 0.3 * Math.sin(t * 0.8 + s.fase) : 1;
        // El halo es un degradado, no un disco: si no, la estrella se ve
        // como un botón recortado sobre el fondo.
        var halo = ctx.createRadialGradient(ex, ey, 0, ex, ey, s.r * 9);
        halo.addColorStop(0, s.c + '8c');
        halo.addColorStop(0.35, s.c + '1f');
        halo.addColorStop(1, s.c + '00');
        // A media luz: el cielo va detrás del texto de todas las páginas, y
        // a plena intensidad una de estas se plantaba encima de un párrafo.
        ctx.globalAlpha = k * 0.5;
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(ex, ey, s.r * 9, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = k * 0.7;
        ctx.fillStyle = '#fff';
        estrella4(ctx, ex, ey, s.r * 1.9);
      }
      ctx.globalAlpha = 1;
    }

    // Con menos movimiento el cielo se pinta una vez y se queda quieto.
    if (parado) {
      var repintar = function () { ctx = ajustar(lienzo); pintar(0, false); };
      repintar();
      addEventListener('resize', repintar, { passive: true });
      return;
    }

    addEventListener('resize', function () { ctx = ajustar(lienzo); }, { passive: true });
    tareas.push(function (dt, ahora) {
      px = mezcla(px, raton.dentro ? raton.x / ancho - 0.5 : 0, 0.06);
      py = mezcla(py, raton.dentro ? raton.y / alto - 0.5 : 0, 0.06);
      pintar(ahora / 1000, true);
    });
  })();

  // A partir de aquí todo es movimiento, y con «menos movimiento» no existe.
  if (parado) return;

  // ------------------------------------------------- scroll con inercia
  // Lenis solo suaviza la rueda; la barra, el teclado y los anclajes
  // siguen siendo los nativos.
  var lenis = null;
  if (window.Lenis && fino.matches) {
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true, anchors: true });
    tareas.push(function (dt, ahora) { lenis.raf(ahora); });
  }

  // --------------------------------------- partículas: motas y chispas
  // Un solo lienzo para el polvo del aire y para las chispas de la
  // varita. Mismo bucle, mismo contexto.
  var chispear = function () {};
  (function () {
    var lienzo = document.createElement('canvas');
    lienzo.className = 'chispas';
    lienzo.setAttribute('aria-hidden', 'true');
    document.body.appendChild(lienzo);
    var ctx = lienzo.getContext('2d');

    function medir() {
      lienzo.style.width = innerWidth + 'px';
      lienzo.style.height = innerHeight + 'px';
      ctx = ajustar(lienzo);
    }
    medir();
    addEventListener('resize', medir, { passive: true });

    var motas = [];
    for (var i = 0; i < 36; i++) {
      motas.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        r: Math.random() * 1.1 + 0.35,
        vy: -(Math.random() * 7 + 3),
        fase: Math.random() * Math.PI * 2,
        amp: Math.random() * 9 + 3,
        a: Math.random() * 0.28 + 0.06,
      });
    }

    var chispas = [];
    var TOPE = 220;

    chispear = function (x, y, cuantas, fuerza) {
      for (var i = 0; i < cuantas && chispas.length < TOPE; i++) {
        var ang = Math.random() * Math.PI * 2;
        var vel = (Math.random() * 0.7 + 0.3) * (fuerza || 60);
        chispas.push({
          x: x, y: y,
          vx: Math.cos(ang) * vel,
          vy: Math.sin(ang) * vel - 12,
          r: Math.random() * 1.6 + 0.5,
          vida: Math.random() * 0.7 + 0.35,
          total: 1,
          giro: Math.random() * 6.2832,
          color: PALETA[(Math.random() * PALETA.length) | 0],
        });
        chispas[chispas.length - 1].total = chispas[chispas.length - 1].vida;
      }
    };

    tareas.push(function (dt, ahora) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = 'lighter';

      // Polvo en suspensión: sube despacio y reaparece por abajo.
      for (var i = 0; i < motas.length; i++) {
        var m = motas[i];
        m.y += m.vy * dt;
        if (m.y < -10) { m.y = innerHeight + 10; m.x = Math.random() * innerWidth; }
        var x = m.x + Math.sin(ahora / 1400 + m.fase) * m.amp;
        ctx.globalAlpha = m.a;
        ctx.fillStyle = '#e8eaf2';
        ctx.beginPath();
        ctx.arc(x, m.y, m.r, 0, 6.2832);
        ctx.fill();
      }

      // Chispas de la varita: se apagan cayendo.
      for (var j = chispas.length - 1; j >= 0; j--) {
        var c = chispas[j];
        c.vida -= dt;
        if (c.vida <= 0) { chispas.splice(j, 1); continue; }
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 110 * dt;      // gravedad suave
        c.vx *= 0.97;
        c.giro += dt * 2;
        var k = c.vida / c.total;
        ctx.globalAlpha = k * 0.85;
        ctx.fillStyle = c.color;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.giro);
        estrella4(ctx, 0, 0, c.r * k + 0.4);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    });
  })();

  // ------------------------------------------------------- la varita
  if (fino.matches) (function () {
    var varita = document.createElement('div');
    varita.className = 'varita';
    varita.setAttribute('aria-hidden', 'true');
    varita.innerHTML = '<span class="varita__aro"></span><span class="varita__punta"></span>';
    document.body.appendChild(varita);

    var punta = varita.querySelector('.varita__punta');
    var aro = varita.querySelector('.varita__aro');
    var pxp = raton.x, pyp = raton.y;    // punta
    var pxa = raton.x, pya = raton.y;    // aro, con retardo
    var recorrido = 0;

    // Ocultar el cursor nativo y no tener aún el mágico deja la pantalla sin
    // ningún cursor. Las dos cosas pasan juntas o no pasan.
    function despertar() {
      varita.classList.add('despierta');
      raiz.classList.add('varita-activa');
    }
    function dormir() {
      varita.classList.remove('despierta');
      raiz.classList.remove('varita-activa');
    }

    // Continuidad entre páginas: al navegar, el documento nuevo empieza de
    // cero y el cursor tardaba en aparecer hasta el primer movimiento. Se
    // recupera la última posición conocida para que esté ya donde toca.
    var LLAVE = 'sora:puntero';
    function recuperar() {
      try {
        var g = sessionStorage.getItem(LLAVE);
        if (!g) return;
        var p = JSON.parse(g);
        if (!p || p.length !== 2) return;
        raton.x = pxp = pxa = p[0];
        raton.y = pyp = pya = p[1];
        raton.dentro = true;
        despertar();
      } catch (_) {}
    }
    addEventListener('pagehide', function () {
      try {
        if (raton.dentro) sessionStorage.setItem(LLAVE, JSON.stringify([raton.x, raton.y]));
      } catch (_) {}
    });
    // pagereveal se dispara también al activar una página prerrenderizada,
    // donde el script ya se ejecutó hace rato.
    addEventListener('pagereveal', recuperar);
    recuperar();

    addEventListener('pointermove', function (e) {
      raton.vx = e.clientX - raton.x;
      raton.vy = e.clientY - raton.y;
      raton.x = e.clientX;
      raton.y = e.clientY;
      raton.dentro = true;
      despertar();

      // Se sueltan chispas en proporción al camino andado, no por
      // evento: así la estela es igual de densa a cualquier velocidad.
      recorrido += Math.hypot(raton.vx, raton.vy);
      while (recorrido > 26) {
        recorrido -= 26;
        chispear(e.clientX, e.clientY, 1, 26);
      }

      varita.classList.toggle('activa', !!cerca(e.target, 'a, button, summary, [role="button"]'));
    }, { passive: true });

    addEventListener('pointerdown', function (e) {
      varita.classList.add('lanzando');
      chispear(e.clientX, e.clientY, 22, 150);
    }, { passive: true });
    var soltar = function () { varita.classList.remove('lanzando'); };
    addEventListener('pointerup', soltar, { passive: true });
    addEventListener('pointercancel', soltar, { passive: true });
    addEventListener('blur', soltar);
    addEventListener('pointerleave', function () { raton.dentro = false; dormir(); });

    tareas.push(function () {
      pxp = mezcla(pxp, raton.x, 0.55);
      pyp = mezcla(pyp, raton.y, 0.55);
      pxa = mezcla(pxa, raton.x, 0.16);
      pya = mezcla(pya, raton.y, 0.16);
      punta.style.transform = 'translate3d(' + pxp + 'px,' + pyp + 'px,0) translate(-50%,-50%)';
      aro.style.transform = 'translate3d(' + pxa + 'px,' + pya + 'px,0) translate(-50%,-50%)';
    });
  })();

  // Al abrir un hechizo salta una chispa: el conjuro prende. Al abrir una
  // carta, la chispa sale del lacre que se rompe.
  document.querySelectorAll('details.hechizo, details.sobre').forEach(function (h) {
    h.addEventListener('toggle', function () {
      if (!h.open) return;
      var lacre = h.querySelector('.lacre');
      var r = (lacre || h.querySelector('summary')).getBoundingClientRect();
      var x = lacre ? r.left + r.width / 2 : r.left + 12;
      chispear(x, r.top + r.height / 2, lacre ? 18 : 14, lacre ? 110 : 90);
    });
  });

  // ------------------------------------------------------- revelados
  // Los selectores viven aquí y no en la plantilla: qué se anima es
  // decisión de presentación, no del generador de contenido.
  (function () {
    if (!('IntersectionObserver' in window)) return;
    var mapa = [
      ['main section', 'tenue'],
      ['.hilo > h3', 'alzar'],
      ['.hueco', 'acercar'],
      ['.bloque', 'alzar'],
      ['.crono > li', 'alzar'],
      ['.hechizo', 'alzar'],
      ['.persona', 'alzar'],
      ['.galeria figure', 'acercar'],
      ['.carta--sora', 'derecha'],
      ['.carta--otro', 'izquierda'],
    ];

    mapa.forEach(function (par) {
      var grupos = {};
      document.querySelectorAll(par[0]).forEach(function (el) {
        el.setAttribute('data-revelar', par[1]);
        // El escalonado se cuenta por padre: cada rejilla empieza de cero.
        var clave = par[0] + '|' + (el.parentNode.dataset.grupo || (
          el.parentNode.dataset.grupo = Math.random().toString(36).slice(2)));
        grupos[clave] = (grupos[clave] || 0);
        el.style.setProperty('--i', Math.min(grupos[clave]++, 7));
      });
    });

    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('dentro');
        ojo.unobserve(e.target);      // una sola vez: no parpadea al subir
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

    document.querySelectorAll('[data-revelar]').forEach(function (el) { ojo.observe(el); });
  })();

  // ------------------ trazado de la cronología y avance de lectura
  (function () {
    var hitos = [].slice.call(document.querySelectorAll('.crono > li'));
    var avance = document.querySelector('.avance');
    var cabecera = document.querySelector('.cabecera');
    if (!hitos.length && !avance) return;

    tareas.push(function () {
      var y = window.scrollY;
      if (avance) {
        var largo = document.body.scrollHeight - alto;
        avance.style.setProperty('--leido', largo > 0 ? tope(y / largo, 0, 1).toFixed(4) : 0);
      }
      if (cabecera) cabecera.classList.toggle('lejos', y > alto * 0.6);
      for (var i = 0; i < hitos.length; i++) {
        var r = hitos[i].getBoundingClientRect();
        if (r.bottom < 0 || r.top > alto) continue;
        var t = (alto * 0.82 - r.top) / Math.max(r.height, 1);
        hitos[i].style.setProperty('--trazo', tope(t, 0, 1).toFixed(3));
      }
    });
  })();

  requestAnimationFrame(latido);
})();
