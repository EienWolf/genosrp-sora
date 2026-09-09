# Contenido

Fuente única de verdad del sitio. Aquí se edita la información; el sitio se
genera a partir de estos archivos. **No** se edita el HTML a mano.

Cada archivo es Markdown con frontmatter YAML:

- **Frontmatter** = datos estructurados (lo que el sitio filtra, ordena, enlaza
  o muestra como ficha/tarjeta).
- **Cuerpo** = prosa (historia, descripciones largas, texto narrativo).

La regla para decidir dónde va algo: si algún día querrás *listar, filtrar o
enlazar* por ese dato, va al frontmatter. Si solo se lee, va al cuerpo.

## Estructura

```
content/
├── personajes/     # fichas de personajes (PJ y NPC)
├── criaturas/      # mascotas y familiares — p. ej. Aurora
├── hechizos/       # hechizos aprendidos (generados, no editar a mano)
├── cartas/         # correspondencia, una carpeta por hilo (generado)
├── historias/      # cronología: resúmenes de curso e historias sueltas
├── galeria/        # capturas del juego + su ficha (generado)
├── lugares/        # localizaciones
└── conocidos.yml   # personas sin ficha propia (generado)
```

Un archivo por entidad. El nombre del archivo es el `slug` (minúsculas, sin
tildes, guiones en vez de espacios): `sora-winterbourne.md`.

## Enlaces entre fichas

Las referencias cruzadas se hacen **por `slug`**, nunca copiando el texto:

```yaml
vinculos:
  - slug: ethan-winterbourne
    relacion: Tutor legal
```

Así, cuando cambie la ficha de Ethan, todo lo que la referencia queda al día
solo. Un `slug` puede apuntar a un archivo que aún no existe: eso marca lo que
falta por migrar, no es un error.

## Campos por tipo

### `tipo: personaje`

| Campo | Obligatorio | Notas |
| ----- | ----------- | ----- |
| `slug` | sí | Igual al nombre del archivo |
| `rol` | sí | `protagonista`, `tutor`, `npc`… |
| `nombre`, `apellido` | sí | |
| `nacionalidad` | | |
| `nacimiento` | | `AAAA-MM-DD` |
| `lema` | | Una frase suya. Abre la portada |
| `hitos` | | Cronología anterior a Hogwarts. Ver abajo |
| `casa` | | Solo si estudia en Hogwarts |
| `estatus_social` | | |
| `fisico` | | `estatura`, `complexion`, `cabello`, `ojos` |
| `miedos`, `aspiraciones` | | Lista de `{titulo, descripcion}` |
| `parentesco`, `vinculos` | | Lista de `{slug, relacion}` |
| `gustos` | | Lista de textos |

Secciones esperadas en el cuerpo: `## Descripción física`,
`## Personalidad`, `## Historia`.

#### `hitos`

La página de historia abre con la cronología anterior a Hogwarts. La prosa
sigue siendo la fuente y se queda entera en `## Historia`; `hitos` es el
extracto por el que se navega, no una copia que haya que mantener a la par.

```yaml
hitos:
  - edad: "3–4 años"
    titulo: "El bote"
    texto: "Resbaló y cayó por la borda…"
  - edad: "4 – 7 años"
    hueco: true            # los años que no recuerda
    texto: "Aquí el cielo se apaga…"
```

`hueco: true` marca el vacío de memoria y lo pinta en rojo. Es lo **único**
del sitio que lleva ese color; el resto de hitos alternan oro y azul solos.

#### Guía de interpretación

Para los personajes que existen sobre todo como **referencia de cómo actúan
con Sora** (tutores, terapeuta, futuros NPC), en vez de una biografía se
rellena este bloque. Van juntos en el mismo archivo: si más adelante aparece
información biográfica de ese personaje, se añade al mismo sitio.

| Campo | Notas |
| ----- | ----- |
| `relacion_con_sora` | `Padre / Tutor legal`, `Psicóloga`… |
| `ocupacion` | |
| `apodos_hacia_sora` | Lista de textos; `[]` si no usa apodos |
| `manierismos` | Lista de textos: gestos y tics físicos |
| `habla.estilo` | Una frase describiendo el registro |
| `habla.frases` | Frases de ejemplo, textuales |

En el cuerpo: `## Trato hacia Sora`.

