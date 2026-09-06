/** Renderizado de las páginas del sitio. */
import { esc, md, seccion, secciones, definido, plantilla, listaDefs, BASE, enlace } from './build.mjs';

const FECHA = { day: 'numeric', month: 'long', year: 'numeric' };
const fecha = (iso) => iso
  ? new Date(iso + 'T00:00:00Z').toLocaleDateString('es-ES', { ...FECHA, timeZone: 'UTC' })
  : null;
/** El día y el mes, sin año: es el cumpleaños, que es lo que se usa jugando. */
const diaYMes = (iso) => iso
  ? new Date(iso + 'T00:00:00Z').toLocaleDateString('es-ES',
      { day: 'numeric', month: 'long', timeZone: 'UTC' })
  : null;
// El año de nacimiento y la edad no se publican: fijarían la fecha del rol.
// El dato vive en content/ y llega entero a llms-full.txt y content.json.

const ORDINALES = ['', 'Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto',
                   'Sexto', 'Séptimo', 'Octavo'];
/** El curso que está cursando ahora sale de content/historias/cursos/: el que
 *  está `en-curso`. Así no hay un dato que mantener en dos sitios y al subir
 *  de año basta con cerrar uno y abrir el siguiente. */
export function cursoActual(d) {
  const c = (d.cursos ?? []).find((x) => x.datos.estado === 'en-curso')
    ?? [...(d.cursos ?? [])].sort((a, b) => (b.datos.curso ?? 0) - (a.datos.curso ?? 0))[0];
  if (!c) return null;
  const n = c.datos.curso;
  return { n, edad: c.datos.edad, casa: c.datos.casa,
           ordinal: ORDINALES[n] ?? `${n}.º`,
           texto: `${ORDINALES[n] ?? n + '.º'} curso` };
}

// ------------------------------------------------------------------ portada

/** El color con el que se pinta un rasgo descrito en palabras. */
const color = (texto) => {
  const t = String(texto ?? '').toLowerCase();
  if (t.includes('azul')) return 'var(--azul)';
  if (t.includes('dorad') || t.includes('ámbar') || t.includes('ambar')) return 'var(--oro)';
  return 'var(--plata-2)';
};

/** Las chapas del uniforme, alternando el metal: dorada, azul, dorada… */
const chapas = (lista) => (lista ?? []).length
  ? `<ul class="chapas">` + lista.map((c, i) =>
      `<li class="chapa chapa--${i % 2 ? 'azul' : 'oro'}">${esc(c)}</li>`).join('') + `</ul>`
  : '';

