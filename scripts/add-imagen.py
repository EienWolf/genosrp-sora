#!/usr/bin/env python3
"""Añade capturas del juego a la galería (content/galeria/).

Cada imagen es un par: el archivo y su ficha .md con la descripción. La ficha
sirve para dos cosas distintas: mostrar la galería en el sitio y decidir qué
capturas mandar como referencia a un generador de imágenes.

  scripts/add-imagen.py ~/captura.png --slug sora-frontal-uniforme
  scripts/add-imagen.py --pendientes        # fichas sin describir
  scripts/add-imagen.py --referencias       # propone el lote de referencia
  scripts/add-imagen.py --listar
"""
import argparse, hashlib, re, shutil, sys, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GALERIA = RAIZ / "content" / "galeria"
SIN_DESCRIBIR = "PENDIENTE"

# Qué hace buena a una referencia, y cuánto pesa. El objetivo es consistencia
# de personaje: cara nítida, color fiel y sin adornos que el generador copie.
# Una hoja de referencia no es una captura: está hecha a propósito para esto,
# con fondo limpio, varias vistas y paleta. Vale más que cualquier captura por
# buena que sea, así que pesa aparte y no compite por ángulo.
CLASES = {"captura": 0, "hoja-referencia": 6, "ilustracion": 0}

CRITERIOS = {
    "fondo": {"neutro": 2, "escenario": 0},
    "iluminacion": {"neutra": 3, "calida": -2, "oscura": -2, "dominante": -3},
    "rostro_visible": {True: 3, False: 0},
    "ojos_visibles": {True: 2, False: 0},
    "ui_visible": {True: -1, False: 0},
}
ANGULOS = ["frontal", "tres-cuartos", "perfil", "espalda"]


