#!/usr/bin/env node
/** Punto de entrada del generador: content/ -> dist/sora/ */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cargar, RAIZ, CONTENIDO, SALIDA, PAGINAS } from './build.mjs';
import * as P from './paginas.mjs';
import { llmsTxt, llmsFullTxt, contentJson, robotsTxt, sitemapXml, hiloMd } from './maquina.mjs';

const d = await cargar();

await rm(join(RAIZ, 'dist'), { recursive: true, force: true });
await mkdir(SALIDA, { recursive: true });

// Las rutas se van juntando para el sitemap: crecen con el contenido y no
// hay una lista fija que mantener a mano.
const rutas = [];
const escribir = async (rel, texto, { enMapa = true } = {}) => {
  await writeFile(join(SALIDA, rel), texto, 'utf8');
  if (enMapa) rutas.push(rel.replace(/(index)?\.html$/, '').replace(/\/$/, ''));
};

// Páginas fijas
const render = { index: P.portada, historia: P.historia, magia: P.magia,
                 entorno: P.entorno, galeria: P.galeria };
for (const p of PAGINAS.filter((p) => p.id !== 'cartas')) {
  await escribir(p.archivo, render[p.id](d));
  console.log(`· ${p.archivo}`);
}

// Cartas: un índice paginado y una página por hilo. A 1000 cartas una sola
// página serían más de 1 MB de HTML; el índice crece por hilo, no por carta.
await mkdir(join(SALIDA, 'cartas'), { recursive: true });
const paginasIndice = P.paginasIndice(d);
for (let i = 0; i < paginasIndice.length; i++) {
  await escribir(i === 0 ? 'cartas.html' : `cartas/pagina-${i + 1}.html`,
                 P.cartasIndice(d, i, paginasIndice.length));
}
const orden = P.hilosOrdenados(d);
for (let i = 0; i < orden.length; i++) {
  const h = orden[i];
  const slug = h.meta?.datos?.slug;
  if (!slug) continue;
  await escribir(`cartas/${slug}.html`, P.cartasHilo(d, h, {
    anterior: orden[i - 1], siguiente: orden[i + 1],
  }));
  // Versión en Markdown de cada hilo: una IA puede traerse solo la
  // conversación que le interesa en vez de llms-full.txt entero.
  await escribir(`cartas/${slug}.md`, hiloMd(d, h), { enMapa: false });
}
await escribir('cartas/indice.json', P.indiceJson(d), { enMapa: false });
console.log(`· cartas.html + ${orden.length} hilos (índice en ${paginasIndice.length} pág.)`);

// Estáticos
await cp(join(RAIZ, 'css'), join(SALIDA, 'css'), { recursive: true });
await cp(join(RAIZ, 'js'), join(SALIDA, 'js'), { recursive: true });
// Lenis se sirve desde el propio dominio, no desde un CDN: sin peticiones a
// terceros y sin depender de que ese CDN siga en pie.
await cp(join(RAIZ, 'node_modules', 'lenis', 'dist', 'lenis.min.js'),
         join(SALIDA, 'js', 'lenis.min.js'));
if (existsSync(join(RAIZ, 'assets'))) {
  await cp(join(RAIZ, 'assets'), join(SALIDA, 'assets'), {
    recursive: true, filter: (s) => !s.split('/').pop().startsWith('.'),
  });
}

// Imágenes de la galería
await mkdir(join(SALIDA, 'img'), { recursive: true });
for (const g of d.galeria) {
  await cp(join(CONTENIDO, 'galeria', g.datos.archivo), join(SALIDA, 'img', g.datos.archivo));
}
console.log(`· img/ (${d.galeria.length})`);

// Para máquinas
await writeFile(join(SALIDA, 'llms.txt'), llmsTxt(d), 'utf8');
await writeFile(join(SALIDA, 'llms-full.txt'), llmsFullTxt(d), 'utf8');
await writeFile(join(SALIDA, 'content.json'), contentJson(d), 'utf8');
await writeFile(join(SALIDA, 'robots.txt'), robotsTxt(), 'utf8');
await writeFile(join(SALIDA, 'sitemap.xml'), sitemapXml(rutas), 'utf8');
console.log('· llms.txt, llms-full.txt, content.json, robots.txt, sitemap.xml');

console.log(`\nSitio generado en dist/sora/ (${rutas.length} páginas) → se sirve en <host>/sora/`);
