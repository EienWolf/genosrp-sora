---
name: carta
description: Añade una carta enviada o recibida por Sora a content/cartas/, detectando a qué hilo pertenece y registrando a los remitentes desconocidos en conocidos.yml. Úsala cuando pidan agregar, importar o registrar cartas del rol.
allowed-tools: Bash(python3 scripts/add-carta.py:*), Read, Edit
---

# Añadir una carta

Las cartas viven en `content/cartas/<hilo>/`, una carpeta por hilo y un archivo
numerado por carta. El número del archivo **es** el orden de la conversación,
así que no puede desincronizarse.

Además, cada carta recibe un `registro`: un contador **global** a todos los
hilos que refleja el orden en que se dieron de alta, que es el orden en que se
enviaron. Como las cartas no llevan fecha, ese número es la única cronología
que existe, y con él el sitio pone arriba los hilos que se han movido hace
menos. Lo asigna el script solo.

**Da las cartas de alta en el orden en que se enviaron.** Si el usuario te pasa
varias de golpe, respeta ese orden aunque pertenezcan a hilos distintos: si las
agrupas por hilo, el `registro` deja de decir la verdad. Si no sabes el orden,
pregúntalo.

No crees los archivos a mano: usa `scripts/add-carta.py`. El cuerpo de la carta
va por stdin, con un heredoc.

## 1. Decidir el hilo — hazlo siempre primero

```bash
python3 scripts/add-carta.py --listar
```

Muestra cada hilo con sus cartas en orden y quién escribe a quién. Con eso
decide:

- **Pertenece a un hilo existente** si responde a una carta anterior, sigue la
  misma gestión o retoma un asunto abierto con la misma persona. Añádela con
  `--hilo <slug>`; se numera sola a continuación.
- **Es un hilo nuevo** si abre un asunto distinto, aunque sea con alguien con
  quien Sora ya se escribe. Usa `--nuevo-hilo <slug> --titulo "…"`.

Ante la duda, **pregunta**. Enseña los hilos candidatos y deja que el usuario
elija; es más barato que separar hilos mal fusionados después.

El slug del hilo describe el asunto, no a la persona: `club-de-quidditch`,
`llegada-a-hogwarts`. Marca `--estado cerrado` cuando la conversación se haya
agotado; sin el flag el hilo conserva el estado que ya tuviera, y uno nuevo
nace `abierto`.

`--titulo` y `--asunto` describen la carta y estrenan el hilo cuando se crea.
Un hilo que ya existe conserva los suyos: si quieres cambiarle el título o el
asunto, edita su `hilo.md`.

## 2. Añadir la carta

```bash
python3 scripts/add-carta.py --hilo club-de-quidditch \
  --de sora-winterbourne --para lilwenn-pliego <<'EOF'
(cuerpo de la carta, en Markdown, tal cual lo escribió el usuario)
EOF
```

- `--de` y `--para` aceptan varios slugs separados por coma (la carta de los
  tutores va firmada por los dos).
- `--fecha` solo si se conoce la fecha in-game. **No la inventes**: sin dato,
  queda `null`.
- `--desde` y `--hacia` son los lugares que van escritos en el sobre («Dorset»,
  «Hogwarts»). Misma regla que la fecha: **no se deducen**. Si la carta no dice
  desde dónde se escribe, quedan en `null` y el sobre sale sin lugar.
- `--adjunto "…"` para objetos que acompañan la carta (una chapa, un paquete).
- `--emote "…"` para las líneas `/do` del mensaje.

Respeta el texto del usuario literalmente: es contenido narrativo suyo. Ajusta
solo el ancho de línea.

## 3. Detectar personas nuevas

Cualquier remitente o destinatario que no esté ya en `content/personajes/` ni
en `content/conocidos.yml` es, casi seguro, **el personaje de otro jugador**.
Regístralo:

```bash
python3 scripts/add-carta.py --conocido lilwenn-pliego --nombre "Lilwenn Pliego" \
  --relacion "Contacto de Sora en el club de Quidditch" \
  --cargo "Capitana de Quidditch" --casa "Gryffindor" \
  --info "Convoca las pruebas de acceso" --info "Trato directo y seco"
```

`--cargo` y `--casa` son opcionales y quedan como `"?"` si se omiten. **No
deduzcas ninguno de los dos a partir del tono de la carta**: que alguien
gestione un club no dice qué cargo ocupa ni en qué casa está. Pregunta al
usuario, y si tampoco lo sabe, déjalo en `"?"`.

En `--info` van solo hechos que la carta sostenga: lo que la persona hace, lo
que pide, cómo trata a Sora, qué quedó pendiente con ella.

Si alguien gana peso en la historia, promuévelo a
`content/personajes/<slug>.md` con ficha completa y quítalo de `conocidos.yml`.

## 4. Preguntar cuando no estés seguro

Antes de escribir, pregunta si dudas de: a qué hilo pertenece, la fecha, el
cargo o la casa de alguien nuevo, o si dos nombres parecidos son la misma
persona. Es preferible una pregunta a un dato inventado: el contenido es el
registro de una partida real y un error se propaga a todo lo que lo referencia.
