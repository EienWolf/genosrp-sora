# GenosRP Sora

Página web estática con HTML, CSS y JavaScript plano. Sin dependencias ni paso
de compilación para desarrollar; el único build es una copia de archivos para
publicar en Cloudflare.

**En producción:** https://genosrp.eienwolf.dev/sora/

## Estructura

```
.
├── index.html          # Página principal
├── css/styles.css      # Estilos (tokens + tema claro/oscuro)
├── js/main.js          # JS del sitio
├── assets/img/         # Imágenes y recursos estáticos
├── wrangler.jsonc      # Configuración del Worker (ruta y assets)
└── scripts/
    ├── build.mjs       # Copia el sitio a dist/sora/
    ├── deploy.sh       # Build + wrangler deploy (lee .env)
    └── setup-dns.sh    # Paso único: registro DNS del subdominio
```

## Desarrollo

Basta con abrir `index.html` en el navegador. Para servirlo por HTTP:

```bash
npm run dev        # http://localhost:8000
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