export function portada(d) {
  const s = d.sora.datos;
  const curso = cursoActual(d);
  // Qué imagen abre la portada lo decide el contenido, no este archivo: la
  // ficha que lleve `retrato_principal: true`.
  const retrato = d.galeria.find((g) => g.datos.retrato_principal === true)
    ?? d.galeria.find((g) => g.datos.rostro_visible === true);

  // Los dos ojos se dicen con su color al lado: es el rasgo por el que se le
  // reconoce, y en una lista de datos se leía como una fila más.
  const ojo = (lado, valor) => definido(valor)
    ? `<span class="iris" style="--iris:${color(valor)}" aria-hidden="true"></span>`
      + `${lado} ${esc(String(valor).toLowerCase())}`
    : null;
  const ojos = [ojo('derecho', s.fisico?.ojos?.derecho), ojo('izquierdo', s.fisico?.ojos?.izquierdo)]
    .filter(Boolean).join(' ');

  const hero = `<div class="cielo">
  <div class="env">
    <div class="presentacion">
      ${retrato ? `<figure class="polaroid">
        <div class="polaroid__marco">
          <div class="polaroid__foto polaroid__foto--${esc(retrato.datos.clase ?? 'captura')}${
            retrato.datos.ui_visible ? ' recortado' : ''}">
            <img src="${BASE}/img/${esc(retrato.datos.archivo)}"
              width="${retrato.datos.ancho}" height="${retrato.datos.alto}"
              alt="${esc(retrato.datos.titulo)}: ${esc(retrato.datos.atuendo ?? '')}"></div>
          ${curso ? `<figcaption class="polaroid__pie">Sora, ${esc(curso.texto.toLowerCase())}
            <span aria-hidden="true">✦</span></figcaption>` : ''}
        </div>
        ${chapas(s.chapitas)}
      </figure>` : ''}
      <div>
        ${curso && definido(s.casa) ? `<p class="rotulo-mano">${esc(s.casa.toLowerCase())} · ${
          esc(curso.texto.toLowerCase())} <span aria-hidden="true">✦</span></p>` : ''}
        <h1>Sora Winterbourne</h1>
        ${definido(s.lema) ? `<p class="lema">${esc(s.lema)}</p>` : ''}
        ${listaDefs([
          ['Curso', curso ? esc(curso.texto) : null],
          ['Casa', esc(s.casa)],
          ['Cumpleaños', esc(diaYMes(s.nacimiento))],
          ['Nacionalidad', esc(s.nacionalidad)],
          ['Altura', esc(s.fisico?.altura)],
          ['Peso', esc(s.fisico?.peso)],
          ['Ojos', ojos || null],
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
  ${listaDefs([
    ['Voz', esc(s.fisico?.voz)],
    ['Aroma', esc(s.fisico?.aroma)],
    ['Gesto', esc(s.fisico?.expresion)],
  ])}
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
  // Todo al revés, como las cartas: lo último que ha pasado, arriba. Dentro
  // de un curso, el resumen va primero porque se escribe al cerrarlo, y
  // debajo las historias sueltas de ese año.
  const cursoLi = (c) => {
    const x = c.datos;
    return `<li id="${esc(x.slug ?? '')}">
      <span class="hito">${x.curso}</span>
      <h3>${esc(x.titulo)}</h3>
      <p class="cuando">${esc(x.casa ?? '')}${
        x.estado === 'en-curso' ? ' · en curso' : ''}${
        x.resumen_pendiente ? ' · resumen pendiente' : ''}</p>
      ${md(seccion(c.cuerpo, 'Resumen'))}
      ${x.clubes?.length ? `<ul>${x.clubes.map((k) =>
        `<li>${esc(k.nombre)}: ${esc(k.estado)}</li>`).join('')}</ul>` : ''}
    </li>`;
  };

  // Los cursos son hitos numerados; los sucesos sueltos, estrellas. Así se
  // distingue de un vistazo el año del suceso que pasó dentro de él.
  const sueltaLi = (h, suelta = false) => {
    const x = h.datos;
    // Colgando de su curso, repetir el año era decir dos veces lo mismo: la
    // posición ya lo dice. Solo se rotula si la historia va suelta al final.
    const cuando = fecha(x.fecha)
      ?? (suelta && definido(x.curso) ? `${ORDINALES[x.curso] ?? x.curso} curso` : null);
    return `<li class="suceso" id="${esc(x.slug ?? '')}">
      <span class="hito hito--estrella hito--oro" aria-hidden="true">✦</span>
      ${cuando ? `<p class="cuando">${esc(cuando)}</p>` : ''}
      <h3>${esc(x.titulo)}</h3>
      ${md(seccion(h.cuerpo, 'Historia'))}
    </li>`;
  };

  // Sin fecha no hay cronología fiable dentro de un curso: queda el orden del
  // nombre del archivo, invertido como todo lo demás de esta página.
  const porFecha = (lista) => [...lista].reverse()
    .sort((a, b) => String(b.datos.fecha ?? '').localeCompare(String(a.datos.fecha ?? '')));

  const cursos = [...d.cursos].sort((a, b) => (b.datos.curso ?? 0) - (a.datos.curso ?? 0));
  const colocadas = new Set();
  const castillo = cursos.map((c) => {
    const sueltas = porFecha(d.complementarias.filter((h) => h.datos.curso === c.datos.curso));
    sueltas.forEach((h) => colocadas.add(h));
    return cursoLi(c) + sueltas.map(sueltaLi).join('');
  }).join('')
  // Una historia cuyo curso no existe todavía no se pierde: cae al final.
  + porFecha(d.complementarias.filter((h) => !colocadas.has(h)))
      .map((h) => sueltaLi(h, true)).join('');

  // La infancia también al revés, y así enlaza con lo de arriba: la última
  // que se lee del castillo es la llegada, y la primera de aquí, la carta.
  const infancia = [...(d.sora.datos.hitos ?? [])].reverse().map((h, i) => {
    if (h.hueco === true) {
      return `<li class="hito-hueco">
        <span class="hito hito--apagado" aria-hidden="true">✧</span>
        <div class="hueco">
          <p class="rango">${esc(h.edad)}</p>
          <p>${esc(h.texto)}</p>
        </div>
      </li>`;
    }
    return `<li style="--paso:${i}">
      <span class="hito hito--estrella hito--${i % 2 ? 'azul' : 'oro'}" aria-hidden="true">✦</span>
      <p class="cuando">${esc(h.edad)}</p>
      ${definido(h.titulo) ? `<h3>${esc(h.titulo)}</h3>` : ''}
      <p>${esc(h.texto)}</p>
    </li>`;
  }).join('');

  return plantilla({
    id: 'historia', titulo: 'Historia · Sora Winterbourne',
    descripcion: 'De dónde viene Sora y qué le ha pasado en el castillo.',
    contenido: `
