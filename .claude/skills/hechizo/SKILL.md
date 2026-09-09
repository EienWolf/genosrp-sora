---
name: hechizo
description: Añade o actualiza un hechizo en content/hechizos/, importándolo desde la base del proyecto discord-hechizos. Úsala cuando pidan agregar, importar, actualizar o buscar un hechizo del rol.
allowed-tools: Bash(python3 scripts/add-hechizo.py:*), Read, Edit
---

# Añadir un hechizo aprendido

La fuente de verdad de los hechizos es `hechizos.db`, del proyecto
`discord-hechizos` (142 hechizos volcados de los canales del servidor). Este
proyecto guarda **solo los hechizos relevantes para Sora**, como fichas Markdown
en `content/hechizos/`. `aprendido: false` marca los que aún no domina pero ya
tienen contenido propio (Astrolium, por ejemplo).

No escribas la ficha a mano: el script la genera y garantiza que el formato,
los slugs y las referencias cruzadas sean consistentes.

## Uso

```bash
python3 scripts/add-hechizo.py "wingardium leviosa"   # añadir o actualizar
python3 scripts/add-hechizo.py --buscar lumos         # buscar sin escribir
python3 scripts/add-hechizo.py NOMBRE --dry-run       # previsualizar
python3 scripts/add-hechizo.py NOMBRE --force         # actualizar aun bloqueado
```

Si el nombre es ambiguo el script lista las coincidencias y no escribe nada;
concreta el nombre y repite. Si no aparece, usa `--buscar` con una palabra
suelta antes de darlo por inexistente.

## Qué se conserva al actualizar

El script regenera **solo los campos que él genera**. Todo lo demás se
conserva íntegro: campos propios del frontmatter (`emotes`, `personalizable`,
lo que añadas) y secciones del cuerpo que no sean `## Descripción` ni
`## Apuntes de clase`.

Por eso **no hace falta bloquear** una ficha para añadirle contenido propio.
`bloqueado: true` es solo para cuando corrijas un dato *que viene de la base*
—una duración mal transcrita, un movimiento incompleto—, porque eso sí lo
pisaría la siguiente sincronización.

- `bloqueado: false` → se regenera desde la base conservando lo tuyo. Normal.
- `bloqueado: true` → no se toca en absoluto. Solo para correcciones.

`aprendido` (true/false) también se conserva; nunca lo pises al re-importar.

## Los dos campos que el script no puede traer

La base da la ficha técnica, pero no da lo que hace legible la lista de
hechizos del sitio. Después de importar, rellena a mano:

```yaml
resumen: >-
  Para correr mucho más rápido, dejando una estela detrás.
voz: >-
  Me hizo sentir que volaba sin escoba por unos segundos.
```

- **`resumen`** — para qué sirve, en una frase corta (**≤ 92 caracteres**).
  Sale en la tarjeta cerrada, debajo del nombre.
- **`voz`** — cómo lo cuenta Sora, entrecomillado (**≤ 68 caracteres**). Se
  escribe **a partir de lo que ya dice la ficha**: nada de sucesos nuevos ni
  de datos que no estén. Si el hechizo aparece en una carta suya, cita esa
  frase tal cual.

Los dos topes no son estéticos: la tarjeta cerrada tiene alto fijo y lo que
se pase se recorta con puntos suspensivos. Están medidos sobre la columna más
estrecha de la rejilla; el detalle está en `content/README.md`.

Los dos van sueltos en el frontmatter, junto a `aprendido`, y sobreviven a la
sincronización como cualquier campo propio. **No les pongas un comentario
encima**: el comentario cuelga de la clave anterior, que sí es generada, y
`add-hechizo.py` lo descarta en la siguiente pasada.

Sin `resumen` la tarjeta enseña el nombre, la materia y poco más.

## Lo que el script normaliza

Los campos cortos vienen de mensajes de Discord y arrastran su marcado: 33 de
los 142 traen `**` pegado en el conjuro, la manifestación o el movimiento, y
siete pronunciaciones vienen entrecomilladas. El script los limpia al escribir
el frontmatter. **El cuerpo en Markdown no se toca**: allí los `**` sí son
negrita de verdad.

