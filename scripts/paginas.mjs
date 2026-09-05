/** Renderizado de las páginas del sitio. */
import { esc, md, seccion, secciones, definido, plantilla, listaDefs, astrolium, BASE, enlace } from './build.mjs';

const FECHA = { day: 'numeric', month: 'long', year: 'numeric' };
const fecha = (iso) => iso
  ? new Date(iso + 'T00:00:00Z').toLocaleDateString('es-ES', { ...FECHA, timeZone: 'UTC' })
  : null;

// ------------------------------------------------------------------ portada

export function portada(d) {
  const s = d.sora.datos;
  const retrato = d.galeria.find((g) => g.datos.slug === 'sora-frontal-uniforme');

  const hero = `<div class="cielo">${astrolium()}
  <div class="env">
    <div class="presentacion">
      ${retrato ? `<div class="retrato${retrato.datos.ui_visible ? ' recortado' : ''}">
        <img src="${BASE}/img/${esc(retrato.datos.archivo)}"
          width="${retrato.datos.ancho}" height="${retrato.datos.alto}"
          alt="Sora Winterbourne de frente, con el uniforme de Hufflepuff"></div>` : ''}
      <div>
        <h1>Sora Winterbourne</h1>
        <p class="epigrafe">Primer curso en Hufflepuff. Le faltan tres años de
        su infancia y le sobran ganas de empezar.</p>
        ${listaDefs([
          ['Casa', esc(s.casa)],
          ['Nacimiento', esc(fecha(s.nacimiento))],
          ['Nacionalidad', esc(s.nacionalidad)],
          ['Ojos', 'derecho azul, izquierdo dorado'],
          ['Lechuza', d.criaturas.length ? `<a href="${BASE}/entorno#aurora">Aurora</a>` : null],
        ])}
      </div>
    </div>
  </div></div>`;

  const bloques = (lista, clase) => `<div class="rejilla">` + (lista ?? []).map((x) =>
    `<div class="bloque bloque--${clase}"><h3>${esc(x.titulo)}</h3><p>${esc(x.descripcion)}</p></div>`
  ).join('') + `</div>`;

  const cuerpo = `
<section>
  <h2>Cómo es</h2>
  ${md(seccion(d.sora.cuerpo, 'Personalidad'))}
  ${md(seccion(d.sora.cuerpo, 'Descripción física'))}
  ${s.gustos?.length ? `<p class="plomo">Le gustan ${s.gustos.map((g) =>
      esc(g.toLowerCase())).join(', ')}.</p>` : ''}
</section>

<section>
  <h2>Lo que teme</h2>
  ${bloques(s.miedos, 'miedo')}
</section>

<section>
  <h2>Lo que quiere</h2>
  ${bloques(s.aspiraciones, 'aspiracion')}
</section>

<section>
  <h2>Quiénes lo sostienen</h2>
  ${md(seccion(d.sora.cuerpo, 'Vínculos'))}
  <p><a href="${BASE}/entorno">Su entorno, en detalle</a></p>
</section>`;

  return plantilla({
    id: 'index', titulo: 'Sora Winterbourne', hero, contenido: cuerpo,
    descripcion: 'Ficha de rol de Sora Winterbourne, alumno de primer curso en Hufflepuff.',
  });
}

// ----------------------------------------------------------------- historia

export function historia(d) {
  const cursos = d.cursos.map((c, i) => {
    const x = c.datos;
    const comp = d.complementarias.filter((h) => h.datos.curso === x.curso);
    return `<li>
      <span class="hito">${x.curso}</span>
      <h3>${esc(x.titulo)}</h3>
      <p class="cuando">${esc(x.casa ?? '')}${x.edad ? `, ${x.edad} años` : ''}${
        x.estado === 'en-curso' ? ' · en curso' : ''}</p>
      ${md(seccion(c.cuerpo, 'Resumen'))}
      ${x.clubes?.length ? `<ul>${x.clubes.map((k) =>
        `<li>${esc(k.nombre)}: ${esc(k.estado)}</li>`).join('')}</ul>` : ''}
      ${comp.map((h) => `<h3>${esc(h.datos.titulo)}</h3>${md(seccion(h.cuerpo, 'Historia'))}`).join('')}
    </li>`;
  }).join('');

  return plantilla({
    id: 'historia', titulo: 'Historia · Sora Winterbourne',
    descripcion: 'De dónde viene Sora y qué le ha pasado en el castillo.',
    contenido: `
<section>
  <h2>Antes de Hogwarts</h2>
  ${md(seccion(d.sora.cuerpo, 'Historia'))}
  <div class="hueco">
    <p class="rango">4 &mdash; 7</p>
    <p>Los recuerdos de Sora empiezan a los tres o cuatro a\u00f1os. Entre los
    cuatro y los siete no hay nada.</p>
    <p class="nota">El vac\u00edo que quiere desentra\u00f1ar cuando est\u00e9 listo
    para afrontarlo.</p>
  </div>
</section>

<section>
  <h2>En el castillo</h2>
  <ol class="crono">${cursos}</ol>
</section>`,
  });
}

