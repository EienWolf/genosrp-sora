# GenosRP Sora

Página web estática con HTML, CSS y JavaScript plano. Sin dependencias ni paso
de compilación.

## Estructura

```
.
├── index.html          # Página principal
├── css/styles.css      # Estilos (tokens + tema claro/oscuro)
├── js/main.js          # JS del sitio
└── assets/img/         # Imágenes y recursos estáticos
```

## Desarrollo

Basta con abrir `index.html` en el navegador. Para servirlo por HTTP (necesario
si más adelante usas `fetch`, módulos ES o rutas absolutas):

```bash
python -m http.server 8000
# o
npx serve .
```

Luego abre http://localhost:8000

## Despliegue

Al ser estático, se puede publicar tal cual en GitHub Pages, Cloudflare Pages,
Netlify o cualquier servidor web: la raíz del sitio es esta carpeta.

## Variables de entorno

`.env` está excluido del control de versiones. Usa `.env.example` como plantilla:

```bash
cp .env.example .env
```
