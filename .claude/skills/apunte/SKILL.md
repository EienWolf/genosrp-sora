---
name: apunte
description: Añade apuntes de teoría a content/apuntes/, reescribiendo la teoría de una asignatura con la voz de Sora. Úsala cuando pidan agregar teoría, apuntes, o empezar un cuaderno nuevo (pociones, herbología, criaturas…).
allowed-tools: Bash(python3 scripts/add-apunte.py:*), Read, Edit, Grep, Glob
---

# Añadir apuntes de teoría

Los cuadernos viven en `content/apuntes/<cuaderno>/`: una carpeta por cuaderno
y un archivo numerado por apunte. `scripts/add-apunte.py` fija el número, el
slug y el frontmatter; **el texto lo redactas tú**, y esa es la parte que
importa.

Esto **no** es como la skill `hechizo`. Allí el script trae los datos de una
base y tú no escribes nada. Aquí la teoría es la fuente y la redacción es de
Sora.

## Dónde está la teoría

```
~/apps/discord-hechizos/teoria/{pociones,medimagia,dcao,duelo,
                                encantamientos,transfiguracion,hechiceria}.md
~/apps/discord-hechizos/export/    # volcado crudo de los canales
```

Léela entera antes de empezar. Viene de mensajes de Discord: trae marcado
suelto, repeticiones y algún apartado duplicado.

## La regla que no se rompe

**Los hechos son de la teoría. La redacción es de Sora.**

Cantidades, temperaturas, tiempos, colores, nombres y orden de los pasos se
copian **exactos**. No se redondean, no se "mejoran" y no se completan con
conocimiento general de Harry Potter. Si la teoría no trae el método de
elaboración, el apunte lo dice: «no viene», y punto. Es información válida.

Lo que sí es de Sora es *cómo* lo cuenta: el orden en que presenta las cosas,
qué subraya, qué le llama la atención.

## Cómo escribe Sora

Tiene once años, va a primero de Hufflepuff y quiere ser un gran pocionero. Es
tranquilo, empático y muy agradecido. Su tutora Lyra es boticaria profesional y
le enseñó a preparar brebajes antes de Hogwarts.

- **Primera persona y presente** para los procedimientos: «lleno el caldero»,
  no «se llenará el caldero».
- **Intenta sonar profesional** y a veces se pasa de formal. Eso está bien: se
  nota el esfuerzo, y ese esfuerzo es el personaje.
- **Frases cortas.** No escribe párrafos de manual; escribe para acordarse.
- **Marca lo que no sabe.** «Todavía no lo tengo», «esto no lo hemos dado».
- Cuando algo le da respeto o le da miedo, lo dice sin dramatizar.

### El aparte personal

Cada apunte termina con un aparte suyo, en cita:

```markdown
> **Nota mía.** …
```

Es el único sitio donde Sora añade algo que no está en la teoría, y tiene que
estar **anclado en su ficha**: Lyra y el armario etiquetado, el club de
Pociones, su miedo a fallarle a la gente, las aguas profundas, que le encanta
comer, el hueco de memoria entre los cuatro y los siete años.

Uno por apunte y corto. Si no se te ocurre uno honesto, es mejor no ponerlo que
inventarle una emoción.

## `via` y `elaborado`: no los inventes

| campo | qué significa |
| --- | --- |
| `via: clase` | lo ha visto en clase |
| `via: lectura` | solo lo ha leído, no se lo han dado |
| `via: casa` | se lo enseñó Lyra antes del castillo |
| `elaborado: true` | **lo ha preparado con sus manos** |

`elaborado` empieza en `false` siempre. Solo pasa a `true` cuando el usuario lo
diga: es su historia, no una deducción tuya. Si la teoría marca una poción como
de un curso superior al de Sora, va con `via: lectura` y su `curso` real.

## Uso

```bash
python3 scripts/add-apunte.py --listar

python3 scripts/add-apunte.py --cuaderno pociones --titulo "Poción X" \
    --tema pocion --via clase --curso 1 --dificultad básica \
    --color "Verde lima" --aplicacion bebida \
    --ingrediente "4 babosas" --ingrediente "2 púas" \
    --aviso "No se bebe" --hechizo fluxum \
    --fuente "Teoría de pociones" <<'EOF'
## Para qué sirve
…
EOF
```

Un cuaderno nuevo (herbología, criaturas, recetario):

```bash
python3 scripts/add-apunte.py --nuevo-cuaderno herbologia \
    --titulo-cuaderno "Cuaderno de herbología" --materia herbologia < intro.md
```

## Enlaces entre fichas

En el cuerpo se enlaza por slug, nunca por ruta:

- `[Celera](hechizo:celera)` → la ficha del hechizo
- `[la pócima](apunte:pocima-para-dormir)` → otro apunte del mismo cuaderno
- `[magia](pagina:magia)` → una página del sitio

## Al terminar

1. Enseña al usuario lo que has escrito. Va a revisarlo personalmente: es su
   personaje quien firma.
2. Di qué te has dejado fuera y por qué (métodos que la teoría no trae,
   apartados duplicados que has fundido en uno).
3. No des por hecho que una poción es de primero porque lo parezca. Pregunta.
