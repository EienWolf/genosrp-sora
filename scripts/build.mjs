// Copia el sitio estático a dist/sora/ para que Cloudflare lo sirva bajo /sora.
// Sin dependencias: solo la librería estándar de Node.
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist');
const siteDir = join(outDir, 'sora');

// Qué se publica. Todo lo demás (scripts, wrangler.jsonc, .env…) se queda fuera.
const entries = ['index.html', 'css', 'js', 'assets'];

await rm(outDir, { recursive: true, force: true });
await mkdir(siteDir, { recursive: true });

for (const entry of entries) {
  const from = join(root, entry);
  if (!existsSync(from)) {
    console.warn(`· omitido (no existe): ${entry}`);
    continue;
  }
  // Se excluyen los archivos ocultos (.gitkeep, .DS_Store…): no son contenido.
  await cp(from, join(siteDir, entry), {
    recursive: true,
    filter: (src) => !basename(src).startsWith('.'),
  });
  console.log(`· copiado: ${entry}`);
}

console.log(`\nSitio listo en dist/sora/ → se servirá en <host>/sora/`);