// -------------------------------------------------------------------- magia

export function magia(d) {
  const valores = (campo) => [...new Set(d.hechizos.map((h) => h.datos[campo])
    .filter(definido))].sort();

  const grupo = (campo, etiqueta, lista, rotulo = (v) => v) => lista.length < 2 ? '' :
    `<div class="filtros" role="group" aria-label="${esc(etiqueta)}">
      <span class="filtros__rotulo">${esc(etiqueta)}</span>` + lista.map((v) =>
      `<button class="filtro" type="button" aria-pressed="false"
        data-campo="${esc(campo)}" data-valor="${esc(v)}">${esc(rotulo(v))}</button>`).join('') + '</div>';

  const fichas = d.hechizos.map((h) => {
    const x = h.datos;
    const relacionados = (x.relacionados ?? []).map((r) => esc(r.replace(/-/g, ' ')));
    return `<details class="hechizo${x.aprendido === false ? ' pendiente' : ''}"
      data-clase="${esc(x.clase ?? '')}" data-anio="${esc(x.anio ?? '')}">
      <summary>
        <span class="nombre">${esc(x.nombre)}</span>
        ${x.pronunciacion ? `<span class="conjuro">${esc(x.pronunciacion)}</span>` : ''}
        ${x.aprendido === false ? '<span class="marca-pendiente">aún no</span>' : ''}
        <span class="curso">${esc(x.clase)} · ${x.anio}.º curso</span>
      </summary>
      <div class="cuerpo">
        ${md(seccion(h.cuerpo, 'Descripción'))}
        ${listaDefs([
          ['Efecto', esc(x.efecto)],
          ['Manifestación', esc(x.manifestacion)],
          ['Duración', esc(x.duracion)],
          ['Movimiento', esc(x.movimiento)],
          ['Contrahechizo', esc(x.contrahechizo)],
          ['Tipo', esc(x.clasificacion)],
          ['Lleva a', relacionados.length ? relacionados.join(', ') : null],
        ])}
        ${seccion(h.cuerpo, 'Manifestación de Sora')
          ? `<h3>Cómo se ve el suyo</h3>${md(seccion(h.cuerpo, 'Manifestación de Sora'))}
             ${md(seccion(h.cuerpo, 'Lo que siente Sora'))}` : ''}
      </div>
    </details>`;
  }).join('');

  return plantilla({
    id: 'magia', titulo: 'Magia · Sora Winterbourne',
    descripcion: 'Los hechizos que Sora ha aprendido, y el que todavía no.',
    entrada: 'Lo que sabe hacer, y una cosa que todavía no: Astrolium es de cuarto '
      + 'curso y él va por primero, pero ya tiene decidido qué cielo proyecta.',
    contenido: `
<section>
  <h2>Hechizos</h2>
  ${grupo('clase', 'Asignatura', valores('clase'))}
  ${grupo('anio', 'Curso', valores('anio').map(String), (v) => `${v}.\u00ba curso`)}
  ${fichas}
  <p id="sin-resultados" hidden>Ningún hechizo cumple ese filtro.</p>
</section>`,
  });
}

// ------------------------------------------------------------------- cartas

export function cartas(d) {
  // El orden de esta página es de presentación, no del dato: llms-full.txt y
  // content.json siguen sirviendo los hilos y las cartas en su orden real.
  // Arriba lo que sigue vivo; dentro de cada hilo, lo último primero.
  const vivo = (h) => (h.meta?.datos?.estado === 'abierto' ? 0 : 1);
  const hilos = [...d.hilos].sort((a, b) => vivo(a) - vivo(b)).map((h) => {
    const meta = h.meta?.datos ?? {};
    // Un hilo «abierto» es el que aún espera respuesta: sus cartas nacen
    // abiertas, que es donde está lo que falta por contestar.
    const abierto = meta.estado === 'abierto';
    const recientes = [...h.cartas].reverse();

    const cartas = recientes.map((c, i) => {
      const x = c.datos;
      const deSora = (x.de ?? []).includes('sora-winterbourne');
      const de = (x.de ?? []).map(d.nombreDe).join(' y ');
      const para = (x.para ?? []).map(d.nombreDe).join(' y ');
      const adjuntos = x.adjuntos ?? [];
      return `<article class="carta carta--${deSora ? 'sora' : 'otro'}">
        <details class="sobre"${abierto ? ' open' : ''}>
          <summary>
            <span class="lacre" aria-hidden="true">${esc(de.trim().charAt(0))}</span>
            <span class="remite">
              <strong>${esc(de)}</strong>
              <span class="para">para ${esc(para)}</span>
              ${i === 0 && recientes.length > 1
                ? '<span class="reciente">la última del hilo</span>' : ''}
              ${adjuntos.length ? `<span class="con-adjunto">Lleva ${
                adjuntos.length === 1 ? 'un adjunto' : `${adjuntos.length} adjuntos`}</span>` : ''}
            </span>
            <span class="abrir" aria-hidden="true">Leer</span>
          </summary>
          <div class="papel">${md(c.cuerpo)}
          ${adjuntos.map((a) => `<p class="adjunto">Adjunto: ${esc(a)}</p>`).join('')}</div>
        </details>
      </article>`;
    }).join('');

    return `<div class="hilo">
      <h3>${esc(meta.titulo ?? meta.slug)}</h3>
      ${meta.asunto ? `<p class="cuando">${esc(meta.asunto)}${
        abierto ? ' · sin respuesta todavía' : ''}</p>` : ''}
      ${cartas}
    </div>`;
  }).join('');

  return plantilla({
    id: 'cartas', titulo: 'Cartas · Sora Winterbourne',
    descripcion: 'La correspondencia de Sora, por hilos.',
    entrada: 'Las de Sora van a la derecha; las respuestas, a la izquierda. En cada '
      + 'hilo la más reciente va arriba, y llegan lacradas: ábrelas para leerlas. '
      + 'Aurora las trae.',
    contenido: `
<section>
  <h2>Correspondencia</h2>
  ${hilos}
</section>`,
  });
}

