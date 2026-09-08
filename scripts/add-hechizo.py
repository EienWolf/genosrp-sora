#!/usr/bin/env python3
"""Importa hechizos desde el proyecto discord-hechizos a content/hechizos/.

  scripts/add-hechizo.py "wingardium leviosa"   # importa o actualiza uno
  scripts/add-hechizo.py --buscar lumos         # busca sin escribir nada
  scripts/add-hechizo.py --todos                # importa todos los de la BD
  scripts/add-hechizo.py NOMBRE --dry-run       # muestra el resultado sin escribir

Regla de actualización: si la ficha local tiene `bloqueado: true`, no se toca
(esa versión tiene notas o correcciones propias). Con `bloqueado: false` se
regenera desde la base, conservando todo lo que el script no genera: campos
propios del frontmatter y secciones del cuerpo añadidas a mano.
"""
import argparse, os, re, sqlite3, sys, textwrap, unicodedata
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "content" / "hechizos"
DB_POR_DEFECTO = Path.home() / "apps" / "discord-hechizos" / "hechizos.db"


def ruta_db(cli):
    if cli:
        return Path(cli).expanduser()
    env = RAIZ / ".env"
    if env.is_file():
        for linea in env.read_text(encoding="utf-8").splitlines():
            if linea.strip().startswith("HECHIZOS_DB="):
                v = linea.split("=", 1)[1].strip().strip('"').strip("'")
                if v:
                    return Path(v).expanduser()
    return DB_POR_DEFECTO


MARCAS_DISCORD = re.compile(r"(\*\*|__|`)")


def limpiar_campo(valor):
    """Quita el marcado de Discord de un valor corto del frontmatter.

    33 de los 142 hechizos traen `**` pegado en conjuro, manifestación o
    movimiento. Como estos campos se escapan al pintarlos, el `**` nunca se
    interpretaría: solo se vería. El cuerpo en Markdown no pasa por aquí.
    """
    if not isinstance(valor, str):
        return valor
    v = re.sub(r"\s{2,}", " ", MARCAS_DISCORD.sub("", valor)).strip(" \t:-")
    # Siete pronunciaciones vienen entrecomilladas, algunas sin cerrar: las
    # comillas son del mensaje de Discord, no del dato.
    return v.strip('"\u00ab\u00bb').strip()