<section>
  <h1>En el castillo</h1>
  <p class="plomo">Lo último, arriba. Cada curso trae debajo las historias que
  pasaron dentro de él.</p>
  <ol class="crono">${castillo}</ol>
</section>

<section>
  <h2>Antes de Hogwarts</h2>
  ${infancia ? `<ol class="crono crono--infancia">${infancia}</ol>` : ''}
  <details class="entera">
    <summary>La versión larga</summary>
    ${md(seccion(d.sora.cuerpo, 'Historia'))}
  </details>
</section>`,
  });
}

// -------------------------------------------------------------------- magia

// Las materias llegan de la base de discord-hechizos como slugs sin acentos
// («dcao-hechizos», «pociones-teoria»). Estas son las ocho que existen allí,
// que es el universo completo de asignaturas en las que Sora puede acabar
// teniendo hechizos. El nombre largo va en el filtro y el corto en la ficha,
// donde el espacio manda.
const MATERIAS = {
  'transfiguracion': { nombre: 'Transfiguración', corto: 'Transfiguración' },
  'encantamientos':  { nombre: 'Encantamientos', corto: 'Encantamientos' },
  'dcao-hechizos':   { nombre: 'Defensa contra las Artes Oscuras', corto: 'Defensa' },
  'hechiceria':      { nombre: 'Hechicería', corto: 'Hechicería' },
  'duelo':           { nombre: 'Duelo', corto: 'Duelo' },
  'medimagia':       { nombre: 'Medimagia', corto: 'Medimagia' },
  'pociones-teoria': { nombre: 'Pociones (teoría)', corto: 'Pociones' },
  'herbologia':      { nombre: 'Herbología', corto: 'Herbología' },
};
// Una materia nueva en la base no debe romper la página: se muestra con el
// slug arreglado a mano hasta que se le dé nombre aquí arriba.
const materia = (slug, campo = 'nombre') => MATERIAS[slug]?.[campo]
  ?? (slug ? slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Sin materia');

const SIN_CURSO = 'Sin curso asignado';

export function magia(d) {
  // Por curso y luego por nombre: así se lee como una progresión. Los que la
  // base no sabe de qué curso son van al final, no mezclados en el primero.
  const hechizos = [...d.hechizos].sort((a, b) =>
    (a.datos.anio ?? 99) - (b.datos.anio ?? 99)
    || String(a.datos.nombre).localeCompare(String(b.datos.nombre), 'es'));

  const cuenta = (campo, valor) => hechizos.filter((h) =>
    String(h.datos[campo] ?? '') === String(valor)).length;

  const grupo = (campo, etiqueta, valores, rotulo) => valores.length < 2 ? '' :
    `<div class="filtros" role="group" aria-label="${esc(etiqueta)}">
      <span class="filtros__rotulo">${esc(etiqueta)}</span>
      <span class="filtros__opciones">` + valores.map((v) =>
      `<button class="filtro" type="button" aria-pressed="false"
        data-campo="${esc(campo)}" data-valor="${esc(v)}">${esc(rotulo(v))}` +
      `<span class="cuenta">${cuenta(campo, v)}</span></button>`).join('')
      + '</span></div>';

  const clases = [...new Set(hechizos.map((h) => h.datos.clase).filter(definido))]
    .sort((a, b) => materia(a).localeCompare(materia(b), 'es'));
  // El curso vacío también es un filtro: si no, esos hechizos no se pueden
  // aislar y parecen un fallo.
  const cursos = [...new Set(hechizos.map((h) => h.datos.anio ?? ''))]
    .sort((a, b) => (a === '' ? 99 : a) - (b === '' ? 99 : b));

  const fichas = hechizos.map((h) => {
    const x = h.datos;
    const relacionados = (x.relacionados ?? []).map((r) => esc(r.replace(/-/g, ' ')));
    const curso = definido(x.anio) ? `${x.anio}.º curso` : SIN_CURSO;
    // Lo que busca el buscador: se prepara aquí para no leer el DOM al teclear.
    const busca = [x.nombre, x.nombre_alt, x.pronunciacion, materia(x.clase),
                   x.resumen, x.voz, x.efecto, x.manifestacion, ...(x.categorias ?? [])]
      .filter(definido).join(' ').toLowerCase();
    return `<details class="hechizo${x.aprendido === false ? ' pendiente' : ''}"
      id="${esc(x.slug ?? '')}"
      data-clase="${esc(x.clase ?? '')}" data-anio="${esc(x.anio ?? '')}"
      data-busca="${esc(busca)}">
      <summary>
        <span class="rotulo-hechizo">
          <span class="nombre">${esc(x.nombre)}</span>
          ${x.aprendido === false
            ? '<span class="marca-pendiente">aún no</span>'
            : '<span class="chispa" aria-hidden="true">✦</span>'}
        </span>
        <span class="curso">${esc(materia(x.clase, 'corto'))} · ${esc(curso)}${
          x.pronunciacion ? ` · <span class="conjuro">${esc(x.pronunciacion)}</span>` : ''}</span>
        ${definido(x.resumen) ? `<span class="resumen">${esc(x.resumen)}</span>` : ''}
        ${definido(x.voz) ? `<span class="voz">«${esc(x.voz)}»</span>` : ''}
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
          ['Categorías', (x.categorias ?? []).map(esc).join(', ') || null],
          ['Materia', esc(materia(x.clase))],
          ['Lleva a', relacionados.length ? relacionados.join(', ') : null],
        ])}
        ${seccion(h.cuerpo, 'Manifestación de Sora')
          ? `<h3>Cómo se ve el suyo</h3>${md(seccion(h.cuerpo, 'Manifestación de Sora'))}
             ${md(seccion(h.cuerpo, 'Lo que siente Sora'))}` : ''}
      </div>
    </details>`;
  }).join('');

  const n = hechizos.length;
  return plantilla({
    id: 'magia', titulo: 'Magia · Sora Winterbourne',
    descripcion: 'Los hechizos que Sora ha aprendido, y el que todavía no.',
    contenido: `