Estos campos son los que hacen que el material sirva de verdad para jugar:
son consultables, así que el sitio puede mostrarlos como chuleta rápida.

### `tipo: criatura`

| Campo | Notas |
| ----- | ----- |
| `slug`, `nombre`, `especie` | |
| `edad` | Número, en años |
| `propietario` | `slug` del personaje |
| `rescatada_por` | `slug`, opcional |
| `tamano` | `descripcion` + `altura_cm` |
| `plumaje` / `pelaje` | `colores` (lista) + `detalle` |
| `caracteristicas` | Lista de adjetivos sueltos |

En el cuerpo: `## Descripción física`, `## Historia`, `## Comportamiento`.

### `tipo: hechizo`

**No se editan a mano.** Se generan con la skill `hechizo`, que los importa de
`hechizos.db` (proyecto `discord-hechizos`):

```bash
python3 scripts/add-hechizo.py "wingardium leviosa"
```

| Campo | Origen en la base | Notas |
| ----- | ----------------- | ----- |
| `nombre`, `nombre_alt` | `nombre`, `nombre_alt` | |
| `pronunciacion` | `conjuro` | Solo 92 de 142 la tienen |
| `anio` | `anio` | 1–8 |
| `clase` | `asignatura` | `encantamientos`, `dcao-hechizos`… |
| `categorias` | tabla `categorias` | Lista normalizada |
| `clasificacion` | `tipo` | encantamiento, embrujo, maleficio… |
| `efecto` | `efecto` | Solo 21 de 142. Si la base calla, se escribe a mano |
| `manifestacion`, `duracion`, `movimiento` | íd. | |
| `contrahechizo` | `contrahechizo` | Solo 24 de 142. Vacío = no tiene |
| `relacionados` | tabla `referencias` | Slugs de otros hechizos |
| `teoria` | tabla `teoria_refs` | Asignaturas de teoría que lo citan |
| `resumen` | — | **Local.** Para qué sirve, en una frase (≤ 92 car.) |
| `voz` | — | **Local.** Cómo lo cuenta él, entrecomillado en la tarjeta (≤ 68 car.) |
| `aprendido` | — | **Local.** `false` si Sora aún no lo domina. **No se publica** |
| `bloqueado` | — | **Local.** Ver abajo |
| `personalizable` | — | **Local.** La ilusión/efecto varía según el mago |

Genera en el cuerpo `## Descripción` y `## Apuntes de clase`. Cualquier otra
sección que añadas —`## Manifestación de Sora`, `## Notas`…— se conserva.

#### Campos que se pueden completar a mano

La base llega incompleta en varios escalares: `efecto` falta en 121 de 142,
`contrahechizo` en 118 y `pronunciacion` en 50. Esos huecos se rellenan en la
ficha y **el script los respeta**: si la base viene vacía en uno de estos ocho
campos —`nombre_alt`, `pronunciacion`, `clasificacion`, `efecto`,
`manifestacion`, `duracion`, `movimiento`, `contrahechizo`— gana lo que ya
hubiera escrito; si la base sí trae el dato, manda la base.

Es lo que evita tener que bloquear una ficha entera solo por completar un
campo, que además congelaría las correcciones que la base haga en el resto.

Un `contrahechizo` vacío **no es un hueco pendiente**: son hechizos que no lo
tienen. Están revisados uno a uno.

Un hechizo con `aprendido: false` se queda fuera del sitio entero —páginas,
`llms.txt` y `content.json`— hasta que Sora lo domine. Darlo de alta antes
sirve para tener la ficha lista y anotada; publicarlo, no: la web solo enseña
lo que sabe hacer.

`resumen` y `voz` son los que hacen que la lista de hechizos se lea: sin
ellos la tarjeta enseña el nombre y poco más. No vienen de la base, así que
los escribes tú —a partir de lo que ya dice la ficha, sin inventar datos— y
`add-hechizo.py` los conserva al sincronizar como cualquier campo propio.

#### Cuánto cabe en la tarjeta

La tarjeta cerrada tiene alto fijo para que la rejilla no quede escalonada, y
ese alto es un presupuesto de líneas: 2 de nombre, 2 de materia · curso ·
pronunciación, 4 de resumen y 3 de la nota de Sora. En una sola columna el
resumen y la nota bajan a 2, que es lo que ocupan a ese ancho.

