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
import { execFileSync } from 'node:child_process';
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

/* Las imágenes se citan por su slug de galería, no por su ruta: `imagen:tal`.
   Así el contenido no depende de la extensión del archivo —todas son WebP
   ahora, pero eso puede cambiar— ni de dónde acaben publicándose. */
const IMAGENES = new Map();

/** Registra la galería para que `imagen:<slug>` se pueda resolver. La llama
 *  el generador antes de pintar ninguna página. */
function registrarImagenes(galeria) {
  IMAGENES.clear();
  for (const g of galeria) IMAGENES.set(g.datos.slug, g.datos);
}

/** La ficha de una imagen por su slug, o `undefined` si no está en la galería.
 *  Solo se publica lo que tiene ficha: es lo único que se copia a img/. */
const imagenPorSlug = (slug) => IMAGENES.get(slug);

const rutaImagen = (slug) => {
  const g = IMAGENES.get(slug);
  if (!g) throw new Error(`No hay ninguna imagen «${slug}» en content/galeria/`);
  return `${BASE}/img/${g.archivo}`;
};

/* Enlaces entre fichas por slug. En content/ se escribe `hechizo:celera` y la
   ruta la decide el sitio, así que el contenido no depende de cómo estén
   organizadas las URLs ni se rompe si cambian. */
const resolver = (html) => html
  .replace(/href="pagina:([a-z0-9-]+)"/g, `href="${BASE}/$1"`)
  .replace(/href="hechizo:([a-z0-9-]+)"/g, `href="${BASE}/magia#$1"`)
  .replace(/href="apunte:([a-z0-9-]+)"/g, 'href="#$1"')
  // `![pie](imagen:slug)` en el cuerpo; marked lo deja como src.
  .replace(/(src|href)="imagen:([a-z0-9-]+)"/g, (_, attr, slug) =>
    `${attr}="${rutaImagen(slug)}"`);

const md = (s) => (s ? resolver(marked.parse(String(s))) : '');
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

// ---------------------------------------------------------------- plantillas

/** URL canónica de una página: el enrutador de assets sirve sin extensión y
 *  redirige (307) si se pide con .html, así que se enlaza ya sin ella. */
const enlace = (p) => (p.archivo === 'index.html' ? '' : p.archivo.replace(/\.html$/, ''));

const PAGINAS = [
  { id: 'index', archivo: 'index.html', menu: 'Sora' },
  { id: 'historia', archivo: 'historia.html', menu: 'Historia' },
  { id: 'magia', archivo: 'magia.html', menu: 'Magia' },
  { id: 'apuntes', archivo: 'apuntes.html', menu: 'Apuntes' },
  { id: 'cartas', archivo: 'cartas.html', menu: 'Cartas' },
  { id: 'entorno', archivo: 'entorno.html', menu: 'Entorno' },
  { id: 'galeria', archivo: 'galeria.html', menu: 'Galería' },
];

/* Enlaces de fuera: el servidor donde se juega y a quién escribir. El Discord
   del servidor va por id de gremio —abre el servidor a quien ya esté dentro—
   porque una invitación `discord.gg` caduca y dejaría un enlace muerto en
   todas las páginas. */
const GENOS = {
  web: 'https://genosrp.com/',
  discord: 'https://discord.com/channels/1002280326468481104',
};
const AUTOR = {
  nombre: 'EienWolf',
  discord: 'https://discord.com/users/161936302474919936',
};

/* Se sella al generar, que es justo lo que se sube: la fecha del pie dice
   cuándo se desplegó esto, no cuándo se escribió. */
const GENERADO = new Date();
const GENERADO_ISO = GENERADO.toISOString();
// Sin año: la fecha del pie dice lo reciente que es esto, y para eso el día y
// el mes bastan. El año sigue en el `datetime`, que es el que leen las máquinas.
const GENERADO_TEXTO = GENERADO.toLocaleDateString('es-ES',
  { day: 'numeric', month: 'long', timeZone: 'UTC' });