def slugify(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", t.lower())).strip("-")


def esc(s):
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


def dimensiones(ruta):
    try:
        from PIL import Image
        with Image.open(ruta) as im:
            return im.size
    except Exception:
        import struct
        d = ruta.read_bytes()[:33]
        if d[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", d[16:24])
    return (0, 0)


def fichas():
    return sorted(GALERIA.glob("*.md")) if GALERIA.is_dir() else []


def meta(ruta):
    """Frontmatter de una ficha. Se usa YAML real: los valores llevan
    comentarios en línea y un parser a mano se los tragaba como parte del dato."""
    try:
        import yaml
    except ImportError:
        sys.exit("✘ Falta PyYAML:  pip install --user pyyaml")
    # Se parte por una línea que sea exactamente "---": un comentario que
    # acabe en "---" no debe cortar el frontmatter.
    m = re.match(r"^---\n(.*?)\n---\n", ruta.read_text(encoding="utf-8"), re.S)
    return (yaml.safe_load(m.group(1)) or {}) if m else {}


def puntuar(m):
    """Puntúa una ficha como candidata a referencia. None si falta describirla."""
    if m.get("descripcion") == SIN_DESCRIBIR or not m.get("angulo"):
        return None
    base = sum(tabla.get(m.get(campo), 0) for campo, tabla in CRITERIOS.items())
    return base + CLASES.get(m.get("clase", "captura"), 0)


def es_accesorio(m):
    """Una hoja de un accesorio no sirve para consistencia de cara: se manda
    solo cuando ese accesorio tiene que salir en la imagen."""
    return m.get("referencia_de") == "accesorio"


def anadir(args):
    origen = Path(args.imagen).expanduser()
    if not origen.is_file():
        sys.exit(f"✘ No existe: {origen}")
    slug = args.slug or slugify(origen.stem)
    GALERIA.mkdir(parents=True, exist_ok=True)
    destino = GALERIA / f"{slug}{origen.suffix.lower()}"
    ficha = GALERIA / f"{slug}.md"
    if ficha.exists() and not args.force:
        sys.exit(f"✘ Ya existe {ficha.relative_to(RAIZ)}. Usa --force o cambia --slug.")

    digest = hashlib.sha256(origen.read_bytes()).hexdigest()[:16]
    for f in fichas():
        if meta(f).get("hash") == digest and f != ficha:
            sys.exit(f"✘ Esa imagen ya está en la galería como {f.name} (mismo hash).")

    shutil.copy2(origen, destino)
    w, h = dimensiones(destino)
    fm = f'''---
tipo: "imagen"
slug: {esc(slug)}
archivo: {esc(destino.name)}
ancho: {w}
alto: {h}
hash: {esc(digest)}
origen: {esc(args.origen)}
# clase:         captura | hoja-referencia
# referencia_de: personaje | accesorio
clase: {esc(args.clase)}
referencia_de: {esc(args.referencia_de)}
# retrato_principal: true = es el retrato que abre la portada.
retrato_principal: {'true' if args.retrato else 'false'}

# Descripción — la rellena la skill `galeria` mirando la imagen
titulo: {esc(args.titulo) if args.titulo else esc(SIN_DESCRIBIR)}
descripcion: {esc(SIN_DESCRIBIR)}

# Aptitud como referencia para generar imágenes.
# Los comentarios van en su propia línea: un comentario tras el valor se cuela
# en el dato si alguien edita el archivo con una sustitución de texto.
#   angulo:      frontal | tres-cuartos | perfil | espalda
#   plano:       primer-plano | medio | cuerpo-entero
#   fondo:       neutro | escenario
#   iluminacion: neutra | calida | oscura | dominante
#   ui_visible:  hay flechas u otros elementos de interfaz que recortar
angulo: null
plano: null
fondo: null
iluminacion: null
rostro_visible: null
ojos_visibles: null
ui_visible: null
atuendo: null
muestra: []
notas_referencia: null
---

## Descripción

<!-- Qué se ve en la captura, en prosa. -->
'''
    ficha.write_text(fm, encoding="utf-8")
    print(f"✔ {destino.relative_to(RAIZ)}  ({w}×{h})")
    print(f"  ficha: {ficha.relative_to(RAIZ)} — falta describirla")


def listar():
    if not fichas():
        return print("La galería está vacía.")
    for f in fichas():
        m = meta(f)
        p = puntuar(m)
        estado = "sin describir" if p is None else f"referencia {p:+d}"
        print(f"{f.stem:<32} {str(m.get('angulo') or '—'):<14} "
              f"{str(m.get('iluminacion') or '—'):<10} {estado}")


def pendientes():
    ps = [f for f in fichas() if puntuar(meta(f)) is None]
    if not ps:
        return print("✔ Todas las imágenes están descritas.")
    print(f"{len(ps)} imagen(es) sin describir:")
    for f in ps:
        print(f"  · {f.relative_to(RAIZ)}  →  {meta(f).get('archivo')}")


def referencias(args):
    puntuadas = []
    for f in fichas():
        m = meta(f)
        p = puntuar(m)
        if p is not None:
            puntuadas.append((p, m, f))
    if not puntuadas:
        return print("No hay imágenes descritas todavía. Usa --pendientes.")
    puntuadas.sort(key=lambda t: -t[0])
    accesorios = [t for t in puntuadas if es_accesorio(t[1])]
    generadas = [t for t in puntuadas if t[1].get("clase") == "ilustracion"]
    puntuadas = [t for t in puntuadas
                 if not es_accesorio(t[1]) and t[1].get("clase") != "ilustracion"]

    # Un lote de referencia necesita variedad de ángulo, no la misma foto cinco
    # veces. Se coge la mejor de cada ángulo, y solo se rellena hasta el mínimo
    # de 3: añadir una redundante o una de color falseado empeora el resultado.
    lote, usados = [], set()
    for p, m, f in puntuadas:
        if m.get("clase") == "hoja-referencia" and len(lote) < args.max:
            lote.append((p, m, f)); continue      # no compite por ángulo
        if m.get("angulo") not in usados and len(lote) < args.max and p >= 0:
            lote.append((p, m, f)); usados.add(m.get("angulo"))
    for p, m, f in puntuadas:
        if len(lote) >= max(3, len(lote)):
            break
        if f not in [x[2] for x in lote] and p > 0:
            lote.append((p, m, f))

    print(f"Lote propuesto: {len(lote)} imagen(es) "
          f"(máx. {args.max}; se prioriza variedad de ángulo sobre cantidad)\n")
    for p, m, f in lote:
        aviso = "  ⚠ recortar UI" if m.get("ui_visible") else ""
        print(f"  {p:+3d}  {m.get('archivo'):<34} {m.get('angulo'):<14} "
              f"{m.get('plano') or '—'}{aviso}")
    if accesorios:
        print("\n  Accesorios — añádelas solo si ese accesorio sale en la imagen:")
        for p, m, f in accesorios:
            print(f"  {p:+3d}  {m.get('archivo'):<34} {m.get('titulo') or ''}")
    if generadas:
        print("\n  Ilustraciones ya generadas — fuera del lote a propósito:")
        for p, m, f in generadas:
            print(f"       {m.get('archivo'):<34} reenviarlas arrastra su propia desviación")
    faltan = [a for a in ANGULOS if a not in usados]
    if faltan:
        print(f"\n  Sin cubrir: {', '.join(faltan)}")
    descartadas = [(p, m) for p, m, f in puntuadas if (p, m, f) not in lote]
    if descartadas:
        print("\n  Descartadas:")
        for p, m in descartadas:
            print(f"  {p:+3d}  {m.get('archivo'):<34} {m.get('notas_referencia') or ''}")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("imagen", nargs="?", help="Ruta de la captura a añadir")
    p.add_argument("--slug", help="Nombre en la galería")
    p.add_argument("--titulo", help="Título de la imagen")
    p.add_argument("--origen", default="captura del juego", help="Procedencia")
    p.add_argument("--clase", default="captura",
                   choices=["captura", "hoja-referencia", "ilustracion"])
    p.add_argument("--referencia-de", dest="referencia_de", default="personaje",
                   choices=["personaje", "accesorio"])
    p.add_argument("--retrato", action="store_true",
                   help="Marca esta imagen como el retrato de la portada")
    p.add_argument("--force", action="store_true", help="Sobrescribe la ficha")
    p.add_argument("--listar", action="store_true")
    p.add_argument("--pendientes", action="store_true", help="Fichas sin describir")
    p.add_argument("--referencias", action="store_true", help="Propone el lote")
    p.add_argument("--max", type=int, default=5, help="Tamaño del lote (3-5)")
    a = p.parse_args()

    if a.listar:
        return listar()
    if a.pendientes:
        return pendientes()
    if a.referencias:
        return referencias(a)
    if a.imagen:
        return anadir(a)
    p.print_help()


if __name__ == "__main__":
    main()
