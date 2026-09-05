#!/usr/bin/env node
/** Punto de entrada del generador: content/ -> dist/sora/ */
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cargar, RAIZ, CONTENIDO, SALIDA, PAGINAS } from './build.mjs';
import * as P from './paginas.mjs';
import { llmsTxt, llmsFullTxt, contentJson, robotsTxt, sitemapXml } from './maquina.mjs';

const d = await cargar();

await rm(join(RAIZ, 'dist'), { recursive: true, force: true });
await mkdir(SALIDA, { recursive: true });

// Páginas
const render = { index: P.portada, historia: P.historia, magia: P.magia,
                 cartas: P.cartas, entorno: P.entorno, galeria: P.galeria };
for (const p of PAGINAS) {
  await writeFile(join(SALIDA, p.archivo), render[p.id](d), 'utf8');
  console.log(`· ${p.archivo}`);
}

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
await writeFile(join(SALIDA, 'sitemap.xml'), sitemapXml(PAGINAS), 'utf8');
console.log('· llms.txt, llms-full.txt, content.json, robots.txt, sitemap.xml');

console.log('\nSitio generado en dist/sora/ → se sirve en <host>/sora/');