Los topes están medidos con las fuentes reales sobre la columna más estrecha
que produce la rejilla (15rem), probando varios textos y quedándose con el
peor corte de palabra:

| Campo | Líneas | Tope seguro |
| ----- | ------ | ----------- |
| `nombre` | 2 | 31 car. |
| materia · curso · `pronunciacion` | 2 | 53 car. |
| `resumen` | 4 | 92 car. |
| `voz` | 3 | 68 car. |

Por debajo de esos números siempre entra. Por encima **puede** entrar —
depende de dónde caigan los espacios— y si no entra, el CSS lo recorta con
puntos suspensivos en vez de romper la rejilla. Cuatro fichas pasan hoy del
tope de `voz` (`red-spark`, `gladismuto`, `verdimillious`, `riddikulus`) y se
han comprobado una a una: caben. Si tocas su texto, vuelve a mirarlas.

#### `bloqueado`

El script regenera **solo lo que él genera**; los campos y secciones propios
sobreviven a la sincronización sin necesidad de bloquear nada.

- `false` → se regenera desde la base conservando lo tuyo. Es lo normal.
- `true` → intocable. Solo para cuando corrijas un dato *que viene de la base*,
  que es lo único que la sincronización pisaría.

### `tipo: cuaderno` y `tipo: apunte`

**No se editan a mano.** Se crean con la skill `apunte`:

```bash
python3 scripts/add-apunte.py --listar
python3 scripts/add-apunte.py --cuaderno pociones --titulo "…" --tema pocion < texto.md
```

Un cuaderno es una carpeta; cada apunte, un archivo numerado dentro:

```
content/apuntes/pociones/
├── cuaderno.md                # titulo, materia, estado
├── 01-la-mesa.md
└── 02-el-equipo.md
```

A diferencia de los hechizos, aquí **la teoría de la asignatura es la fuente y
la redacción es de Sora**. Los hechos —cantidades, tiempos, colores— se copian
exactos; el texto lo escribe él. Tres campos llevan esa distinción:

| campo | qué dice |
| --- | --- |
| `via` | `clase`, `lectura` o `casa`: cómo llegó a ese conocimiento |
| `elaborado` | si lo ha preparado con sus manos, no solo estudiado |
| `oculto` | `true` = se guarda pero **no se publica** |

El aparte en cita (`> **Nota mía.**`) es lo único que Sora añade de su cosecha.

`oculto` es a los apuntes lo que `aprendido: false` a los hechizos: el archivo
se queda entero en `content/` —con sus notas, sus avisos y su redacción— y
desaparece del sitio, de `llms.txt` y de `content.json` hasta que se le quite.
Las recetas del cuaderno de pociones están así: fuera queda la teoría básica,
que es lo único que se publica. Se crea ya oculto con `--oculto`, y
`--listar` marca cuáles lo están.

En el cuerpo, los enlaces van por slug y el sitio resuelve la ruta:
`hechizo:celera`, `apunte:pocima-para-dormir`, `pagina:magia`.

### `tipo: carta` y `tipo: hilo-cartas`

**No se editan a mano.** Se generan con la skill `carta`:

```bash
python3 scripts/add-carta.py --listar
python3 scripts/add-carta.py --hilo club-de-quidditch \
    --de sora-winterbourne --para lilwenn-pliego \
    --desde "Hogwarts" --hacia "Dorset" < carta.txt
```

Un hilo es una carpeta; cada carta, un archivo numerado dentro:

```
content/cartas/club-de-quidditch/
├── hilo.md                    # titulo, asunto, participantes, estado
├── 01-sora-winterbourne.md
├── 02-lilwenn-pliego.md
└── 03-sora-winterbourne.md
```

El orden de la conversación vive en el nombre del archivo, no en un campo del
frontmatter: así no puede desincronizarse ni hay que renumerar al añadir.

**Las cartas no llevan fecha, pero sí cronología.** Se dan de alta en el orden
en que se enviaron, y el script les pone un contador global:

| campo | dónde | qué es |
| --- | --- | --- |
| `orden` | carta | su posición dentro del hilo (1, 2, 3…) |
| `registro` | carta | número de alta **global**, común a todos los hilos |
| `ultimo_registro` | `hilo.md` | el `registro` más alto del hilo: cuándo se movió |