Importar dos veces seguidas no cambia nada. Si al reimportar aparece un diff
inesperado, es un fallo del script, no del contenido.

## Si aparece una materia nueva

Las asignaturas llegan como slugs sin acentos (`dcao-hechizos`,
`pociones-teoria`). Sus nombres legibles viven en `MATERIAS`, en
`scripts/paginas.mjs`. Una materia que no esté ahí no rompe la página —se
muestra el slug con los guiones quitados— pero se ve peor: si la base añade
una, dale su nombre en ese mapa.

## Después de importar

1. Enseña al usuario la ficha generada y qué campos quedaron vacíos: la base
   está incompleta en `efecto` (21/142), `contrahechizo` (24/142) y
   `pronunciacion` (92/142). No los inventes: pregúntale, o dedúcelos de lo
   que la propia ficha ya dice —el `efecto` suele leerse en la manifestación—.
   Lo que escribas ahí **sobrevive a la sincronización** aunque sean campos
   generados: mientras la base siga vacía en ese campo, gana el tuyo. No hace
   falta bloquear la ficha para completarlos.

   Un `contrahechizo` vacío ya está revisado: esos hechizos no tienen. No lo
   vuelvas a listar como pendiente.

   **Avisa siempre, sin que haga falta que te lo pidan, si falta alguno de
   estos tres:**

   | Campo | Qué es | Por qué se pregunta |
   | ----- | ------ | ------------------- |
   | `pronunciacion` | Cómo se dice en voz alta | No se deduce de la grafía: la base solo la trae en 50 de 142. |
   | `clasificacion` | `hechizo`, `encantamiento`, `maldición`… | No se infiere de `clase` ni de `categorias`: son ejes distintos. |
   | `categorias` | `ofensivo`, `luminico`, `creacion`… | Una lista vacía no significa «sin categoría», significa que la base no la trae. |

   Los tres se rellenan a mano y sobreviven a la sincronización como el resto.
   Es lo contrario de `efecto`, que sí se deduce de lo que la propia ficha
   dice, y de un `contrahechizo` vacío, que ya está revisado.

   Dilo al terminar, una línea por campo, junto con la ficha generada. Es el
   caso normal y no la excepción: de los hechizos ya importados, seis no traen
   pronunciación, tres no traen clasificación y cuatro tienen `categorias`
   vacío.

2. Si el usuario aporta contenido nuevo (manifestación propia, emotes,
   notas), añádelo en campos o secciones propias y **deja `bloqueado: false`**:
   se conserva solo. Pon `bloqueado: true` únicamente si corrige un dato que
   viene de la base.

3. **Apúntalo en el curso en el que lo aprendió.** El script escribe la ficha,
   pero no toca la historia: si el hechizo queda con `aprendido: true` y su
   slug no está en `hechizos_aprendidos` del curso correspondiente
   (`content/historias/cursos/*.md`), en la cronología no aparece que Sora lo
   aprendiera ese año. Añade el slug al final de la lista del curso en marcha
   —el que tiene `estado: en-curso`— salvo que el usuario diga otro. Los que
   quedan con `aprendido: false` no se listan: se añadirán el día que los
   domine.

   ```bash
   # Los aprendidos que no están en ningún curso:
   for f in content/hechizos/*.md; do s=$(basename "$f" .md)
     grep -q '^aprendido: true' "$f" &&
       ! grep -q "^  - $s$" content/historias/cursos/*.md && echo "$s"
   done
   ```

## Actualizar todo lo ya importado

```bash
for f in $(grep -L "^bloqueado: true" content/hechizos/*.md); do
  python3 scripts/add-hechizo.py "$(basename "$f" .md | tr '-' ' ')"
done
```

**Recorre solo las desbloqueadas, no `content/hechizos/*.md` entero.** Una
ficha bloqueada se salta al escribir, pero la búsqueda por nombre se hace
antes: `red spark` no existe como tal en la base y cae por aproximación en
«RED SPARK I VERDIMILLIOUS», que se escribe como ficha nueva. El bucle ingenuo
resucita el registro fundido que este proyecto desdobló a propósito. Existe también `--todos`,
que importa los 142 de la base: **no lo uses** salvo que el usuario pida
explícitamente el catálogo completo, porque este proyecto es solo de hechizos
relevantes para Sora.
