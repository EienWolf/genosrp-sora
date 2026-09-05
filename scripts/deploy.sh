#!/usr/bin/env bash
# Despliega el sitio a Cloudflare Workers (assets estáticos).
#
#   ./scripts/deploy.sh           → despliegue real
#   ./scripts/deploy.sh --dry-run → solo construye y valida
#
# Autenticación, por orden de preferencia:
#   1. CLOUDFLARE_API_TOKEN en .env  (no interactivo, ideal para repetir/CI)
#   2. sesión de `npx wrangler login` (OAuth, sin secretos en disco del repo)
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "▸ Autenticando con CLOUDFLARE_API_TOKEN de .env"
elif npx wrangler whoami >/dev/null 2>&1; then
  echo "▸ Autenticando con la sesión de wrangler login"
else
  cat >&2 <<'MSG'
✘ Sin credenciales de Cloudflare. Elige una:

  a) Token de API (recomendado para desplegar siempre igual):
       cp .env.example .env    # y pega el token en CLOUDFLARE_API_TOKEN
     Permisos del token: ver README.

  b) Sesión interactiva (abre el navegador):
       npx wrangler login
MSG
  exit 1
fi

echo "▸ Construyendo…"
node scripts/build.mjs

echo
echo "▸ Desplegando a Cloudflare…"
npx wrangler deploy "$@"

echo
echo "✔ Listo: https://${SITE_HOST:-genosrp.eienwolf.dev}${SITE_BASE_PATH:-/sora}/"
