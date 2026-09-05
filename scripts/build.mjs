/**
 * Genera el sitio a partir de content/.
 *
 * content/ es la fuente de verdad; el HTML es un derivado y no se edita nunca
 * a mano. El sitio publicado es una selección: omite lo que solo sirve para
 * jugar o para mantener el repositorio (guías de interpretación de los
 * secundarios, metadatos de referencia de las imágenes, banderas internas).
 *
 * Esa selección NO se aplica a las salidas legibles por máquina: llms.txt,
 * llms-full.txt y content.json llevan todo, porque nada está marcado privado.
 */
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as yamlLoad } from 'js-yaml';
const yaml = { load: yamlLoad };
import { marked } from 'marked';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENIDO = join(RAIZ, 'content');
const SALIDA = join(RAIZ, 'dist', 'sora');
const BASE = '/sora';

marked.setOptions({ mangle: false, headerIds: false });

// ---------------------------------------------------------------- utilidades

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const md = (s) => (s ? marked.parse(String(s)) : '');
const definido = (v) => v !== null && v !== undefined && v !== '' && v !== '?';

/** Divide una ficha en frontmatter y cuerpo. Corta solo por una línea que
 *  sea exactamente «---»: un comentario acabado en --- no debe partirla. */
function ficha(texto, ruta) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(texto);
  if (!m) throw new Error(`Sin frontmatter válido: ${ruta}`);
  return { datos: yaml.load(m[1]) ?? {}, cuerpo: m[2].trim() };
}

async function leerFicha(ruta) {
  const f = ficha(await readFile(ruta, 'utf8'), ruta);
  f.ruta = ruta.slice(RAIZ.length + 1);
  return f;
}

async function leerCarpeta(rel, filtro = (n) => n.endsWith('.md')) {
  const dir = join(CONTENIDO, rel);
  if (!existsSync(dir)) return [];
  const nombres = (await readdir(dir)).filter(filtro).sort();
  return Promise.all(nombres.map((n) => leerFicha(join(dir, n))));
}

/** Extrae una sección `## Título` del cuerpo Markdown.
 *  Se apoya en el troceador de abajo: una expresión regular con la bandera `m`
 *  hace que `$` case al final de CADA línea, y la sección se cortaba en la
 *  primera. */
function seccion(cuerpo, titulo) {
  const s = secciones(cuerpo).find((x) => x.titulo === titulo);
  return s ? s.texto : '';
}

