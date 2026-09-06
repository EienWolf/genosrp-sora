---
name: galeria
description: Añade capturas del juego a la galería (content/galeria/), las describe mirándolas y evalúa cuáles sirven como referencia para un generador de imágenes. Úsala cuando pidan agregar capturas, describir imágenes o elegir el lote de referencia.
allowed-tools: Bash(python3 scripts/add-imagen.py:*), Read, Edit
---

# Galería de capturas

Cada imagen es un par en `content/galeria/`: el archivo y su ficha `.md`. La
ficha sirve para dos cosas distintas y no hay que confundirlas:

1. **Mostrar la galería** en el sitio: título y descripción.
2. **Elegir el lote de referencia** para el generador de imágenes: los campos
   de aptitud.


## Dos clases de imagen

| `clase` | qué es |
| --- | --- |
| `captura` | una captura del juego, tal como se ve en pantalla |
| `hoja-referencia` | arte hecho a propósito como referencia: fondo limpio, varias vistas, paleta |

Y `referencia_de` dice de qué es referencia:

| valor | qué retrata |
| --- | --- |
| `personaje` | a Sora |
| `accesorio` | algo que lleva puesto: la bufanda, la mochila |
| `criatura` | su lechuza Aurora |
| `emblema` | un sello o escudo: el de los Winterbourne |

Importa porque el lote se arma distinto. Una hoja del personaje vale más que
cualquier captura y no compite por ángulo: entra siempre. **Todo lo demás no
sirve para consistencia de cara** —no hay cara que fijar— y se lista aparte,
para añadirlo solo cuando eso tenga que salir en la imagen.

```bash
scripts/add-imagen.py ~/hoja.jpeg --slug hoja-personaje \
    --clase hoja-referencia --referencia-de personaje --origen "hoja de referencia"
```

## 1. Añadir

```bash
python3 scripts/add-imagen.py ~/captura.png --slug sora-frontal-uniforme
```

Copia el archivo, calcula tamaño y hash —rechaza duplicados— y deja la ficha
con la descripción en `PENDIENTE`. El slug describe qué se ve
(`sora-perfil-derecho`), no cuándo se tomó.

## 2. Describir — hay que MIRAR la imagen

`python3 scripts/add-imagen.py --pendientes` lista lo que falta. Abre cada
imagen con Read y rellena la ficha. Sin mirarla no se puede: el script no ve.

En `descripcion`, lo que se ve: encuadre, pose, ropa, colores, luz. Concreto y
sin adornos; es lo que permitirá buscar una captura dentro de un año.

Campos de aptitud, con los valores exactos:

| Campo | Valores |
| ----- | ------- |
| `angulo` | `frontal`, `tres-cuartos`, `perfil`, `espalda` |
| `plano` | `primer-plano`, `medio`, `cuerpo-entero` |
| `fondo` | `neutro`, `escenario` |
| `iluminacion` | `neutra`, `calida`, `oscura`, `dominante` |
| `rostro_visible`, `ojos_visibles`, `ui_visible` | true/false |
| `muestra` | Qué aporta: peinado, cara, mochila, calzado… |
| `notas_referencia` | Por qué sirve o por qué no |

Tres cosas que se juzgan mal si no se piensan:

- **`iluminacion`** decide casi todo. Una captura en interior cálido desplaza
  los colores: la mochila verde de Sora sale amarilla y su pelo azul se apaga.
  Como referencia enseña colores que no son. Márcala `calida` y dilo en
  `notas_referencia`.
- **`ui_visible`** son las flechas del creador de personaje y cualquier
  elemento de interfaz. Hay que recortarlas antes de enviar la imagen o el
  generador puede reproducirlas.
- **`ojos_visibles`** solo si se distingue el color. La heterocromía de Sora
  —ojo derecho azul, izquierdo dorado— **no la reproduce el avatar del
  juego**: ninguna captura sirve para fijarla y hay que pedirla por texto.

## 3. Elegir el lote de referencia

```bash
python3 scripts/add-imagen.py --referencias        # máx. 5
python3 scripts/add-imagen.py --referencias --max 3
```

Puntúa cada imagen y propone un lote priorizando **variedad de ángulo**: una
frontal, una de perfil, una de espaldas. Cinco capturas casi iguales no dan
consistencia; tres bien elegidas sí. Por eso el lote puede salir con 3 aunque
pidas 5, y eso es correcto: no lo fuerces.

Al presentarlo, di siempre qué ángulos quedaron sin cubrir y cuáles hay que
recortar. Si falta un ángulo útil, sugiere al usuario qué captura tomar.

## 4. Cuando cambie el aspecto de Sora

Si cambia de atuendo, corte o curso, las capturas viejas siguen valiendo para
la galería pero dejan de servir como referencia. Anótalo en
`notas_referencia` en vez de borrarlas: la galería es también un registro de
cómo ha ido cambiando.
