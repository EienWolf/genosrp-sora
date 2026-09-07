#!/usr/bin/env python3
"""Añade apuntes a content/apuntes/, organizados por cuaderno.

Un cuaderno es una carpeta; cada apunte, un archivo numerado dentro. El número
del archivo es el orden de lectura del cuaderno.

  content/apuntes/pociones/
  ├── cuaderno.md
  ├── 01-la-mesa.md
  └── 02-el-equipo.md

A diferencia de los hechizos, aquí el script NO trae el contenido de ninguna
base: la teoría es la fuente y la redacción la pone Sora. El script solo
garantiza que el frontmatter, el número y el slug sean consistentes; el cuerpo
llega por stdin y lo escribe quien redacta.

Uso:
  scripts/add-apunte.py --listar
  scripts/add-apunte.py --cuaderno pociones --titulo "Poción de la risa" \\
      --tema pocion --via clase --curso 1 --oculto \\
      --ingrediente "2 raíces" --ingrediente "1 pluma" \\
      --aviso "No darla a menores" < cuerpo.md
  scripts/add-apunte.py --nuevo-cuaderno herbologia --titulo-cuaderno "Cuaderno de herbología" \\
      --materia herbologia < intro.md
"""
import argparse, re, sys, unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
APUNTES = RAIZ / "content" / "apuntes"
TEMAS = ["fundamentos", "equipo", "pocion", "criatura", "planta", "concepto"]
VIAS = ["clase", "lectura", "casa"]


def slugify(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", t.lower())).strip("-")


def esc(s):
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


def cuadernos():
    return sorted(d for d in APUNTES.glob("*") if d.is_dir()) if APUNTES.exists() else []


def apuntes_de(dir_cuaderno):
    return sorted(dir_cuaderno.glob("[0-9][0-9]-*.md"))


def listar():
    if not cuadernos():
        print("(ningún cuaderno todavía)")
        return
    for d in cuadernos():
        fichas = apuntes_de(d)
        print(f"\n{d.name}  ({len(fichas)} apuntes)")
        for f in fichas:
            m = re.search(r'^titulo:\s*"(.*)"$', f.read_text(encoding="utf-8"), re.M)
            texto = f.read_text(encoding="utf-8")
            via = re.search(r"^via:\s*\"?(\w+)", texto, re.M)
            oculto = re.search(r"^oculto:\s*true\s*$", texto, re.M)
            print(f"  {f.name[:2]}. {m.group(1) if m else f.stem}"
                  f"{'  [' + via.group(1) + ']' if via else ''}"
                  f"{'  (oculto)' if oculto else ''}")


def nuevo_cuaderno(args, cuerpo):
    slug = slugify(args.nuevo_cuaderno)
    d = APUNTES / slug
    if d.exists():
        sys.exit(f"✘ El cuaderno «{slug}» ya existe.")
    d.mkdir(parents=True)
    fm = ['---', 'tipo: "cuaderno"', f"slug: {esc(slug)}"]
    if args.materia:
        fm.append(f"materia: {esc(args.materia)}")
    fm.append(f"titulo: {esc(args.titulo_cuaderno or slug.capitalize())}")
    if args.subtitulo:
        fm.append(f"subtitulo: {esc(args.subtitulo)}")
    fm += ['autor: "sora-winterbourne"', 'estado: "en-curso"']
    if args.fuente:
        fm.append(f"fuente: {esc(args.fuente)}")
    fm.append("---\n")
    texto = "\n".join(fm) + "\n## Sobre este cuaderno\n\n" + (cuerpo.strip() or
        "<!-- Por qué existe este cuaderno, en palabras de Sora. -->") + "\n"
    (d / "cuaderno.md").write_text(texto, encoding="utf-8")
    print(f"✔ {(d / 'cuaderno.md').relative_to(RAIZ)}")


def anadir(args, cuerpo):
    d = APUNTES / args.cuaderno
    if not d.is_dir():
        sys.exit(f"✘ No existe el cuaderno «{args.cuaderno}».\n"
                 f"  Cuadernos: {', '.join(c.name for c in cuadernos()) or '(ninguno)'}\n"
                 f"  Para crearlo: --nuevo-cuaderno {args.cuaderno} --titulo-cuaderno \"…\"")
    if not cuerpo.strip():
        sys.exit("✘ El cuerpo del apunte llega por stdin y está vacío.\n"
                 "  Aquí el texto es lo importante: lo redacta Sora, no el script.")

    orden = len(apuntes_de(d)) + 1
    slug = slugify(args.slug or args.titulo)
    ruta = d / f"{orden:02d}-{slug}.md"

    fm = ['---', 'tipo: "apunte"', f"cuaderno: {esc(d.name)}", f"orden: {orden}",
          f"slug: {esc(slug)}", f"titulo: {esc(args.titulo)}",
          f"tema: {esc(args.tema)}", f"via: {esc(args.via)}",
          f"elaborado: {'true' if args.elaborado else 'false'}"]
    if args.oculto:
        fm.append("oculto: true")
    for clave, valor in (("curso", args.curso), ("dificultad", args.dificultad),
                         ("aplicacion", args.aplicacion), ("color_final", args.color),
                         ("creador", args.creador)):
        if valor:
            fm.append(f"{clave}: {valor if clave == 'curso' else esc(valor)}")
    for clave, valores in (("ingredientes", args.ingrediente),
                           ("advertencias", args.aviso),
                           ("hechizos", args.hechizo)):
        if valores:
            fm.append(f"{clave}:")
            fm += [f"  - {esc(v)}" for v in valores]
    if args.fuente:
        fm.append(f"fuente: {esc(args.fuente)}")
    fm.append("---\n")
    ruta.write_text("\n".join(fm) + "\n" + cuerpo.strip() + "\n", encoding="utf-8")
    print(f"✔ {ruta.relative_to(RAIZ)}  ({args.tema}, {args.via})")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--listar", action="store_true")
    p.add_argument("--cuaderno")
    p.add_argument("--nuevo-cuaderno")
    p.add_argument("--titulo-cuaderno")
    p.add_argument("--subtitulo")
    p.add_argument("--materia")
    p.add_argument("--titulo")
    p.add_argument("--slug")
    p.add_argument("--tema", choices=TEMAS, default="concepto")
    p.add_argument("--via", choices=VIAS, default="clase",
                   help="clase = visto en clase; lectura = solo leído; casa = aprendido en casa")
    p.add_argument("--elaborado", action="store_true",
                   help="Sora lo ha preparado con sus manos, no solo estudiado")
    p.add_argument("--oculto", action="store_true",
                   help="se guarda en content/ pero no se publica en el sitio")
    p.add_argument("--curso", type=int)
    p.add_argument("--dificultad")
    p.add_argument("--aplicacion")
    p.add_argument("--color")
    p.add_argument("--creador")
    p.add_argument("--ingrediente", action="append")
    p.add_argument("--aviso", action="append")
    p.add_argument("--hechizo", action="append", help="slug de un hechizo relacionado")
    p.add_argument("--fuente")
    args = p.parse_args()

    if args.listar:
        return listar()
    cuerpo = "" if sys.stdin.isatty() else sys.stdin.read()
    if args.nuevo_cuaderno:
        return nuevo_cuaderno(args, cuerpo)
    if not (args.cuaderno and args.titulo):
        p.error("hacen falta --cuaderno y --titulo (o --listar, o --nuevo-cuaderno)")
    anadir(args, cuerpo)


if __name__ == "__main__":
    main()