/** Todas las secciones, en orden. */
function secciones(cuerpo) {
  const out = [];
  const partes = cuerpo.split(/^## /m).slice(1);
  for (const p of partes) {
    const salto = p.indexOf('\n');
    const titulo = p.slice(0, salto).trim();
    const texto = p.slice(salto + 1).replace(/<!--[\s\S]*?-->/g, '').trim();
    if (texto) out.push({ titulo, texto });
  }
  return out;
}

// ------------------------------------------------------------------ el cielo

/** Generador pseudoaleatorio con semilla: cada build produce exactamente el
 *  mismo SVG, así que el cielo no ensucia el diff. */
const azarista = (semilla) => () =>
  (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;

/** Una capa de estrellas anónimas. */
function capaEstrellas(semilla, n, rMax, oMax) {
  const azar = azarista(semilla);
  let d = '';
  for (let i = 0; i < n; i++) {
    d += `<circle cx="${(azar() * 100).toFixed(2)}%" cy="${(azar() * 100).toFixed(2)}%"`
       + ` r="${(azar() * rMax + 0.2).toFixed(2)}" fill="#e8eaf2"`
       + ` opacity="${(azar() * oMax + 0.04).toFixed(2)}"/>`;
  }
  return d;
}

/** El fondo de todo el sitio: tres capas a distinta profundidad más un velo
 *  de niebla. `data-prof` es el factor de paralaje que lee js/atmosfera.js;
 *  cuanto mayor, más cerca está la capa y más se mueve. */
function firmamento() {
  const capas = [
    { prof: -0.020, estrellas: capaEstrellas(20260907, 130, 0.6, 0.26) },
    { prof: -0.055, estrellas: capaEstrellas(19970314, 62, 0.95, 0.38) },
    { prof: -0.105, estrellas: capaEstrellas(11235813, 24, 1.5, 0.5) },
  ];
  return `<div class="firmamento" aria-hidden="true">
<div class="niebla" data-prof="-0.012"></div>
${capas.map((c) => `<div class="capa" data-prof="${c.prof}">`
  + `<svg preserveAspectRatio="none">${c.estrellas}</svg></div>`).join('\n')}
</div>`;
}

/** El Astrolium: las cuatro estrellas que el hechizo de Sora proyecta, en su
 *  color real, unidas por la línea que se traza sola al cargar. Solo aparece
 *  en la portada, que es donde se explica qué son. */
function astrolium() {
  const estrellas = [
    { n: 'Betelgeuse', x: 9,  y: 13, c: '#c2543f', r: 0.60 },
    { n: 'Sirio',      x: 27, y: 6,  c: '#e8eaf2', r: 0.72 },
    { n: 'Regulus',    x: 63, y: 4,  c: '#4a9ee0', r: 0.56 },
    { n: 'Arcturus',   x: 88, y: 11, c: '#e0a63c', r: 0.66 },
  ];
  const id = (e) => 'ast-' + e.n.toLowerCase();
  // El halo es un degradado radial, no un disco: si no, la estrella se ve
  // como un botón recortado sobre el fondo.
  const defs = estrellas.map((e) => `<radialGradient id="${id(e)}">`
    + `<stop offset="0%" stop-color="${e.c}" stop-opacity=".55"/>`
    + `<stop offset="35%" stop-color="${e.c}" stop-opacity=".12"/>`
    + `<stop offset="100%" stop-color="${e.c}" stop-opacity="0"/></radialGradient>`).join('');
  const halos = estrellas.map((e) =>
    `<circle class="halo" cx="${e.x}" cy="${e.y}" r="${(e.r * 5).toFixed(2)}" fill="url(#${id(e)})"/>`).join('');
  // Un rombo finísimo por estrella: el destello de difracción que hace que
  // un punto de luz se lea como estrella y no como lunar.
  const destellos = estrellas.map((e) => {
    const l = e.r * 4.6, a = e.r * 0.5;
    return `<path class="destello" fill="${e.c}" opacity=".28" d="M${e.x - l} ${e.y}`
      + `L${e.x} ${e.y - a}L${e.x + l} ${e.y}L${e.x} ${e.y + a}Z"/>`
      + `<path class="destello" fill="${e.c}" opacity=".22" d="M${e.x} ${e.y - l}`
      + `L${e.x + a} ${e.y}L${e.x} ${e.y + l}L${e.x - a} ${e.y}Z"/>`;
  }).join('');
  const ritmo = [[0, 6], [-2.4, 7.5], [-4.1, 5.5], [-1.2, 8]];
  const puntos = estrellas.map((e, i) =>
    `<circle class="estrella-viva" cx="${e.x}" cy="${e.y}" r="${e.r}" fill="${e.c}"`
    + ` style="animation-delay:${ritmo[i][0]}s;animation-duration:${ritmo[i][1]}s">`
    + `<title>${e.n}</title></circle>`).join('');
  const traza = 'M' + estrellas.map((e) => `${e.x} ${e.y}`).join(' L');
  return `<svg class="astrolium" aria-hidden="true" viewBox="0 0 100 46"
 preserveAspectRatio="xMidYMid slice" data-prof="0.16">
<defs>${defs}</defs>
${halos}<path class="constelacion" pathLength="1" d="${traza}"/>${destellos}${puntos}
</svg>`;
}

// ---------------------------------------------------------------- plantillas

/** URL canónica de una página: el enrutador de assets sirve sin extensión y
 *  redirige (307) si se pide con .html, así que se enlaza ya sin ella. */
const enlace = (p) => (p.archivo === 'index.html' ? '' : p.archivo.replace(/\.html$/, ''));

const PAGINAS = [
  { id: 'index', archivo: 'index.html', menu: 'Sora' },
  { id: 'historia', archivo: 'historia.html', menu: 'Historia' },
  { id: 'magia', archivo: 'magia.html', menu: 'Magia' },
  { id: 'cartas', archivo: 'cartas.html', menu: 'Cartas' },
  { id: 'entorno', archivo: 'entorno.html', menu: 'Entorno' },
  { id: 'galeria', archivo: 'galeria.html', menu: 'Galería' },
];

function plantilla({ id, titulo, descripcion, entrada, contenido, hero = '' }) {
  // Sin hero propio (todo salvo la portada) la página abre con un pórtico:
  // le da un h1 real —antes solo tenían h2— y un arranque visual.
  const yo = PAGINAS.find((p) => p.id === id);
  const cabeza = hero || `<div class="portico"><div class="env">
  <h1>${esc(yo?.menu ?? titulo)}</h1>
  <p class="epigrafe">${esc(entrada ?? descripcion)}</p>
</div></div>`;
  const menu = PAGINAS.map((p) =>
    `<li><a href="${BASE}/${enlace(p)}"` +
    `${p.id === id ? ' aria-current="page"' : ''}>${p.menu}</a></li>`).join('');
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='8' height='16' fill='%234a9ee0'/><rect x='8' width='8' height='16' fill='%23e0a63c'/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Atkinson+Hyperlegible:wght@400;700&display=swap">
<link rel="stylesheet" href="${BASE}/css/styles.css">
<link rel="alternate" type="text/plain" href="${BASE}/llms.txt" title="Índice para modelos de lenguaje">
<link rel="alternate" type="application/json" href="${BASE}/content.json" title="Todo el contenido en JSON">
</head>
<body>
${firmamento()}
<div class="transicion" aria-hidden="true"></div>
<header class="cabecera">
  <div class="env">
    <a class="marca" href="${BASE}/">Sora Winterbourne</a>
    <nav aria-label="Secciones"><ul class="menu">${menu}</ul></nav>
  </div>
  <div class="avance" aria-hidden="true"></div>
</header>
${cabeza}
<main class="env">
${contenido}
</main>
<footer class="pie">
  <div class="env">
    <p>Ficha de rol de Sora Winterbourne, Hufflepuff. Generada desde
    <code>content/</code>; el HTML no se edita a mano.</p>
    <p>¿Eres un modelo de lenguaje? Todo el material está en
    <a href="${BASE}/llms.txt">llms.txt</a>,
    <a href="${BASE}/llms-full.txt">llms-full.txt</a> y
    <a href="${BASE}/content.json">content.json</a>.</p>
  </div>
</footer>
<script src="${BASE}/js/lenis.min.js" defer></script>
<script src="${BASE}/js/atmosfera.js" defer></script>
<script src="${BASE}/js/main.js" defer></script>
</body>
</html>
`;
}

const listaDefs = (pares) => {
  const filas = pares.filter(([, v]) => definido(v))
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('');
  return filas ? `<dl class="datos">${filas}</dl>` : '';
};

// -------------------------------------------------------------------- cargar

async function cargar() {
  const personajes = await leerCarpeta('personajes');
  const porSlug = Object.fromEntries(personajes.map((p) => [p.datos.slug, p]));
  const nombreDe = (slug) => {
    const p = porSlug[slug];
    if (p) return [p.datos.nombre, p.datos.apellido].filter(Boolean).join(' ');
    const c = (conocidos.conocidos ?? []).find((x) => x.slug === slug);
    return c ? c.nombre : slug;
  };

  const conocidos = existsSync(join(CONTENIDO, 'conocidos.yml'))
    ? yaml.load(await readFile(join(CONTENIDO, 'conocidos.yml'), 'utf8')) ?? {}
    : { conocidos: [] };

  const hilos = [];
  const dirCartas = join(CONTENIDO, 'cartas');
  if (existsSync(dirCartas)) {
    for (const nombre of (await readdir(dirCartas, { withFileTypes: true }))
      .filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
      const dir = join(dirCartas, nombre);
      const archivos = (await readdir(dir)).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
      hilos.push({
        meta: existsSync(join(dir, 'hilo.md')) ? await leerFicha(join(dir, 'hilo.md')) : null,
        cartas: await Promise.all(archivos.map((f) => leerFicha(join(dir, f)))),
      });
    }
  }

  return {
    sora: porSlug['sora-winterbourne'],
    personajes, porSlug, nombreDe,
    criaturas: await leerCarpeta('criaturas'),
    hechizos: await leerCarpeta('hechizos'),
    cursos: await leerCarpeta('historias/cursos'),
    complementarias: await leerCarpeta('historias/complementarias'),
    galeria: await leerCarpeta('galeria'),
    conocidos: conocidos.conocidos ?? [],
    hilos,
  };
}

export { cargar, ficha, enlace, esc, md, seccion, secciones, definido, plantilla, listaDefs, astrolium,
         RAIZ, CONTENIDO, SALIDA, BASE, PAGINAS };
