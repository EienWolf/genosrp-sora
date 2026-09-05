/**
 * Salidas legibles por máquina.
 *
 * El sitio HTML es una selección; esto no lo es. Nada en content/ está marcado
 * como privado, así que aquí va TODO: los campos que el sitio omite, las guías
 * de interpretación de los secundarios, los metadatos de las imágenes y las
 * banderas internas. Si una IA consulta el sitio, debe poder llegar a todo.
 */
import { BASE, enlace } from './build.mjs';

const URL_BASE = 'https://genosrp.eienwolf.dev' + BASE;

/** Índice breve, según la convención llms.txt. */
export function llmsTxt(d) {
  const l = [];
  l.push('# Sora Winterbourne');
  l.push('');
  l.push('> Ficha de rol de Sora Winterbourne, alumno de primer curso en');
  l.push('> Hufflepuff, en un rol de Harry Potter en español. Este sitio se');
  l.push('> genera desde archivos Markdown con frontmatter YAML; nada del');
  l.push('> material es privado.');
  l.push('');
  l.push('El sitio HTML muestra una selección pensada para leerse. Para el');
  l.push('material completo —incluidas las guías de interpretación de los');
  l.push('personajes secundarios y los metadatos técnicos de las imágenes—');
  l.push('usa llms-full.txt o content.json.');
  l.push('');
  l.push('## Todo el contenido');
  l.push('');
  l.push(`- [llms-full.txt](${URL_BASE}/llms-full.txt): cada ficha completa, en Markdown.`);
  l.push(`- [content.json](${URL_BASE}/content.json): lo mismo, estructurado.`);
  l.push('');
  l.push('## Páginas');
  l.push('');
  l.push(`- [Sora](${URL_BASE}/): quién es, qué teme y qué quiere.`);
  l.push(`- [Historia](${URL_BASE}/historia): su pasado y su paso por el castillo.`);
  l.push(`- [Magia](${URL_BASE}/magia): ${d.hechizos.length} hechizos.`);
  l.push(`- [Cartas](${URL_BASE}/cartas): ${d.hilos.length} hilos de correspondencia.`);
  l.push(`- [Entorno](${URL_BASE}/entorno): tutores, terapeuta, su lechuza y conocidos.`);
  l.push(`- [Galería](${URL_BASE}/galeria): ${d.galeria.length} capturas del juego.`);
  l.push('');
  l.push('## Cómo está organizado');
  l.push('');
  l.push('- Cada entidad es un archivo; las referencias entre fichas van por `slug`.');
  l.push('- `aprendido: false` marca un hechizo que Sora todavía no domina.');
  l.push('- `"?"` en un dato significa desconocido y pendiente, no vacío.');
  l.push('- `bloqueado` y los campos de aptitud de las imágenes son herramientas');
  l.push('  internas de mantenimiento, no información sobre el personaje.');
  return l.join('\n') + '\n';
}

/** Todo el material, en un solo archivo de texto. */
export function llmsFullTxt(d) {
  const l = ['# Sora Winterbourne — material completo', ''];
  l.push('Volcado íntegro de content/. Cada ficha lleva sus datos en YAML y su');
  l.push('texto en Markdown, tal cual están en el repositorio.');
  l.push('');

  const ficha = (titulo, f) => {
    l.push(`## ${titulo}`);
    l.push('');
    l.push('```yaml');
    l.push(JSON.stringify(f.datos, null, 2));
    l.push('```');
    l.push('');
    if (f.cuerpo) { l.push(f.cuerpo); l.push(''); }
  };

  l.push('# Personajes'); l.push('');
  for (const p of d.personajes) ficha(`${p.datos.nombre} ${p.datos.apellido ?? ''}`.trim(), p);
  l.push('# Criaturas'); l.push('');
  for (const c of d.criaturas) ficha(c.datos.nombre, c);
  l.push('# Hechizos'); l.push('');
  for (const h of d.hechizos) ficha(h.datos.nombre, h);
  l.push('# Cronología'); l.push('');
  for (const c of d.cursos) ficha(c.datos.titulo, c);
  for (const c of d.complementarias) ficha(c.datos.titulo, c);
  l.push('# Cartas'); l.push('');
  for (const hilo of d.hilos) {
    l.push(`## Hilo: ${hilo.meta?.datos.titulo ?? ''}`); l.push('');
    for (const c of hilo.cartas) {
      const de = (c.datos.de ?? []).join(', ');
      const para = (c.datos.para ?? []).join(', ');
      l.push(`### Carta ${c.datos.orden}: ${de} → ${para}`); l.push('');
      if (c.datos.adjuntos?.length) l.push(`Adjuntos: ${c.datos.adjuntos.join('; ')}`), l.push('');
      if (c.datos.emotes?.length) {
        for (const e of c.datos.emotes) l.push(`/${e.comando} ${e.texto}`);
        l.push('');
      }
      l.push(c.cuerpo); l.push('');
    }
  }
  l.push('# Conocidos'); l.push('');
  l.push('```json'); l.push(JSON.stringify(d.conocidos, null, 2)); l.push('```'); l.push('');
  l.push('# Galería'); l.push('');
  for (const g of d.galeria) ficha(g.datos.titulo, g);
  return l.join('\n');
}

export function contentJson(d) {
  const limpia = (f) => ({ ...f.datos, ruta: f.ruta, cuerpo: f.cuerpo });
  return JSON.stringify({
    generado: new Date().toISOString().slice(0, 10),
    aviso: 'Volcado íntegro de content/. Nada está marcado como privado. '
         + 'El sitio HTML muestra una selección; esto no.',
    personaje_principal: 'sora-winterbourne',
    personajes: d.personajes.map(limpia),
    criaturas: d.criaturas.map(limpia),
    hechizos: d.hechizos.map(limpia),
    cronologia: { cursos: d.cursos.map(limpia), complementarias: d.complementarias.map(limpia) },
    cartas: d.hilos.map((h) => ({ ...(h.meta?.datos ?? {}), cartas: h.cartas.map(limpia) })),
    conocidos: d.conocidos,
    galeria: d.galeria.map(limpia),
  }, null, 2);
}

export function robotsTxt() {
  return `# Todo el material es público y puede indexarse y citarse.
User-agent: *
Allow: /

# Para modelos de lenguaje: el contenido completo está aquí.
# ${URL_BASE}/llms.txt
# ${URL_BASE}/llms-full.txt
# ${URL_BASE}/content.json

Sitemap: ${URL_BASE}/sitemap.xml
`;
}

export function sitemapXml(paginas) {
  const hoy = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginas.map((p) => `  <url><loc>${URL_BASE}/${enlace(p)}</loc>`
  + `<lastmod>${hoy}</lastmod></url>`).join('\n')}
</urlset>
`;
}
