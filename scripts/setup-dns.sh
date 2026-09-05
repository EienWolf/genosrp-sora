#!/usr/bin/env bash
# Paso ÚNICO: crea el registro DNS proxeado que necesita la ruta del Worker.
#
# Una ruta de Worker (genosrp.eienwolf.dev/sora*) solo se activa si el hostname
# resuelve y pasa por el proxy de Cloudflare. Como no hay servidor de origen,
# se usa el truco habitual: un AAAA a 100:: (prefijo "discard") con proxy ON.
#
#   ./scripts/setup-dns.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

: "${CLOUDFLARE_API_TOKEN:?Falta CLOUDFLARE_API_TOKEN en .env}"
ZONE="${CLOUDFLARE_ZONE:-eienwolf.dev}"
HOST="${SITE_HOST:-genosrp.eienwolf.dev}"

api() {
  curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
       -H "Content-Type: application/json" "$@"
}

echo "▸ Buscando la zona ${ZONE}…"
zone_id=$(api "https://api.cloudflare.com/client/v4/zones?name=${ZONE}" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);if(!j.success){console.error(JSON.stringify(j.errors));process.exit(1)}process.stdout.write(j.result[0]?.id??"")})')

if [ -z "$zone_id" ]; then
  echo "✘ No se encontró la zona ${ZONE} con este token." >&2
  exit 1
fi
echo "  zone_id = ${zone_id}"

echo "▸ Comprobando ${HOST}…"
existing=$(api "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?name=${HOST}" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);const r=j.result?.[0];process.stdout.write(r?`${r.type} ${r.content} proxied=${r.proxied}`:"")})')

if [ -n "$existing" ]; then
  echo "  Ya existe un registro: ${existing}"
  echo "  Asegúrate de que esté proxeado (nube naranja). No se modifica nada."
  exit 0
fi

echo "▸ Creando AAAA ${HOST} → 100:: (proxeado)…"
api -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records" \
  --data "{\"type\":\"AAAA\",\"name\":\"${HOST}\",\"content\":\"100::\",\"proxied\":true,\"comment\":\"Placeholder para rutas de Workers\"}" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);if(!j.success){console.error("✘",JSON.stringify(j.errors));process.exit(1)}console.log("✔ Registro creado.")})'