<section>
  <h1>${n} ${n === 1 ? 'hechizo' : 'hechizos'}</h1>
  <p class="plomo">Lo que sabe hacer, y una cosa que todavía no: Astrolium es de
  cuarto curso y él va por ${(cursoActual(d)?.ordinal ?? '').toLowerCase()}, pero ya
  tiene decidido qué cielo proyecta.</p>
  <div class="buscador">
    <label for="buscar-hechizo">Buscar</label>
    <input id="buscar-hechizo" type="search" autocomplete="off"
      placeholder="nombre, conjuro, efecto o categoría" data-busca-local>
  </div>
  ${grupo('clase', 'Materia', clases, (v) => materia(v))}
  ${grupo('anio', 'Curso', cursos, (v) => (v === '' ? 'sin curso' : `${v}.º`))}
  <p class="recuento" data-total="${n}" data-singular="hechizo" data-plural="hechizos"
    role="status">${n} ${n === 1 ? 'hechizo' : 'hechizos'}</p>
  <div class="rejilla-hechizos">${fichas}</div>
  <p id="sin-resultados" hidden>Ningún hechizo cumple ese filtro.</p>
</section>`,
  });
}

// ------------------------------------------------------------------ apuntes

// Los cuadernos son la teoría de las asignaturas reescrita por Sora. A
// diferencia de los hechizos, aquí la fuente es la teoría del castillo y la
// redacción es suya: el sitio marca de dónde viene cada apunte y si lo ha
// llegado a preparar o solo lo ha leído.
export const rutaCuaderno = (slug) => `${BASE}/apuntes/${slug}`;

const TEMAS = { fundamentos: 'Fundamentos', equipo: 'Equipo', pocion: 'Pociones' };
const VIAS = {
  clase:   { texto: 'visto en clase', clase: 'via--clase' },
  lectura: { texto: 'solo leído', clase: 'via--lectura' },
  casa:    { texto: 'aprendido en casa', clase: 'via--casa' },
};

/** El color de una poción descrito en palabras: se busca el primero que se
 *  reconozca, y el texto entero se sigue mostrando tal cual está escrito. */
const TONOS = [
  ['rosa', '#e88ab0'], ['rojo', '#c2543f'], ['naranja', '#d98040'],
  ['púrpura', '#8f6bb8'], ['purpura', '#8f6bb8'], ['morado', '#8f6bb8'],
  ['verde', '#6fae62'], ['azul', '#4a9ee0'], ['amarillo', '#e0c93c'],
  ['dorado', '#e0a63c'], ['marrón', '#8a6a44'], ['marron', '#8a6a44'],
  ['negro', '#2a2216'], ['blanco', '#e8eaf2'], ['incoloro', 'transparent'],
];
const tono = (texto) => {
  const t = String(texto ?? '').toLowerCase();
  return (TONOS.find(([n]) => t.includes(n)) ?? [, 'var(--tinta-2)'])[1];
};

/** «34 min» cabe en la caja del caldero como «34′»; lo que no siga ese
 *  patrón se deja tal cual y la caja se estira. */
const minutos = (v) => String(v ?? '').replace(/^(\d+)\s*min\.?$/i, '$1′');

export function apuntesIndice(d) {
  const filas = d.cuadernos.map((c) => {
    const m = c.meta?.datos ?? {};
    const n = c.apuntes.length;
    const preparados = c.apuntes.filter((a) => a.datos.elaborado === true).length;
    return `<li class="fila-hilo" id="${esc(m.slug ?? '')}">
      <a href="${rutaCuaderno(m.slug)}">
        <span class="lacre--mini" aria-hidden="true">${
          esc((m.titulo ?? '?').charAt(0).toUpperCase())}</span>
        <span class="fila-texto">
          <strong>${esc(m.titulo ?? m.slug)}</strong>
          <span class="con">${n} ${n === 1 ? 'apunte' : 'apuntes'}${
            preparados ? ` · ${preparados} preparados` : ''}</span>
        </span>
        ${m.estado === 'en-curso' ? '<span class="marca-abierto">en curso</span>' : ''}
      </a>
    </li>`;
  }).join('');

  return plantilla({
    id: 'apuntes', titulo: 'Apuntes · Sora Winterbourne',
    descripcion: 'Los cuadernos donde Sora reescribe la teoría de sus asignaturas.',
    contenido: `