`registro` es la única cronología fiable que hay mientras no haya fechas. Con
él el sitio ordena los hilos por actividad y no solo alfabéticamente. Lo asigna
`add-carta.py`; no se escribe a mano ni se reutiliza aunque se borre una carta.

| Campo de la carta | Notas |
| ----------------- | ----- |
| `hilo`, `orden` | Derivados de la ruta |
| `de`, `para` | Listas de slugs (una carta puede ir firmada por dos) |
| `fecha` | `null` si no se conoce. **No se infiere** |
| `desde`, `hacia` | Lugares que van escritos en el sobre. `null` si no se saben |
| `asunto` | |
| `adjuntos` | Objetos que acompañan la carta |
| `emotes` | Líneas `/do` del mensaje |

`desde` y `hacia` siguen la misma regla que `fecha`: **no se deducen**. Si la
carta no dice desde dónde se escribe, quedan en `null` y el sobre no lleva
lugar. De las siete que hay, solo dos lo dicen.

El `estado` del hilo es `abierto` si alguien quedó en responder, `cerrado` si
la conversación se agotó.

### `tipo: resumen-curso` y `tipo: historia`

La ficha de Sora (`## Historia`) cubre **hasta su llegada a Hogwarts**. Todo lo
posterior vive aquí, y ese es el corte: si un suceso ocurre ya en el castillo,
no se añade a la ficha.

```
content/historias/
├── cursos/01-primer-curso.md        # un resumen por año, al cerrarlo
└── complementarias/<slug>.md        # sucesos que merecen relato propio
```

La página de historia va **al revés, como las cartas**: lo último arriba. Los
cursos son hitos numerados y las historias complementarias, estrellas; cada
historia cuelga del curso en el que ocurre.

**Resumen de curso** (`cursos/NN-<slug>.md`): lo relevante del año, escrito al
terminarlo. El número del archivo da el orden, como en las cartas.

En la cronología el curso se abre con la `sinopsis`, los hechizos que aprendió
ese año y los clubes; el `## Resumen` entero queda debajo, en «La versión
larga». Sin `sinopsis` no hay desplegable y el resumen se enseña tal cual: eso
sirve mientras el curso está en marcha y todavía no hay nada que sintetizar.

| Campo | Notas |
| ----- | ----- |
| `curso`, `titulo`, `edad`, `casa` | |
| `estado` | `en-curso` o `cerrado` |
| `sinopsis` | El año en tres o cuatro frases. Es lo que se lee en la cronología |
| `hechizos_aprendidos` | Slugs; deben existir en `hechizos/` |
| `clubes` | `nombre`, `estado`, `contacto` (slug) |
| `complementarias` | Slugs de las historias de ese curso. Informativo: quien coloca cada historia en la cronología es su propio `curso` |

**Historia complementaria** (`complementarias/<slug>.md`): un suceso concreto
que merece contarse aparte. Solo se crea si la historia lo justifica; lo
ordinario se resume en el curso. Ver `PLANTILLA.md.ejemplo`.

| Campo | Notas |
| ----- | ----- |
| `titulo` | |
| `sinopsis` | El suceso en dos o tres frases. Es lo que se lee en la cronología; el relato entero queda debajo, en «La versión larga». Sin ella se enseña entero y sin desplegable |
| `curso` | **Obligatorio.** Es lo que la sitúa en la cronología |
| `fecha` | `null` si no se conoce. Ordena las historias dentro del curso |
| `personajes`, `lugares` | Slugs |
| `relacionado_con` | Slugs de hechizos, cartas o fichas que toca |

`curso` no es opcional: sin él la historia no sabe dónde ponerse. Si apunta a
un curso que todavía no existe, no se pierde —cae al final de la cronología—,
pero eso es una señal de que falta crear el resumen de ese año.

Sin `fecha` no hay cronología fiable dentro del curso, así que el orden lo da
el nombre del archivo, invertido como el resto de la página.

### `tipo: imagen`

**No se editan a mano.** Se añaden con la skill `galeria`:

```bash
python3 scripts/add-imagen.py ~/captura.png --slug sora-frontal-uniforme
python3 scripts/add-imagen.py --pendientes     # fichas sin describir
python3 scripts/add-imagen.py --referencias    # propone el lote
```

