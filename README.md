# GenosRP Sora

Sitio del personaje de rol **Sora Winterbourne**. Se genera desde `content/`,
que es la fuente de verdad: el HTML es un derivado y no se edita nunca a mano.
El sitio publicado no lleva dependencias en el navegador.

**En producción:** https://genosrp.eienwolf.dev/sora/

## Estructura

```
.
├── content/            # FUENTE DE VERDAD. Ver content/README.md
├── assets/             # SVG: el sello de la familia, el favicon, el emblema de Genos
├── css/styles.css      # Estilos del sitio
├── js/main.js          # Filtros de hechizos y visor de galería
├── js/atmosfera.js     # El cielo, la varita y el movimiento
├── wrangler.jsonc      # Configuración del Worker (ruta y assets)
├── .claude/skills/     # Skills para añadir hechizos, cartas e imágenes
└── scripts/
    ├── generar.mjs     # Generador: content/ -> dist/sora/
    ├── build.mjs       #   carga de content/ y plantilla común
    ├── paginas.mjs     #   renderizado de cada página
    ├── maquina.mjs     #   llms.txt, content.json, robots, sitemap
    ├── add-hechizo.py  # Importa hechizos de discord-hechizos
    ├── add-carta.py    # Añade cartas y mantiene los hilos
    ├── add-imagen.py   # Añade capturas y elige el lote de referencia
    ├── deploy.sh       # Build + wrangler deploy (lee .env)
    └── setup-dns.sh    # Paso único: registro DNS del subdominio
```

## El sitio y las máquinas

El HTML publicado es una **selección**: deja fuera las guías de interpretación
de los personajes secundarios y los metadatos internos (banderas de
mantenimiento, aptitud de las imágenes como referencia).

Esa selección no se aplica a las salidas legibles por máquina. `llms.txt`,
`llms-full.txt` y `content.json` llevan **todo** lo que hay en `content/`,
porque nada está marcado como privado. Si una IA consulta el sitio, llega al
material completo.

## Desarrollo

```bash
npm run dev        # construye y sirve en http://localhost:8000/sora/
```

Para probarlo tal cual quedará en producción (con el prefijo `/sora`):

```bash
npm run preview    # http://localhost:8787/sora/
```

## Despliegue

El sitio se publica como un **Worker de Cloudflare con assets estáticos**. El
build copia todo a `dist/sora/`, y una ruta por path (`genosrp.eienwolf.dev/sora*`)
hace que solo esa parte del hostname llegue a este Worker: el resto del dominio
queda libre para otros proyectos.

### Estado actual

La infraestructura ya está creada en Cloudflare:

- Registro DNS `genosrp.eienwolf.dev` → `AAAA 100::` **proxeado** (placeholder;
  no hay origen, responde el Worker).
- Worker `genosrp-sora` con la ruta `genosrp.eienwolf.dev/sora*`.
- El sitio está publicado y sirviendo.

> **Nota:** el primer despliegue se hizo por API y dejó una versión provisional
> que lleva el sitio embebido dentro del propio Worker. El primer
> `npm run deploy` desde tu máquina la sustituye por la versión correcta, con
> assets estáticos nativos —mismo nombre, misma ruta, misma URL—. A partir de
> ahí todo funciona por el camino normal.

### Configuración inicial (una sola vez)

1. **Crear el token de API** en
   https://dash.cloudflare.com/profile/api-tokens → *Create Token* →
   *Create Custom Token*, con estos permisos:

   | Tipo   | Permiso         | Nivel |
   | ------ | --------------- | ----- |
   | Cuenta | Workers Scripts | Edit  |
   | Cuenta | Workers Routes  | Edit  |
   | Zona   | Zone            | Read  |
   | Zona   | DNS             | Edit  |

   En *Zone Resources* selecciona `eienwolf.dev`.

2. **Guardar las credenciales localmente** (nunca se suben al repo):

   ```bash
   cp .env.example .env
   # edita .env y pega el token en CLOUDFLARE_API_TOKEN
   ```

   Alternativa sin token: `npx wrangler login` abre el navegador y deja una
   sesión OAuth. `npm run deploy` la usa si no encuentra `CLOUDFLARE_API_TOKEN`.

3. **Instalar wrangler** (solo la primera vez):

   ```bash
   npm install
   ```

`npm run setup:dns` crea el registro DNS del subdominio. **Ya está hecho**;
el script queda por si algún día hay que rehacerlo o replicarlo en otro
subdominio, y no toca nada si el registro ya existe.

### Publicar cambios

```bash
npm run deploy
```

Eso construye `dist/` y ejecuta `wrangler deploy` usando el token de `.env`.
Al terminar imprime la URL pública.

Para ensayar sin publicar:

```bash
npm run deploy -- --dry-run
```

## Variables de entorno

`.env` está en `.gitignore`; `.env.example` es la plantilla versionada. Solo
`CLOUDFLARE_API_TOKEN` (y opcionalmente `CLOUDFLARE_ACCOUNT_ID`) son secretos:
el resto son el hostname y el path, que también viven en `wrangler.jsonc`.

Si cambias el dominio o el prefijo, actualiza **ambos**: `routes` en
`wrangler.jsonc` y las variables de `.env`.