def slugify(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", t.lower())).strip("-")


# --- Emisión de YAML (sin dependencias externas) -----------------------------

def esc(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def escalar(valor, sangria=2):
    """Escalar YAML: corto en una línea, largo como bloque plegado `>-`."""
    if isinstance(valor, bool):
        return "true" if valor else "false"
    if isinstance(valor, int):
        return str(valor)
    s = " ".join(str(valor).split())
    if len(s) <= 72:
        return esc(s)
    pad = " " * sangria
    lineas = textwrap.wrap(s, width=76 - sangria, break_long_words=False)
    return ">-\n" + "\n".join(pad + l for l in lineas)


def campo(clave, valor, sangria=0):
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return ""
    pad = " " * sangria
    return f"{pad}{clave}: {escalar(valor, sangria + 2)}\n"


def lista(clave, valores, sangria=0):
    valores = [v for v in (valores or []) if str(v).strip()]
    pad = " " * sangria
    if not valores:
        return f"{pad}{clave}: []\n"
    cuerpo = "".join(f"{pad}  - {escalar(v, sangria + 4)}\n" for v in valores)
    return f"{pad}{clave}:\n{cuerpo}"


# --- Lectura del estado local ------------------------------------------------

CLAVES_GENERADAS = {
    "tipo", "slug", "nombre", "nombre_alt", "pronunciacion", "anio", "clase",
    "categorias", "clasificacion", "efecto", "manifestacion", "duracion",
    "movimiento", "contrahechizo", "relacionados", "teoria",
    "bloqueado", "aprendido",
}
SECCIONES_GENERADAS = {"Descripción", "Apuntes de clase"}

# Escalares que el script genera pero que la base deja vacíos a menudo
# (`efecto` en 121 de 142, `contrahechizo` en 118, `pronunciacion` en 50). Si
# la ficha local tiene un valor y la base no trae nada, gana el local: si no,
# rellenar uno a mano obligaría a bloquear la ficha entera y perderíamos las
# correcciones que la base sí haga en el resto de campos. Cuando la base trae
# el dato, manda la base.
CLAVES_RESCATABLES = {
    "nombre_alt", "pronunciacion", "clasificacion", "efecto",
    "manifestacion", "duracion", "movimiento", "contrahechizo",
}


def leer_local(ruta):
    """Estado local de una ficha existente.

    Todo lo que el script no genera —claves de frontmatter y secciones del
    cuerpo— se devuelve tal cual para conservarlo al regenerar.
    """
    vacio = {"bloqueado": False, "aprendido": True, "extra_fm": "", "extra_cuerpo": [],
             "propios": {}}
    if not ruta.is_file():
        return vacio
    texto = ruta.read_text(encoding="utf-8")
    # Se parte por una línea que sea exactamente "---".
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", texto, re.S)
    if not m:
        return vacio
    fm, cuerpo = m.group(1) + "\n", m.group(2)

    def flag(nombre, defecto):
        m = re.search(rf"^{nombre}:\s*(true|false)\s*$", fm, re.M)
        return (m.group(1) == "true") if m else defecto

    def recortar(lineas):
        """Quita del final las líneas en blanco y los comentarios.

        El generador escribe cada comentario justo encima de la clave que
        documenta, así que un comentario al final de un bloque pertenece a la
        clave siguiente, no a la actual. Sin esto se absorbía en la clave
        conservada y volvía a escribirse en cada importación: el comentario de
        `aprendido` se duplicaba una vez por pasada.
        """
        while lineas and re.match(r"^\s*(#.*)?$", lineas[-1]):
            lineas.pop()
        return lineas

    # Claves de primer nivel que el script no conoce: se conservan íntegras.
    # Las rescatables se guardan aparte, con su bloque YAML tal cual, para
    # reponerlas si la base viene vacía en ese campo.
    extra, propios, pendiente, clave = [], {}, [], None

    def cerrar(clave, pendiente):
        if not clave:
            return
        if clave not in CLAVES_GENERADAS:
            extra.extend(recortar(pendiente))
        elif clave in CLAVES_RESCATABLES:
            propios[clave] = "".join(recortar(pendiente))

    for linea in fm.splitlines(keepends=True):
        m = re.match(r"([A-Za-z_][A-Za-z0-9_]*):", linea)
        if m:
            cerrar(clave, pendiente)
            pendiente, clave = [linea], m.group(1)
        elif clave is None:
            continue
        else:
            pendiente.append(linea)
    cerrar(clave, pendiente)

    # Secciones del cuerpo que el script no genera.
    secciones = []
    for bloque in re.split(r"^## ", cuerpo, flags=re.M)[1:]:
        titulo = bloque.splitlines()[0].strip()
        if titulo not in SECCIONES_GENERADAS:
            secciones.append("## " + bloque.rstrip() + "\n")

    return {
        "bloqueado": flag("bloqueado", False),
        "aprendido": flag("aprendido", True),
        "extra_fm": "".join(extra).strip("\n"),
        "extra_cuerpo": secciones,
        "propios": propios,
    }


# --- Construcción de la ficha ------------------------------------------------

def limpiar(v):
    """Normaliza un valor del frontmatter. El cuerpo en Markdown no pasa por
    aquí: allí los `**` sí son negrita de verdad y se conservan."""
    if not isinstance(v, str):
        return None
    return limpiar_campo(v) or None


def construir(fila, categorias, relacionados, teoria, local):
    g = lambda k: limpiar(fila[k])
    propios = local.get("propios", {})

    def rescatable(clave, valor):
        """El valor de la base, o el que ya tuviera la ficha si la base calla."""
        return campo(clave, valor) if valor is not None else propios.get(clave, "")

    fm = "---\n"
    fm += 'tipo: "hechizo"\n'
    fm += campo("slug", slugify(fila["nombre"]))
    fm += campo("nombre", fila["nombre"])
    fm += rescatable("nombre_alt", g("nombre_alt"))
    fm += rescatable("pronunciacion", g("conjuro"))
    if fila["anio"] is not None:
        fm += f"anio: {fila['anio']}\n"
    fm += campo("clase", g("asignatura"))
    fm += lista("categorias", categorias)
    fm += rescatable("clasificacion", g("tipo"))
    fm += rescatable("efecto", g("efecto"))
    fm += rescatable("manifestacion", g("manifestacion"))
    fm += rescatable("duracion", g("duracion"))
    fm += rescatable("movimiento", g("movimiento"))
    fm += rescatable("contrahechizo", g("contrahechizo"))
    fm += lista("relacionados", relacionados)
    fm += lista("teoria", teoria)
    if local["extra_fm"]:
        fm += "\n" + local["extra_fm"] + "\n"
    fm += "\n# aprendido: false = Sora aún no lo domina.\n"
    fm += f"aprendido: {'true' if local['aprendido'] else 'false'}\n"
    fm += "# bloqueado: true = esta ficha tiene notas o correcciones propias;\n"
    fm += "# la skill no la sobrescribirá.\n"
    fm += f"bloqueado: {'true' if local['bloqueado'] else 'false'}\n"
    fm += "---\n"

    cuerpo = ""
    if g("descripcion"):
        cuerpo += "\n## Descripción\n\n" + "\n".join(
            textwrap.wrap(" ".join(fila["descripcion"].split()), width=80)) + "\n"
    if g("apuntes_texto"):
        cuerpo += "\n## Apuntes de clase\n\n" + "\n".join(
            textwrap.wrap(" ".join(fila["apuntes_texto"].split()), width=80)) + "\n"
        if g("apuntes_fecha"):
            cuerpo += f"\n*Apuntes del {fila['apuntes_fecha']}.*\n"
    if local["extra_cuerpo"]:
        cuerpo += "\n" + "\n".join(local["extra_cuerpo"])
    else:
        cuerpo += "\n## Notas\n\n<!-- Notas propias del proyecto. Se conservan al actualizar. -->\n"
    return fm + cuerpo


# --- Consultas ---------------------------------------------------------------

def buscar(con, termino):
    norm = " ".join(termino.lower().split())
    cur = con.execute("SELECT * FROM hechizos WHERE nombre_norm = ?", (norm,))
    filas = cur.fetchall()
    if not filas:
        filas = con.execute(
            "SELECT * FROM hechizos WHERE nombre_norm LIKE ? ORDER BY nombre",
            (f"%{norm}%",)).fetchall()
    return filas


def relaciones(con, hid, nombre):
    cats = [r[0] for r in con.execute(
        "SELECT categoria FROM categorias WHERE hechizo_id=? ORDER BY categoria", (hid,))]
    # La relación se lee en ambos sentidos: si A menciona a B, B también
    # está relacionado con A (AVIS MAXIMA cita a AVIS, y AVIS quiere saberlo).
    rel = sorted({slugify(r[0]) for r in con.execute(
        "SELECT d.nombre FROM referencias r JOIN hechizos d ON d.id=r.destino_id "
        "WHERE r.origen_id=? "
        "UNION "
        "SELECT o.nombre FROM referencias r JOIN hechizos o ON o.id=r.origen_id "
        "WHERE r.destino_id=?", (hid, hid))} - {slugify(nombre)})
    teo = [r[0] for r in con.execute(
        "SELECT DISTINCT asignatura_teoria FROM teoria_refs WHERE hechizo_id=?", (hid,))]
    return cats, rel, teo


def importar(con, fila, args):
    ruta = DESTINO / f"{slugify(fila['nombre'])}.md"
    local = leer_local(ruta)
    if local["bloqueado"] and not args.force:
        print(f"⊘ {fila['nombre']}: bloqueado, se conserva la versión local "
              f"({ruta.relative_to(RAIZ)})")
        return "bloqueado"
    cats, rel, teo = relaciones(con, fila["id"], fila["nombre"])
    contenido = construir(fila, cats, rel, teo, local)
    if args.dry_run:
        print(f"--- {ruta.relative_to(RAIZ)} (dry-run) ---\n{contenido}")
        return "dry-run"
    accion = "actualizado" if ruta.is_file() else "creado"
    if ruta.is_file() and ruta.read_text(encoding="utf-8") == contenido:
        print(f"= {fila['nombre']}: sin cambios")
        return "igual"
    DESTINO.mkdir(parents=True, exist_ok=True)
    ruta.write_text(contenido, encoding="utf-8")
    aviso = " (forzado sobre bloqueado)" if local["bloqueado"] else ""
    print(f"✔ {fila['nombre']}: {accion}{aviso} → {ruta.relative_to(RAIZ)}")
    return accion


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("nombre", nargs="*", help="Nombre del hechizo")
    p.add_argument("--buscar", metavar="TEXTO", help="Solo busca, no escribe")
    p.add_argument("--todos", action="store_true", help="Importa todos los de la base")
    p.add_argument("--force", action="store_true", help="Actualiza aunque esté bloqueado")
    p.add_argument("--dry-run", action="store_true", help="Muestra sin escribir")
    p.add_argument("--db", help="Ruta a hechizos.db")
    args = p.parse_args()

    db = ruta_db(args.db)
    if not db.is_file():
        sys.exit(f"✘ No encuentro la base: {db}\n"
                 f"  Indícala con --db o con HECHIZOS_DB en .env")
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row

    if args.buscar:
        filas = buscar(con, args.buscar)
        if not filas:
            sys.exit(f"Sin resultados para «{args.buscar}».")
        for f in filas:
            local = DESTINO / f"{slugify(f['nombre'])}.md"
            marca = ""
            if local.is_file():
                marca = " [bloqueado]" if leer_local(local)["bloqueado"] else " [importado]"
            print(f"{f['nombre']:<28} {f['asignatura']:<18} año {f['anio']}{marca}")
        return

    if args.todos:
        filas = con.execute("SELECT * FROM hechizos ORDER BY nombre").fetchall()
    elif args.nombre:
        termino = " ".join(args.nombre)
        filas = buscar(con, termino)
        if not filas:
            sys.exit(f"✘ No encuentro «{termino}». Prueba: --buscar {termino}")
        if len(filas) > 1:
            print(f"«{termino}» coincide con {len(filas)} hechizos:")
            for f in filas:
                print(f"  · {f['nombre']}")
            sys.exit("Concreta el nombre.")
    else:
        p.print_help()
        return

    resumen = {}
    for f in filas:
        r = importar(con, f, args)
        resumen[r] = resumen.get(r, 0) + 1
    if len(filas) > 1:
        print("\n" + ", ".join(f"{v} {k}" for k, v in sorted(resumen.items())))


if __name__ == "__main__":
    main()