Cada imagen son dos archivos con el mismo nombre: `<slug>.png` y `<slug>.md`.

La ficha cumple dos funciones distintas. Los campos `titulo` y `descripcion`
alimentan la galería del sitio. El resto mide **si la captura sirve como
referencia** para un generador de imágenes:

| Campo | Valores |
| ----- | ------- |
| `angulo` | `frontal`, `tres-cuartos`, `perfil`, `espalda` |
| `plano` | `primer-plano`, `medio`, `cuerpo-entero` |
| `fondo` | `neutro`, `escenario` |
| `iluminacion` | `neutra`, `calida`, `oscura`, `dominante` |
| `rostro_visible`, `ojos_visibles` | Cara despejada; color de ojos legible |
| `ui_visible` | Hay interfaz que recortar antes de enviarla |
| `muestra` | Qué aporta la captura |
| `notas_referencia` | Por qué sirve o por qué no |

`--referencias` puntúa con esos campos y propone un lote **priorizando variedad
de ángulo**, no cantidad: tres capturas de ángulos distintos dan más
consistencia que cinco casi iguales, así que el lote puede salir con menos de
las que pidas.

Hay dos clases de imagen, y se tratan distinto al armar el lote de referencia:

| campo | valores |
| --- | --- |
| `clase` | `captura` (del juego) · `hoja-referencia` (arte hecho para esto) |
| `referencia_de` | `personaje` · `accesorio` · `criatura` · `emblema` |

Una hoja del personaje entra siempre en el lote y no compite por ángulo. Todo
lo que no es del personaje —accesorios, la lechuza, el sello de la familia— se
lista aparte: no sirve para consistencia de cara, y se añade solo si eso tiene
que salir en la imagen.

## Conocidos

`conocidos.yml` recoge a las personas que aparecen en el rol —normalmente
personajes de otros jugadores— que aún no merecen ficha propia. Cada entrada
tiene `nombre`, `relacion`, `cargo`, `casa` e `info`.

`"?"` significa **dato desconocido, pendiente de averiguar**; no es lo mismo
que un campo vacío. El cargo y la casa no se deducen del tono de una carta:
o se saben o son `"?"`.

Cuando alguien gana peso en la historia, se le promueve a
`content/personajes/<slug>.md` y se le quita de aquí.

## Emotes

Cualquier ficha puede llevar un bloque `emotes` con las acciones de rol ya
escritas, listas para copiar en partida:

```yaml
emotes:
  - comando: do
    texto: Aurora desciende en un aleteo ágil y silencioso…
```

`comando` es el prefijo sin la barra (`do`, `me`…). Separar el comando del
texto permite que el sitio muestre el emote con un botón de copiar, y que si
algún día cambia la sintaxis del rol no haya que reescribir el contenido.

## Estado de la migración

Fuentes en NotebookLM («Personaje: Sora») y su destino:

| Fuente | Destino | Estado |
| ------ | ------- | ------ |
| Sora Winterbourne | `personajes/sora-winterbourne.md` | ✅ migrada |
| Ethan Winterbourne | `personajes/ethan-winterbourne.md` | ✅ migrada (guía) |
| Lyra Winterbourne | `personajes/lyra-winterbourne.md` | ✅ migrada (guía) |
| Dra. Beatrice Vance | `personajes/beatrice-vance.md` | ✅ migrada (guía) |
| Lechuza: Aurora | `criaturas/aurora.md` | ✅ migrada |
| Hechizos aprendidos | `hechizos/` | ✅ migrados (5, skill `hechizo`) |
| Astrolium | `hechizos/astrolium.md` | ✅ migrado (hechizo, no lugar) |
| Cartas | `cartas/` | ✅ migradas (3 hilos, 7 cartas) |
| Diario | `diario/` | ⊘ vacío en origen, descartado |
| Conversaciones de Gemini (6) | — | ⊘ descartadas |

La sección «Vínculos» de `sora-winterbourne.md` se mantiene: describe la
relación **desde la perspectiva de Sora**, que es contenido suyo, y no se
solapa con las guías de interpretación de las fichas de Ethan, Lyra y
Beatrice. Si prefieres repartir esos párrafos, se hace en cualquier momento.
