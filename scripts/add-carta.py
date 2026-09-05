#!/usr/bin/env python3
"""Añade cartas a content/cartas/, organizadas por hilo.

Un hilo es una carpeta; cada carta es un archivo numerado dentro de ella, así
el orden de respuestas vive en el nombre del archivo y no puede desincronizarse.

  content/cartas/club-de-quidditch/
  ├── hilo.md
  ├── 01-sora-winterbourne.md
  └── 02-lilwenn-pliego.md

Uso:
  scripts/add-carta.py --listar
  scripts/add-carta.py --hilo club-de-quidditch --de sora-winterbourne \\
      --para lilwenn-pliego < carta.txt
  scripts/add-carta.py --nuevo-hilo club-de-pociones --titulo "Club de Pociones" \\
      --de sora-winterbourne --para arlan-fendragon < carta.txt

  scripts/add-carta.py --conocido lilwenn-pliego --nombre "Lilwenn Pliego" \\
      --relacion "Responsable del club de Quidditch"
"""
import argparse, re, sys, textwrap, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CARTAS = RAIZ / "content" / "cartas"
CONOCIDOS = RAIZ / "content" / "conocidos.yml"
DESCONOCIDO = "?"


def slugify(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", t.lower())).strip("-")


def esc(s):
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


def bloque(valor, sangria):
    """Escalar YAML: corto en línea, largo como bloque plegado."""
    s = " ".join(str(valor).split())
    if len(s) <= 70:
        return esc(s)
    pad = " " * sangria
    return ">-\n" + "\n".join(pad + l for l in textwrap.wrap(s, width=74 - sangria))


# --- Hilos -------------------------------------------------------------------

def hilos():
    if not CARTAS.is_dir():
        return []
    return sorted(d for d in CARTAS.iterdir() if d.is_dir())


def cartas_de(hilo):
    return sorted(hilo.glob("[0-9][0-9]-*.md"))


def meta(ruta):
    """Lee el frontmatter de una carta como pares clave→texto crudo."""
    if not ruta.is_file():
        return {}
    m = re.match(r"^---\n(.*?)\n---\n", ruta.read_text(encoding="utf-8"), re.S)
    if not m:
        return {}
    partes = [None, m.group(1)]
    datos, clave = {}, None
    for linea in partes[1].splitlines():
        m = re.match(r"([a-z_]+):\s*(.*)", linea)
        if m:
            clave = m.group(1)
            datos[clave] = m.group(2).strip().strip('"')
        elif clave and linea.strip().startswith("- "):
            datos.setdefault(clave + "_lista", []).append(
                linea.strip()[2:].strip().strip('"'))
    return datos


def listar():
    if not hilos():
        print("No hay hilos todavía.")
        return
    for h in hilos():
        cs = cartas_de(h)
        m0 = meta(h / "hilo.md")
        print(f"\n▸ {h.name}  ({len(cs)} carta{'s' if len(cs) != 1 else ''})"
              f"  {m0.get('titulo', '')}")
        for c in cs:
            m = meta(c)
            de = ", ".join(m.get("de_lista", [])) or m.get("de", "?")
            para = ", ".join(m.get("para_lista", [])) or m.get("para", "?")
            print(f"    {c.name[:2]}. {de} → {para}   [{m.get('fecha', DESCONOCIDO)}]")


def escribir_hilo(dir_hilo, titulo, asunto, estado):
    ruta = dir_hilo / "hilo.md"
    participantes = []
    for c in cartas_de(dir_hilo):
        m = meta(c)
        for k in ("de", "para"):
            participantes += m.get(k + "_lista", []) or ([m[k]] if m.get(k) else [])
    vistos = list(dict.fromkeys(participantes))
    fm = "---\ntipo: \"hilo-cartas\"\n"
    fm += f"slug: {esc(dir_hilo.name)}\n"
    fm += f"titulo: {bloque(titulo, 2)}\n"
    if asunto:
        fm += f"asunto: {bloque(asunto, 2)}\n"
    fm += "participantes:\n" + "".join(f"  - {esc(p)}\n" for p in vistos)
    fm += f"cartas: {len(cartas_de(dir_hilo))}\n"
    fm += f"estado: {esc(estado)}\n---\n"
    ruta.write_text(fm, encoding="utf-8")


def anadir(args, cuerpo):
    nuevo = bool(args.nuevo_hilo)
    nombre = args.nuevo_hilo or args.hilo
    dir_hilo = CARTAS / nombre
    if nuevo and dir_hilo.exists():
        sys.exit(f"✘ El hilo «{nombre}» ya existe. Usa --hilo para añadir a él.")
    if not nuevo and not dir_hilo.is_dir():
        sys.exit(f"✘ No existe el hilo «{nombre}».\n"
                 f"  Hilos: {', '.join(h.name for h in hilos()) or '(ninguno)'}\n"
                 f"  Para crearlo: --nuevo-hilo {nombre} --titulo \"…\"")
    dir_hilo.mkdir(parents=True, exist_ok=True)

    orden = len(cartas_de(dir_hilo)) + 1
    remitentes = [s.strip() for s in args.de.split(",") if s.strip()]
    destinos = [s.strip() for s in args.para.split(",") if s.strip()]
    ruta = dir_hilo / f"{orden:02d}-{remitentes[0]}.md"

    fm = "---\ntipo: \"carta\"\n"
    fm += f"hilo: {esc(nombre)}\norden: {orden}\n"
    fm += "de:\n" + "".join(f"  - {esc(r)}\n" for r in remitentes)
    fm += "para:\n" + "".join(f"  - {esc(d)}\n" for d in destinos)
    fm += f"fecha: {esc(args.fecha) if args.fecha else 'null  # sin fecha conocida'}\n"
    if args.asunto:
        fm += f"asunto: {bloque(args.asunto, 2)}\n"
    if args.adjunto:
        fm += "adjuntos:\n" + "".join(f"  - {bloque(a, 4)}\n" for a in args.adjunto)
    if args.emote:
        fm += "emotes:\n" + "".join(
            f"  - comando: \"do\"\n    texto: {bloque(e, 6)}\n" for e in args.emote)
    fm += "---\n\n" + cuerpo.strip() + "\n"
    ruta.write_text(fm, encoding="utf-8")

    escribir_hilo(dir_hilo, args.titulo or nombre.replace("-", " ").capitalize(),
                  args.asunto, args.estado)
    print(f"✔ {ruta.relative_to(RAIZ)}  ({', '.join(remitentes)} → {', '.join(destinos)})")


# --- Conocidos ---------------------------------------------------------------

def leer_conocidos():
    """Devuelve {slug: texto_del_bloque} conservando el formato existente."""
    if not CONOCIDOS.is_file():
        return {}
    bloques, actual, slug = {}, [], None
    for linea in CONOCIDOS.read_text(encoding="utf-8").splitlines(keepends=True):
        m = re.match(r"  - slug:\s*\"?([a-z0-9-]+)", linea)
        if m:
            if slug:
                bloques[slug] = "".join(actual)
            slug, actual = m.group(1), [linea]
        elif slug:
            actual.append(linea)
    if slug:
        bloques[slug] = "".join(actual)
    return bloques


def anadir_conocido(args):
    bloques = leer_conocidos()
    existe = args.conocido in bloques
    b = f"  - slug: {esc(args.conocido)}\n"
    b += f"    nombre: {bloque(args.nombre or args.conocido, 6)}\n"
    b += f"    relacion: {bloque(args.relacion, 6) if args.relacion else esc(DESCONOCIDO)}\n"
    b += f"    cargo: {bloque(args.cargo, 6) if args.cargo else esc(DESCONOCIDO)}\n"
    b += f"    casa: {bloque(args.casa, 6) if args.casa else esc(DESCONOCIDO)}\n"
    if args.info:
        b += "    info:\n" + "".join(f"      - {bloque(i, 8)}\n" for i in args.info)
    else:
        b += "    info: []\n"
    bloques[args.conocido] = b

    cab = ('# Personas que Sora ha tratado y aún no tienen ficha propia.\n'
           '# "?" = dato desconocido; rellénalo cuando aparezca en el rol.\n'
           '# Si alguien gana peso, promuévelo a content/personajes/<slug>.md.\n'
           'conocidos:\n')
    CONOCIDOS.write_text(cab + "".join(bloques[k] for k in sorted(bloques)),
                         encoding="utf-8")
    print(f"✔ conocidos.yml: {args.conocido} {'actualizado' if existe else 'añadido'}")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--listar", action="store_true", help="Muestra los hilos y su orden")
    p.add_argument("--hilo", help="Slug de un hilo existente")
    p.add_argument("--nuevo-hilo", help="Crea un hilo con este slug")
    p.add_argument("--titulo", help="Título del hilo")
    p.add_argument("--asunto", help="Asunto de la carta / del hilo")
    p.add_argument("--de", help="Slug(s) del remitente, separados por coma")
    p.add_argument("--para", help="Slug(s) del destinatario, separados por coma")
    p.add_argument("--fecha", help="Fecha in-game, si se conoce")
    p.add_argument("--estado", default="abierto", help="abierto | cerrado")
    p.add_argument("--adjunto", action="append", help="Objeto que acompaña la carta")
    p.add_argument("--emote", action="append", help="Texto de un /do de la carta")
    p.add_argument("--conocido", help="Slug de la persona a registrar")
    p.add_argument("--nombre", help="Nombre completo del conocido")
    p.add_argument("--relacion", help="Relación con Sora")
    p.add_argument("--cargo", help="Cargo, si se conoce")
    p.add_argument("--casa", help="Casa de Hogwarts, si se conoce")
    p.add_argument("--info", action="append", help="Dato suelto conocido")
    args = p.parse_args()

    if args.listar:
        return listar()
    if args.conocido:
        return anadir_conocido(args)
    if not (args.hilo or args.nuevo_hilo):
        return p.print_help()
    if not (args.de and args.para):
        sys.exit("✘ Faltan --de y --para.")
    cuerpo = sys.stdin.read()
    if not cuerpo.strip():
        sys.exit("✘ El cuerpo de la carta llega por stdin y está vacío.")
    anadir(args, cuerpo)


if __name__ == "__main__":
    main()