/* La versión del sitio, en tres cifras: <curso>.<motor>.<ficha>.

   · curso — el que Sora está cursando. Sube sola al cerrar un año y abrir el
     siguiente, así que dice de un vistazo por dónde va el rol.
   · motor — cuántas veces ha cambiado el generador: scripts/, css/, js/ y la
     configuración del despliegue.
   · ficha — cuántas actualizaciones han movido content/. Un commit que solo
     toca el README o las skills no cuenta: no cambia lo que se publica.

   Las dos últimas cuentan por su lado y ninguna reinicia a la otra: un cambio
   que toque el generador y el contenido a la vez sube las dos.

   Se cuenta sobre el historial de git, y también sobre lo que todavía no está
   confirmado: el sitio se despliega antes de hacer el commit, así que sin
   contar el árbol de trabajo lo publicado iría siempre una versión por detrás. */
const ES_MOTOR = (f) => /^(scripts|css|js)\//.test(f)
  || ['package.json', 'package-lock.json', 'wrangler.jsonc'].includes(f);
const ES_FICHA = (f) => f.startsWith('content/');

const git = (...args) => execFileSync('git', args,
  { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

function calcularVersion(curso) {
  let motor = 0, ficha = 0;
  const contar = (archivos) => {
    if (archivos.some(ES_MOTOR)) motor++;
    if (archivos.some(ES_FICHA)) ficha++;
  };
  try {
    // Un commit de fusión no lista archivos: no cambia nada por sí mismo.
    for (const commit of git('log', '--reverse', '--format=%x1e', '--name-only')
      .split('\x1e').slice(1)) {
      contar(commit.split('\n').filter(Boolean));
    }
    contar(git('status', '--porcelain').split('\n').filter(Boolean)
      // «R  antes -> después» y las rutas con espacios, que git entrecomilla.
      .map((l) => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, '')));
  } catch {
    return null;   // fuera de un repositorio no hay historial que contar
  }
  return `${curso ?? 0}.${motor}.${ficha}`;
}

/** La versión de este despliegue. La sella `cargar()`, que es quien sabe por
 *  qué curso va Sora. */
let VERSION = null;

/* Las reglas de especulación del <head> prerrenderizan la página al pasar el
   ratón por encima del enlace («moderate»), así que al pulsar ya está lista y
   la transición del navegador no tiene que esperar a la red. Son seis páginas
   estáticas sin efectos secundarios: prerrenderizarlas no cuesta nada. */
function plantilla({ id, titulo, descripcion, entrada, rotulo, volver, contenido, hero = '' }) {
  // Las páginas interiores abren directamente con su contenido: la banda de
  // cabecera repetía lo que ya dicen la navegación y el primer encabezado.
  // Las de detalle —un hilo, un cuaderno— sí necesitan su título, y va dentro
  // del contenido en un bloque compacto.
  const cabeza = hero || (rotulo ? `<div class="titulo-pagina">
  ${volver ? `<p class="volver"><a href="${volver.href}">${esc(volver.texto)}</a></p>` : ''}
  <h1>${esc(rotulo)}</h1>
  ${entrada ? `<p class="epigrafe">${esc(entrada)}</p>` : ''}
</div>` : '');

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
<link rel="icon" type="image/svg+xml" href="${BASE}/assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..700,0..100,0..1&family=Atkinson+Hyperlegible:wght@400;700&family=Caveat:wght@400..700&display=swap">
<link rel="stylesheet" href="${BASE}/css/styles.css">
<link rel="alternate" type="text/plain" href="${BASE}/llms.txt" title="Índice para modelos de lenguaje">
<link rel="alternate" type="application/json" href="${BASE}/content.json" title="Todo el contenido en JSON">
<script type="speculationrules">
{"prerender":[{"where":{"href_matches":"${BASE}/*"},"eagerness":"moderate"}]}
</script>
</head>
<body>
<canvas class="firmamento" aria-hidden="true"></canvas>
<header class="cabecera">
  <div class="env">
    <a class="marca" href="${BASE}/">Sora Winterbourne</a>
    <nav aria-label="Secciones"><ul class="menu">${menu}</ul></nav>
  </div>
  <div class="avance" aria-hidden="true"></div>
</header>
${hero}
<main class="env">
${hero ? '' : cabeza}
${contenido}
</main>
<footer class="pie">
  <div class="env">
    <div class="pie-columnas">
      <section class="pie-bloque">
        <p class="sello-genos">
          <span class="emblema-genos" aria-hidden="true"></span>
          <span>Personaje del servidor de rol <strong>Genos</strong>.</span>
        </p>
        <ul class="pie-enlaces">
          <li><a href="${GENOS.web}" target="_blank" rel="noopener">Web oficial de GenosRP</a></li>
          <li><a href="${GENOS.discord}" target="_blank" rel="noopener">Discord del servidor</a></li>
        </ul>
      </section>

      <section class="pie-bloque">
        <h2>Quien lo escribe</h2>
        <p>Sora es el personaje de <strong>${AUTOR.nombre}</strong>.</p>
        <ul class="pie-enlaces">
          <li><a href="${AUTOR.discord}" target="_blank" rel="noopener">Escribirle por Discord</a></li>
        </ul>
      </section>

      <section class="pie-bloque">
        <h2>Este sitio</h2>
        <p>Última actualización:
          <time datetime="${GENERADO_ISO}">${GENERADO_TEXTO}</time>.</p>
        ${VERSION ? `<p class="version">Versión <b>${esc(VERSION)}</b></p>` : ''}
      </section>
    </div>

    <p class="pie-maquinas">¿Eres un modelo de lenguaje? Todo el material está en
    <a href="${BASE}/llms.txt">llms.txt</a>,
    <a href="${BASE}/llms-full.txt">llms-full.txt</a> y
    <a href="${BASE}/content.json">content.json</a>.</p>
  </div>
</footer>
<dialog class="visor">
  <img alt="">
  <p></p>
  <button class="cerrar" type="button">Cerrar</button>
</dialog>
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

  const cuadernos = [];
  const dirApuntes = join(CONTENIDO, 'apuntes');
  if (existsSync(dirApuntes)) {
    for (const nombre of (await readdir(dirApuntes, { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name).sort()) {
      const dir = join(dirApuntes, nombre);
      const archivos = (await readdir(dir)).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
      // `oculto: true` funciona como `aprendido: false` en los hechizos: el
      // apunte se queda en content/ con sus notas, pero no se publica.
      const fichas = await Promise.all(archivos.map((f) => leerFicha(join(dir, f))));
      cuadernos.push({
        meta: existsSync(join(dir, 'cuaderno.md'))
          ? await leerFicha(join(dir, 'cuaderno.md')) : null,
        apuntes: fichas.filter((a) => a.datos.oculto !== true),
      });
    }
  }

  // El curso en marcha manda en la primera cifra de la versión; si están
  // todos cerrados, el último que hubo.
  const cursos = await leerCarpeta('historias/cursos');
  const enMarcha = cursos.find((c) => c.datos.estado === 'en-curso')
    ?? [...cursos].sort((a, b) => (b.datos.curso ?? 0) - (a.datos.curso ?? 0))[0];
  VERSION = calcularVersion(enMarcha?.datos?.curso);

  return {
    version: VERSION,
    sora: porSlug['sora-winterbourne'],
    personajes, porSlug, nombreDe,
    criaturas: await leerCarpeta('criaturas'),
    // Los que Sora todavía no domina se dan de alta en content/ para poder
    // anotarlos antes de tiempo, pero no se publican: fuera de aquí el sitio
    // solo enseña lo que sabe hacer, páginas y volcados para máquinas incluidos.
    hechizos: (await leerCarpeta('hechizos')).filter((h) => h.datos.aprendido !== false),
    cursos,
    complementarias: await leerCarpeta('historias/complementarias'),
    galeria: await leerCarpeta('galeria'),
    conocidos: conocidos.conocidos ?? [],
    hilos, cuadernos,
  };
}

export { cargar, ficha, enlace, esc, md, seccion, secciones, definido, plantilla, listaDefs,
         registrarImagenes, imagenPorSlug, RAIZ, CONTENIDO, SALIDA, BASE, PAGINAS };
