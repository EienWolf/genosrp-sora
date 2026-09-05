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

/** Campo de estrellas de Astrolium. Sembrado a partir de una constante para
 *  que cada build produzca exactamente el mismo SVG y no genere diff. */
function cielo() {
  let semilla = 20260907; // el cumpleaños de Sora
  const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
  let d = '';
  for (let i = 0; i < 90; i++) {
    const x = (azar() * 100).toFixed(2);
    const y = (azar() * 100).toFixed(2);
    const r = (azar() * 0.9 + 0.25).toFixed(2);
    const o = (azar() * 0.5 + 0.12).toFixed(2);
    d += `<circle cx="${x}%" cy="${y}%" r="${r}" fill="#e8eaf2" opacity="${o}"/>`;
  }
  // Las cuatro con nombre, en su color real y en su posición del cielo de marzo.
  const nombradas = [
    { n: 'Betelgeuse', x: 14, y: 30, c: '#c2543f', r: 3.2 },
    { n: 'Sirio', x: 32, y: 66, c: '#e8eaf2', r: 3.6 },
    { n: 'Regulus', x: 63, y: 26, c: '#4a9ee0', r: 3.0 },
    { n: 'Arcturus', x: 86, y: 58, c: '#e0a63c', r: 3.4 },
  ];
  for (const s of nombradas) {
    d += `<circle class="estrella-viva" cx="${s.x}%" cy="${s.y}%" r="${s.r}" fill="${s.c}">`
       + `<title>${s.n}</title></circle>`;
    d += `<circle cx="${s.x}%" cy="${s.y}%" r="${s.r * 3}" fill="${s.c}" opacity="0.1"/>`;
  }
  return `<svg aria-hidden="true" preserveAspectRatio="none">${d}</svg>`;
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

function plantilla({ id, titulo, descripcion, contenido, hero = '' }) {
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
<header class="cabecera">
  <div class="env">
    <a class="marca" href="${BASE}/">Sora Winterbourne</a>
    <nav aria-label="Secciones"><ul class="menu">${menu}</ul></nav>
  </div>
</header>
${hero}
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
<script src="${BASE}/js/main.js"></script>
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

export { cargar, ficha, enlace, esc, md, seccion, secciones, definido, plantilla, listaDefs, cielo,
         RAIZ, CONTENIDO, SALIDA, BASE, PAGINAS };