// ------------------------------------------------------------------ entorno

export function entorno(d) {
  // Los secundarios existen aquí como personas de la vida de Sora. Su guía de
  // interpretación —apodos, manierismos, frases— se queda fuera del sitio.
  const personas = d.personajes.filter((p) => p.datos.slug !== 'sora-winterbourne')
    .map((p) => {
      const x = p.datos;
      return `<article class="persona" id="${esc(x.slug)}">
        <h3>${esc([x.tratamiento, x.nombre, x.apellido].filter(Boolean).join(' '))}</h3>
        <p class="papel-social">${esc(x.relacion_con_sora ?? '')}</p>
        ${listaDefs([['Ocupación', esc(x.ocupacion)], ['Casa', esc(x.casa)]])}
        ${md(seccion(p.cuerpo, 'Trato hacia Sora'))}
      </article>`;
    }).join('');

  const criaturas = d.criaturas.map((c) => {
    const x = c.datos;
    return `<article class="persona" id="${esc(x.slug)}">
      <h3>${esc(x.nombre)}</h3>
      <p class="papel-social">${esc(x.especie)} de ${esc(d.nombreDe(x.propietario))}</p>
      ${listaDefs([
        ['Edad', x.edad ? `${x.edad} años` : null],
        ['Tamaño', esc(x.tamano?.descripcion)],
        ['Carácter', (x.caracteristicas ?? []).map(esc).join(', ')],
      ])}
      ${md(seccion(c.cuerpo, 'Descripción física'))}
      ${md(seccion(c.cuerpo, 'Historia'))}
      ${md(seccion(c.cuerpo, 'Comportamiento'))}
    </article>`;
  }).join('');

  const conocidos = d.conocidos.map((c) => `<article class="persona">
    <h3>${esc(c.nombre)}</h3>
    <p class="papel-social">${esc(definido(c.cargo) ? c.cargo : c.relacion)}</p>
    ${definido(c.casa) ? listaDefs([['Casa', esc(c.casa)]]) : ''}
    ${c.info?.length ? `<ul>${c.info.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
  </article>`).join('');

  return plantilla({
    id: 'entorno', titulo: 'Entorno · Sora Winterbourne',
    descripcion: 'La gente y los animales alrededor de Sora.',
    contenido: `
<section>
  <h2>Su familia</h2>
  <p class="plomo">Los Winterbourne no son sus padres biológicos, pero llevan
  siendo su casa desde que tiene siete años.</p>
  ${personas}
</section>

<section>
  <h2>Aurora</h2>
  ${criaturas}
</section>

${conocidos ? `<section>
  <h2>Conocidos del castillo</h2>
  <p class="plomo">Gente con la que Sora ya ha tratado.</p>
  ${conocidos}
</section>` : ''}`,
  });
}

// ------------------------------------------------------------------ galería

export function galeria(d) {
  // Del catálogo de imágenes solo salen título y descripción: los campos de
  // aptitud como referencia son herramienta interna, no contenido del sitio.
  const fotos = d.galeria.map((g) => {
    const x = g.datos;
    return `<figure>
      <button type="button" data-grande="${BASE}/img/${esc(x.archivo)}"
        data-alt="${esc(x.descripcion)}">
        <img src="${BASE}/img/${esc(x.archivo)}" alt="${esc(x.titulo)}"
          width="${x.ancho}" height="${x.alto}" loading="lazy">
      </button>
      <figcaption>${esc(x.titulo)}</figcaption>
    </figure>`;
  }).join('');

  return plantilla({
    id: 'galeria', titulo: 'Galería · Sora Winterbourne',
    descripcion: 'Capturas de Sora en el juego.',
    entrada: 'Capturas tomadas dentro del juego, tal como se ve en pantalla.',
    contenido: `
<section>
  <h2>Capturas</h2>
  <div class="galeria">${fotos}</div>
</section>
<dialog class="visor">
  <img alt="">
  <p></p>
  <button class="cerrar" type="button">Cerrar</button>
</dialog>`,
  });
}