<section>
  <h1>${d.cuadernos.length} ${d.cuadernos.length === 1 ? 'cuaderno' : 'cuadernos'}</h1>
  <p class="plomo">La teoría de las asignaturas, copiada del castillo y reescrita
  por él con sus palabras. Separa lo que ha preparado de lo que solo ha leído.</p>
  <ul class="hilos">${filas}</ul>
</section>`,
  });
}

export function apuntesCuaderno(d, c) {
  const m = c.meta?.datos ?? {};
  const apuntes = [...c.apuntes].sort((a, b) =>
    (a.datos.orden ?? 0) - (b.datos.orden ?? 0));

  const indice = apuntes.map((a) =>
    `<li><a href="#${esc(a.datos.slug)}">${esc(a.datos.titulo)}</a></li>`).join('');

  const fichas = apuntes.map((a) => {
    const x = a.datos;
    const via = VIAS[x.via];
    // Los tiempos por caldero se dibujan uno a uno; lo que no viene por
    // caldero (`general`) es texto y va debajo, en una línea.
    const reposo = Object.entries(x.reposo ?? {});
    const calderos = reposo.filter(([k]) => k !== 'general');
    const general = reposo.filter(([k]) => k === 'general').map(([, v]) => v).join(' · ');

    return `<article class="pergamino" id="${esc(x.slug)}">
      <div class="pergamino__hoja">
      <p class="sellos">
        ${via ? `<span class="sello ${via.clase}">${via.texto}</span>` : ''}
        ${x.curso ? `<span class="sello">${x.curso}.º curso</span>` : ''}
        ${x.tema && TEMAS[x.tema] ? `<span class="sello">${esc(TEMAS[x.tema])}</span>` : ''}
        ${x.elaborado === true ? '<span class="sello sello--hecho">lo ha preparado</span>' : ''}
        ${definido(x.dificultad)
          ? `<span class="sello">dificultad ${esc(x.dificultad)}</span>` : ''}
        ${x.orden ? `<span class="sello sello--numero">apunte n.º ${x.orden}</span>` : ''}
      </p>
      <h3>${esc(x.titulo)}</h3>
      ${x.ingredientes?.length ? `<div class="receta">
        <div class="receta__lista">
          <p class="rotulo">ingredientes</p>
          <ul>${x.ingredientes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        </div>
        ${definido(x.color_final) ? `<p class="receta__color">
          <span class="rotulo">queda</span>
          <span class="gota" style="--gota:${tono(x.color_final)}" aria-hidden="true"></span>
          <span class="receta__tono">${esc(x.color_final)}</span>
        </p>` : ''}
      </div>` : ''}
      ${calderos.length ? `<div class="reposo">
        <p class="rotulo">reposo según el caldero</p>
        <ul class="calderos">${calderos.map(([k, v]) =>
          `<li class="caldero"><b>${esc(minutos(v))}</b><small>${esc(k)}</small></li>`).join('')}</ul>
      </div>` : ''}
      ${listaDefs([
        ['Reposo', esc(general)],
        ['Aplicación', esc(x.aplicacion)],
        ['Creador', esc(x.creador)],
      ])}
      ${x.advertencias?.length ? `<div class="aviso">
        <p class="rotulo">¡¡ojo!!</p>
        <ul>${x.advertencias.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>` : ''}
      ${md(a.cuerpo.replace(/^(#{2,3}) /gm, (_, h) => '#'.repeat(h.length + 2) + ' '))}
      ${x.fuente ? `<p class="fuente">Fuente: ${esc(x.fuente)}</p>` : ''}
      </div>
    </article>`;
  }).join('');

  const preparados = apuntes.filter((a) => a.datos.elaborado === true).length;
  return plantilla({
    id: 'apuntes',
    rotulo: m.titulo ?? m.slug,
    titulo: `${m.titulo ?? m.slug} · Sora Winterbourne`,
    descripcion: `${apuntes.length} apuntes de ${m.titulo ?? m.slug}, escritos por Sora.`,
    entrada: m.subtitulo ?? '',
    volver: { href: `${BASE}/apuntes`, texto: 'Todos los cuadernos' },
    contenido: `
<section>
  <h2>Sobre este cuaderno</h2>
  ${md(seccion(c.meta?.cuerpo ?? '', 'Sobre este cuaderno'))}
  <p class="recuento" data-total="${apuntes.length}">${apuntes.length} apuntes${
    preparados ? `, ${preparados} preparados` : ''}</p>
  <ol class="sumario">${indice}</ol>
</section>
<section class="cuaderno">
  ${fichas}
</section>`,
  });
}

// ------------------------------------------------------------------- cartas

// A 1000 cartas, meterlas todas en una página da 1 MB de HTML. Cada hilo
// tiene su propia página y /cartas pasa a ser un índice de conversaciones:
// el índice crece una fila por hilo, no una por carta.
const HILOS_POR_PAGINA = 120;

/** Los hilos en el orden en que se presentan: vivos arriba, y a igualdad el
 *  que se movió hace menos. `ultimo_registro` es la cronología (ver README). */
export function hilosOrdenados(d) {
  const vivo = (h) => (h.meta?.datos?.estado === 'abierto' ? 0 : 1);
  const movido = (h) => h.meta?.datos?.ultimo_registro ?? 0;
  return [...d.hilos].sort((a, b) => vivo(a) - vivo(b) || movido(b) - movido(a));
}

/** Las páginas del índice. Siempre hay al menos una. */
export function paginasIndice(d) {
  const todos = hilosOrdenados(d);
  const trozos = [];
  for (let i = 0; i < todos.length; i += HILOS_POR_PAGINA) {
    trozos.push(todos.slice(i, i + HILOS_POR_PAGINA));
  }
  return trozos.length ? trozos : [[]];
}

export const rutaHilo = (slug) => `${BASE}/cartas/${slug}`;
export const rutaIndice = (n) => (n === 0 ? `${BASE}/cartas` : `${BASE}/cartas/pagina-${n + 1}`);

const conQuien = (d, meta) => (meta.participantes ?? [])
  .filter((s) => s !== 'sora-winterbourne').map(d.nombreDe);

/** Una carta lacrada. Se usa igual en la página del hilo y en cualquier otra. */
function tarjetaCarta(d, c, { abierta, ultima }) {
  const x = c.datos;
  const deSora = (x.de ?? []).includes('sora-winterbourne');
  const de = (x.de ?? []).map(d.nombreDe).join(' y ');
  const para = (x.para ?? []).map(d.nombreDe).join(' y ');
  const adjuntos = x.adjuntos ?? [];
  const inicial = esc(de.trim().charAt(0).toUpperCase());
  // El lacre se parte por la mitad al abrir: dos mitades idénticas, cada una
  // recortada a su lado, que salen despedidas en direcciones opuestas.
  const mitad = (lado) => `<span class="lacre__mitad lacre__mitad--${lado}">`
    + `<span class="lacre__cera">${inicial}</span></span>`;

  return `<article class="carta carta--${deSora ? 'sora' : 'otro'}">
    <details class="sobre"${abierta ? ' open' : ''}>
      <summary>
        <span class="sobre__caja">
          <span class="sobre__pieza">
            <span class="sobre__asoma" aria-hidden="true"></span>
            <span class="sobre__cara">
              <span class="sobre__destino">
                <span class="sobre__rotulo">para</span>
                <strong class="sobre__nombre">${esc(para)}</strong>
                ${definido(x.hacia) ? `<span class="sobre__lugar">${esc(x.hacia)}</span>` : ''}
              </span>
              <span class="sobre__franqueo" aria-hidden="true">✦</span>
              <span class="sobre__remite">de ${esc(de)}${
                definido(x.desde) ? `<span class="sobre__lugar">${esc(x.desde)}</span>` : ''}</span>
            </span>
            <span class="sobre__solapa" aria-hidden="true"><span class="sobre__solapa-cara"></span></span>
            <span class="lacre" aria-hidden="true">${mitad('i')}${mitad('d')}</span>
          </span>
        </span>
        <span class="sobre__pie">
          <span class="abrir"><span class="abrir__cerrado">Romper el lacre</span
            ><span class="abrir__abierto">Cerrar el sobre</span></span>
          ${ultima ? '<span class="reciente">la última del hilo</span>' : ''}
          ${adjuntos.length ? `<span class="con-adjunto">Lleva ${
            adjuntos.length === 1 ? 'un adjunto' : `${adjuntos.length} adjuntos`}</span>` : ''}
        </span>
      </summary>
      <div class="papel">
        ${definido(x.asunto) ? `<p class="papel__asunto">${esc(x.asunto)}</p>` : ''}
        ${md(c.cuerpo)}
        ${adjuntos.map((a) => `<p class="adjunto">Adjunto: ${esc(a)}</p>`).join('')}</div>
    </details>
  </article>`;
}

/** Las cartas de un hilo, la más reciente arriba. */
function cartasDelHilo(d, h) {
  const abierto = h.meta?.datos?.estado === 'abierto';
  const clave = (c) => c.datos.registro ?? c.datos.orden ?? 0;
  const recientes = [...h.cartas].sort((a, b) => clave(b) - clave(a));
  return recientes.map((c, i) => tarjetaCarta(d, c, {
    abierta: abierto, ultima: i === 0 && recientes.length > 1,
  })).join('');
}

// ---------------------------------------------------- índice de conversaciones

export function cartasIndice(d, pagina, total) {
  const hilos = paginasIndice(d)[pagina] ?? [];
  const nAbiertos = d.hilos.filter((h) => h.meta?.datos?.estado === 'abierto').length;

  const filas = hilos.map((h) => {
    const meta = h.meta?.datos ?? {};
    const abierto = meta.estado === 'abierto';
    const otros = conQuien(d, meta);
    const n = h.cartas.length;
    return `<li class="fila-hilo" id="${esc(meta.slug ?? '')}"
      data-estado="${abierto ? 'abierto' : 'cerrado'}"
      data-busca="${esc([meta.titulo, meta.asunto, ...otros].filter(Boolean).join(' ').toLowerCase())}">
      <a href="${rutaHilo(meta.slug)}">
        <span class="lacre--mini" aria-hidden="true">${esc((otros[0] ?? '?').charAt(0).toUpperCase())}</span>
        <span class="fila-texto">
          <strong>${esc(meta.titulo ?? meta.slug)}</strong>
          <span class="con">${otros.length ? `con ${esc(otros.join(' y '))} · ` : ''}${
            n} ${n === 1 ? 'carta' : 'cartas'}</span>
        </span>
        ${abierto ? '<span class="marca-abierto">espera respuesta</span>' : ''}
      </a>
    </li>`;
  }).join('');

  const paso = (n, texto) => n >= 0 && n < total
    ? `<a href="${rutaIndice(n)}">${texto}</a>` : '';
  const paginador = total > 1 ? `<nav class="paginas" aria-label="Páginas del índice">
    ${paso(pagina - 1, '← Anteriores')}
    <span>Página ${pagina + 1} de ${total}</span>
    ${paso(pagina + 1, 'Siguientes →')}
  </nav>` : '';

  return plantilla({
    id: 'cartas', titulo: `Cartas · Sora Winterbourne${pagina ? ` (${pagina + 1})` : ''}`,
    descripcion: 'La correspondencia de Sora, por hilos.',
    contenido: `
<section>
  <h1>${d.hilos.length} ${d.hilos.length === 1 ? 'conversación' : 'conversaciones'}</h1>
  <p class="plomo">Las de Sora van a la derecha; las respuestas, a la izquierda.
  Los hilos que esperan respuesta van arriba. Aurora las trae.</p>
  <div class="buscador">
    <label for="buscar-hilo">Buscar</label>
    <input id="buscar-hilo" type="search" autocomplete="off"
      placeholder="título, asunto o con quién" data-indice="${BASE}/cartas/indice.json">
  </div>
  <div class="filtros" role="group" aria-label="Estado">
    <span class="filtros__rotulo">Estado</span>
    <span class="filtros__opciones">
      <button class="filtro" type="button" aria-pressed="false"
        data-campo="estado" data-valor="abierto">esperan respuesta<span class="cuenta">${
          nAbiertos}</span></button>
      <button class="filtro" type="button" aria-pressed="false"
        data-campo="estado" data-valor="cerrado">cerradas<span class="cuenta">${
          d.hilos.length - nAbiertos}</span></button>
    </span>
  </div>
  <ul class="hilos">${filas}</ul>
  <p id="sin-resultados" hidden>Ningún hilo cumple ese filtro.</p>
  ${paginador}
</section>`,
  });
}

// ------------------------------------------------------- la página de un hilo

export function cartasHilo(d, h, vecinos) {
  const meta = h.meta?.datos ?? {};
  const abierto = meta.estado === 'abierto';
  const otros = conQuien(d, meta);
  const n = h.cartas.length;
  const salto = (v, texto) => v
    ? `<a href="${rutaHilo(v.meta?.datos?.slug)}">${texto} ${esc(v.meta?.datos?.titulo ?? '')}</a>`
    : '';

  return plantilla({
    id: 'cartas',
    rotulo: meta.titulo ?? meta.slug,
    titulo: `${meta.titulo ?? meta.slug} · Cartas de Sora Winterbourne`,
    descripcion: `${n} ${n === 1 ? 'carta' : 'cartas'}${
      otros.length ? ` entre Sora y ${otros.join(' y ')}` : ''}.`,
    entrada: `${esc(meta.asunto ?? '')}${abierto ? ' · sin respuesta todavía' : ''}`,
    volver: { href: `${BASE}/cartas`, texto: 'Todas las cartas' },
    contenido: `
<section>
  <h2>${n} ${n === 1 ? 'carta' : 'cartas'}${otros.length ? ` con ${esc(otros.join(' y '))}` : ''}</h2>
  <p class="plomo">La más reciente arriba. Llegan lacradas: ábrelas para leerlas.</p>
  ${cartasDelHilo(d, h)}
</section>
<nav class="vecinos" aria-label="Otras conversaciones">
  ${salto(vecinos.anterior, '←')}
  ${salto(vecinos.siguiente, '→')}
</nav>`,
  });
}

/** Índice de búsqueda: lo carga el buscador para poder buscar en todas las
 *  páginas del índice y no solo en la que se está viendo. */
export function indiceJson(d) {
  return JSON.stringify(hilosOrdenados(d).map((h) => {
    const meta = h.meta?.datos ?? {};
    const otros = conQuien(d, meta);
    return {
      slug: meta.slug, titulo: meta.titulo ?? meta.slug, asunto: meta.asunto ?? '',
      con: otros, cartas: h.cartas.length,
      estado: meta.estado ?? 'cerrado', url: rutaHilo(meta.slug),
    };
  }));
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
  <h1>Su familia</h1>
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
  const foto = (g) => {
    const x = g.datos;
    return `<figure>
      <button type="button" data-grande="${BASE}/img/${esc(x.archivo)}"
        data-alt="${esc(x.descripcion)}">
        <img src="${BASE}/img/${esc(x.archivo)}" alt="${esc(x.titulo)}"
          width="${x.ancho}" height="${x.alto}" loading="lazy">
      </button>
      <figcaption>${esc(x.titulo.toLowerCase())}</figcaption>
    </figure>`;
  };

  // La del personaje primero: es la referencia principal y las de accesorio
  // solo se mandan cuando ese accesorio sale.
  const de = (clase) => d.galeria.filter((g) => (g.datos.clase ?? 'captura') === clase);
  // La del personaje primero: es la referencia principal y las de accesorio
  // solo se mandan cuando ese accesorio sale.
  const hojas = de('hoja-referencia')
    .sort((a, b) => (a.datos.referencia_de === 'personaje' ? 0 : 1)
                  - (b.datos.referencia_de === 'personaje' ? 0 : 1));
  const ilustraciones = de('ilustracion')
    .sort((a, b) => (a.datos.retrato_principal ? 0 : 1) - (b.datos.retrato_principal ? 0 : 1));
  const capturas = de('captura');

  return plantilla({
    id: 'galeria', titulo: 'Galería · Sora Winterbourne',
    descripcion: 'Retratos, hojas de referencia y capturas de Sora en el juego.',
    contenido: `
${ilustraciones.length ? `<section>
  <h1>${ilustraciones.length === 1 ? 'Retrato' : `${ilustraciones.length} retratos`}</h1>
  <p class="plomo">Ilustrado a partir de las hojas de referencia, con la luz
  montada sobre los dos colores de sus ojos.</p>
  <div class="galeria">${ilustraciones.map(foto).join('')}</div>
</section>` : ''}
${hojas.length ? `<section>
  <${ilustraciones.length ? 'h2' : 'h1'}>${hojas.length} ${
    hojas.length === 1 ? 'hoja de referencia' : 'hojas de referencia'}</${
    ilustraciones.length ? 'h2' : 'h1'}>
  <p class="plomo">Hechas a propósito para que un generador de imágenes mantenga
  al personaje y sus accesorios reconocibles. La del personaje es la única
  imagen donde se ve la heterocromía.</p>
  <div class="galeria">${hojas.map(foto).join('')}</div>
</section>` : ''}
<section>
  <${hojas.length || ilustraciones.length ? 'h2' : 'h1'}>${capturas.length} ${
    capturas.length === 1 ? 'captura' : 'capturas'} del juego</${
    hojas.length || ilustraciones.length ? 'h2' : 'h1'}>
  <p class="plomo">Tomadas dentro del juego, tal como se ven en pantalla.</p>
  <div class="galeria">${capturas.map(foto).join('')}</div>
</section>
<dialog class="visor">
  <img alt="">
  <p></p>
  <button class="cerrar" type="button">Cerrar</button>
</dialog>`,
  });
}
