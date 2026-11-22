"""Extract the regional Hours and Commons from the downloaded documents."""

import argparse
import html
import json
import re
from pathlib import Path
from zipfile import ZipFile


def plain(markup, verse=False):
    markup = re.sub(r"\s*<br\b[^>]*>\s*", "\n" if verse else " ", markup, flags=re.I)
    markup = html.unescape(re.sub(r"<[^>]+>", "", markup)).replace("\xa0", " ")
    return "\n".join(" ".join(line.split()) for line in markup.split("\n")).strip()


def between(markup, start, end=None):
    anchor = markup.index(f'id="{start}"')
    start_tag = markup.rfind("<p", 0, anchor)
    if end is None:
        end_tag = len(markup)
    else:
        next_anchor = markup.index(f'id="{end}"', anchor + 1)
        end_tag = markup.rfind("<p", 0, next_anchor)
    return markup[max(start_tag, 0):end_tag]


headings = re.compile(
    r"^(HIMNO|SALMODIA|LECTURA BREVE(?: .*)?|RESPONSORIO(?: BREVE)?(?: .*\d.*)?|"
    r"PRIMERA LECTURA|SEGUNDA LECTURA|CÁNTICO EVANGÉLICO|PRECES|ORACIÓN:?|OREMOS:|TE DEUM)$", re.I
)


def sections(markup, psalms=None, collection=None):
    out = []
    title = None
    body = []

    def flush():
        if body:
            text = "\n\n".join(body)
            if title is None:
                out.append(dict(text=text))
            else:
                out.append(dict(title=title, text=text))

    def add_title(value):
        nonlocal title, body
        flush()
        title, body = value, []

    paragraphs = re.findall(r"<p\b[^>]*>(.*?)</p>", markup, re.S | re.I)
    for raw in paragraphs:
        text = plain(raw, True)
        folded = " ".join(text.split())
        if not folded or re.fullmatch(r"[>\s]+|(?:I |II )?VÍSPERAS|LAUDES|OFICIO DE LECTURA|HORA INTERMEDIA", folded, re.I):
            continue
        if headings.fullmatch(folded):
            title_text = folded.capitalize()
            if folded.upper().startswith("LECTURA BREVE "):
                title_text = "Lectura breve · " + folded[len("LECTURA BREVE "):]
            elif folded.casefold().startswith("responsorio ") and folded.casefold() != "responsorio breve":
                title_text = "Responsorio · " + folded[len("Responsorio "):]
            add_title(title_text.rstrip(":"))
        elif folded in ("Magnificat", "Benedictus", "Te Deum", "A elección"):
            if folded != "A elección":
                body.append("@" + folded)
        elif "Salmo 62 - Daniel 3 - Salmo 149" in folded and psalms:
            if body:
                add_title("Salmodia")
            else:
                title = "Salmodia"
            body.append("@DomingoI")
        elif folded.startswith("Los salmos se toman del Común") and collection:
            body.append("@" + collection)
        elif folded.startswith(("La oración como en las Laudes", "Oremos:")) and title != "Oración":
            add_title("Oración")
            body.append(folded.split(":", 1)[1].strip() if folded.startswith("Oremos:") else "@Oracion")
        else:
            body.append(text)
    flush()
    return out


def office_file(book, name):
    return book.read(f"OEBPS/Text/{name}.html").decode()


def common(book, filename, anchors, collect):
    markup = office_file(book, filename)
    ids = list(anchors.values())
    offices = {
        hour: sections(between(markup, anchor, ids[index + 1] if index + 1 < len(ids) else None), psalms=True)
        for index, (hour, anchor) in enumerate(anchors.items())
    }
    offices["oracion"] = collect
    return offices


def collect_from_mass(source):
    paragraphs = [plain(part) for part in re.findall(r"<p\b[^>]*>(.*?)</p>", source, re.S | re.I)]
    paragraphs = [p for p in paragraphs if p]
    index = paragraphs.index("ORACIÓN COLECTA")
    prayer = paragraphs[index + 1]
    if len(prayer) < 60:
        raise ValueError("Falta la oración colecta")
    return prayer


def hurtado_office(source):
    # Spanish original in the Fundación Padre Alberto Hurtado. The Catalan
    # Jesuit proper (2016, pp. 138–140) establishes the selected passages.
    paragraphs = [plain(p) for p in re.findall(r"<p\b[^>]*>(.*?)</p>", source, re.S | re.I)]
    starts = (
        "Usted me pregunta cómo se equilibra",
        "¡Oh bendita vida activa",
        "Las horas negras vienen también",
        "No hay más que resignarse",
        "¡Ah, y cómo he comprendido su bondad",
        "En Dios me siento lleno de una esperanza",
    )
    selected = [next(p.lstrip("“") for p in paragraphs if p.lstrip("“").startswith(start)) for start in starts]
    before_gap, _, _ = selected[4].partition(" En mi trabajo")
    after_gap, end, _ = selected[5].partition("Me ama.")
    if before_gap == selected[4] or not end:
        raise ValueError("No se encontraron los límites de la segunda lectura de san Alberto")
    selected[4] = before_gap
    selected[5] = after_gap + end
    refrain = "Ya no vivo yo, sino que Cristo vive en mí."
    return [
        dict(title="Segunda lectura", text="De los escritos de san Alberto Hurtado\n\n"
             "Tranquilidad solo en Dios\n\n" + "\n\n".join(selected)),
        dict(title="Responsorio · Gál 2, 20; Is 61, 1", text="\n".join((
            "$℟. $La vida que sigo viviendo en la carne, la vivo en la fe en el Hijo de Dios, que me amó y se entregó por mí.",
            refrain,
            "$℣. $El Espíritu del Señor está sobre mí, porque el Señor me ha ungido. "
            "Él me envió a llevar la buena noticia a los pobres, a vendar los corazones heridos.",
            "$℟. $" + refrain,
        ))),
    ]


def laura_office(source):
    reading, response = source.split("SEGUNDA LECTURA\n", 1)[1].split("\nRESPONSORIO ", 1)
    title = "Mi mejor oración es hacer la voluntad de Dios"
    citation, body = reading.split(title, 1)
    citation = " ".join(citation.split()).replace("Congregado", "Congregatio").replace("{...]", "[…]")
    paragraphs = re.split(r"\n(?=(?:En todo|Con esta|«))", body.strip().replace("\f", ""))
    lines = response.split("\nLa oración", 1)[0].splitlines()
    reference, refrain, verse = lines
    reference = re.sub(r",(?=\d)", ", ", reference)
    return [
        dict(title="Segunda lectura", text="\n\n".join((citation, title, *(" ".join(p.split()) for p in paragraphs)))),
        dict(title=f"Responsorio · {reference}", text=f"$℟. ${refrain[3:]}\n$℣. ${verse[3:]}"),
    ]


def ceferino_from_letter(source):
    # Match the excerpts in the SDB office to the original letter of 3 October 1904.
    paragraphs = [" ".join(plain(p).split()) for p in re.findall(r"<p\b[^>]*>(.*?)</p>", source, re.S | re.I)]
    start = next(i for i, p in enumerate(paragraphs) if p.startswith("El 27 del pasado setiembre"))
    continuation = next(p for p in paragraphs if p.startswith("Continuando a lo de antes"))
    before_gap, rest = paragraphs[start + 8].split(" Creerá quizá", 1)
    _, church_plan = rest.split("Dada S. S. la bendición", 1)
    parish = ("Dada S. S. la bendición" + church_plan + " " + paragraphs[start + 9]).split(" que S. S. I. Mons.", 1)[0]
    farewell, medal = continuation.split("para despedirnos.", 1)
    _, medal = medal.split("Y después afuera todos.", 1)
    refrain = "Proclamaré por siempre sus maravillas."
    return {
        "oficio": [
            dict(title="Segunda lectura", text="\n\n".join((
                "De la carta del beato Ceferino Namuncurá al provicario apostólico de la Patagonia",
                "Milán, 3 de octubre de 1904",
                *paragraphs[start:start + 8],
                before_gap, "[…] " + parish + ".",
                "[…] " + farewell + "para despedirnos.", "[…] Y después afuera todos." + medal,
            ))),
            dict(title="Responsorio · Cf. Sal 70, 17; 74, 2; 88, 1; Is 49, 2", text="\n".join((
                "$℟. $Dios me ha instruido desde mi juventud.\n" + refrain,
                "$℣. $Me protegió a la sombra de su mano.", "$℟. $" + refrain,
            ))),
        ],
        "oficioFuente": "el Propio salesiano, con la carta original en español",
        "oracion": "Oh Dios, Padre nuestro, que en el beato Ceferino Namuncurá das a los jóvenes un luminoso ejemplo de santidad "
                   "florecida en tierra patagónica, concédenos, por su intercesión, colaborar en la difusión de tu reino "
                   "realizando con paciencia y amor las tareas de cada día. Por nuestro Señor Jesucristo, tu Hijo, "
                   "que vive y reina contigo en la unidad del Espíritu Santo y es Dios por los siglos de los siglos.",
    }


def carmen_from_fascicle(source):
    lines = []
    for line in source.splitlines():
        text = line.strip()
        if text and text != "Julio" and not text.isdecimal():
            lines.append(text)
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", "\n".join(lines))

    def section(start, end):
        return text.split(start, 1)[1].split(end, 1)[0].strip()

    def prose(value):
        return " ".join(value.split())

    def antiphons(value):
        return [prose(item.split("\nSalmo", 1)[0].split("\nCántico (", 1)[0])
                for item in re.split(r"ANT\. [123]\. ", value)[1:]]

    first = section("\nI Vísperas\n", "\nOFICIO DE LECTURAS\n")
    lauds = section("\nORACION DE LA MAÑANA\n", "\nORACION DEL MEDIODIA\n")
    midday = section("\nORACION DEL MEDIODIA\n", "\nORACION DE LA TARDE\n")
    second = section("\nORACION DE LA TARDE\n", "\n21 DE JULIO")
    second_canticle = second.split("\nANT. Me gozaré", 1)[1].split("\nIntercesión", 1)[0]
    hymn = lauds.split("Himno\n", 1)[1].split("Salmodia del", 1)[0].strip()
    response = re.split(r"\n(?:y|\$) ", section("\nResponsorio\n", "\nCántico evangélico\n"))
    midday_antiphon, midday_versicle = midday.removeprefix("ANT. ").split("\ny ", 1)
    midday_versicle, midday_response = midday_versicle.split("\n", 1)

    def canticle(value):
        return prose(re.split(r"\nIntercesión|\nOración", value.split("Cántico evangélico\nANT. ", 1)[-1], maxsplit=1)[0])

    def intercessions(value):
        part = value.split("Intercesión\n", 1)[1].split("(Intenciones", 1)[0]
        part = re.sub(r"\s+[R^]$", "", part, flags=re.M)
        return prose(part).replace(" — ", "\n— ")

    return {
        "invitatorio": prose(section("\nInvitatorio\n", "\nHimno, Antífonas y Salmos")),
        "primeras": [
            dict(title="Antífonas de la salmodia", text="\n\n".join(antiphons(first))),
            dict(title="Lectura breve · Eclo 24, 22-23", text=prose(first.split("(Eclesiástico 24,22-23)", 1)[1].split("Responsorio", 1)[0])),
            dict(title="Responsorio breve", text="\n".join(
                f"${label}. ${prose(line)}" for label, line in zip(("℣", "℟", "℣", "℟"), response, strict=True)
            )),
            dict(title="Cántico evangélico", text=canticle(first)),
            dict(title="Preces", text=intercessions(first)),
        ],
        "laudes": [
            dict(title="Himno", text=hymn),
            dict(title="Antífonas de la salmodia", text="\n\n".join(antiphons(lauds.split("Palabra de Dios", 1)[0]))),
            dict(title="Lectura breve · Ct 2, 10-14", text=prose(lauds.split("(Cant. 2,10-14)", 1)[1].split("Cántico evangélico", 1)[0])),
            dict(title="Cántico evangélico", text=canticle(lauds)),
            dict(title="Preces", text=intercessions(lauds)),
        ],
        "sexta": [
            dict(title="Antífona de la salmodia", text=prose(midday_antiphon)),
            dict(title="Versículo", text=f"$℣. ${midday_versicle}\n$℟. ${midday_response}"),
        ],
        "visperas": [
            dict(title="Himno", text=hymn),
            dict(title="Antífonas de la salmodia", text="\n\n".join(antiphons(second.split("Palabra de Dios", 1)[0]))),
            dict(title="Lectura breve · Ap 21, 1-3", text=prose(second.split("(Apoc. 21.13)", 1)[1].split("Cántico evangé", 1)[0])),
            dict(title="Cántico evangélico", text=prose("Me gozaré" + second_canticle)),
            dict(title="Preces", text=intercessions(first)),
        ],
    }


def january_ferias(book):
    result = {}
    for day, start in ((6, 2), (7, 6)):
        def markup(offset):
            return book.read(f"OEBPS/Text/Section{start + offset:04}.xhtml").decode()

        office = markup(0)
        office = office[office.index('id="filepos512452"'):]
        result[f"enero{day}"] = {
            "oficio": sections(office),
            "laudes": sections(markup(1)),
            "intermedia": sections(markup(2)),
        }
        if day == 6:
            result[f"enero{day}"]["visperas"] = sections(markup(3))
    return result


def january_psalter(book):
    result = {}
    for weekday, start in (("viernes", 131), ("sabado", 135)):
        result[weekday] = {}
        for index, hour in enumerate(("oficio", "laudes", "intermedia", "visperas")):
            if weekday == "sabado" and hour == "visperas":
                continue
            markup = office_file(book, f"index_split_{start + index:03}")
            paragraphs = [plain(p, True) for p in re.findall(r"<p\b[^>]*>(.*?)</p>", markup, re.S)]
            paragraphs = [p for p in paragraphs if p]
            if hour == "intermedia":
                paragraphs = paragraphs[1:]
            else:
                paragraphs = paragraphs[paragraphs.index("SALMODIA") + 1:]
            result[weekday][hour] = "\n\n".join(paragraphs)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    def read(name):
        return (args.sources / name).read_text(encoding="utf-8")

    with ZipFile(args.sources / "horas-santoral.epub") as book:
        virgins = common(book, "index_split_033", {
            "oficio": "filepos2682265", "laudes": "filepos2698480",
            "intermedia": "filepos2705429", "visperas": "filepos2707724",
        }, "")
        pastors = common(book, "index_split_031", {
            "oficio": "filepos2578529", "laudes": "filepos2610819",
            "intermedia": "filepos2619019", "visperas": "filepos2620864",
        }, "")
        mary = common(book, "index_split_028", {
            "primeras": "filepos2316959", "oficio": "filepos2332860", "laudes": "filepos2362173",
            "intermedia": "filepos2372790", "visperas": "filepos2375294",
        }, "")
        complement_markup = office_file(book, "Section0001")
        complement_anchors = ("filepos2245048", "filepos2248796", "filepos2252524")
        complement = {
            hour: "\n\n".join(filter(None, (plain(p, True) for p in re.findall(
                r"<p\b[^>]*>(.*?)</p>", between(complement_markup, anchor,
                complement_anchors[index + 1] if index < 2 else None), re.S))))
            for index, (hour, anchor) in enumerate(zip(("tercia", "sexta", "nona"), complement_anchors))
        }
        guadalupe = office_file(book, "Diciembre").split('id="sigil_toc_id_207"', 1)[0]
        guadalupe_anchors = ("filepos2155848", "filepos2172849", "filepos2178564", "filepos2181445")
        guadalupe = {
            hour: sections(between(guadalupe, anchor, guadalupe_anchors[index + 1] if index < 3 else None),
                           psalms=True, collection="ComúnMaría")
            for index, (hour, anchor) in enumerate(zip(("oficio", "laudes", "intermedia", "visperas"), guadalupe_anchors))
        }
        rose = office_file(book, "index_split_020")
        rose = rose.split('id="sigil_toc_id_142"', 1)[1]
        rose = re.split(r'id="sigil_toc_id_\d+"', rose, maxsplit=1)[0]
        rose_office = sections(rose.split('id="filepos1455958"', 1)[0], collection="ComúnVírgenes")
        rose_lauds = sections(between(rose, "filepos1455958", "filepos1458147"))
        rose_vespers = sections(between(rose, "filepos1458147"))
        laura = office_file(book, "Section0004")
        laura = plain(re.search(r"Oración\s*</[^>]+>.*?</p>\s*<p\b[^>]*>(.*?)</p>",
                                laura.split('id="sigil_toc_id_8"', 1)[1], flags=re.S)[1])
        carmen = office_file(book, "Julio").split('id="sigil_toc_id_105"', 1)[1]
        carmen = re.split(r'id="sigil_toc_id_\d+"', carmen, maxsplit=1)[0]
        carmen_office = sections(carmen, collection="ComúnMaría")

    teresa_paragraphs = [plain(p, True) for p in re.findall(r"<p\b[^>]*>(.*?)(?=<p\b|</body>)", read("teresa-horas.html"), re.S | re.I)]
    teresa_paragraphs = [p for p in teresa_paragraphs if p]
    begin = teresa_paragraphs.index("Segunda lectura")
    end = next(i for i, text in enumerate(teresa_paragraphs) if text.startswith("Responsorio ("))
    teresa = [
        dict(title="Segunda lectura", text="\n\n".join(teresa_paragraphs[begin + 1:end]).replace("Hombre?Dios", "Hombre-Dios")),
        dict(title=teresa_paragraphs[end], text=teresa_paragraphs[end + 1]),
    ]
    carmen = carmen_from_fascicle(read("horas-carmen-bcn.txt"))
    with ZipFile(args.sources / "horas-navidad.epub") as book:
        ferias = january_ferias(book)
        psalter = january_psalter(book)
    out = dict(virgenes=virgins, pastores=pastors, maria=mary, complementaria=complement,
               guadalupe=guadalupe, rosa=dict(oficio=rose_office, laudes=rose_lauds, visperas=rose_vespers),
               carmen=dict(**carmen, oficio=carmen_office, oracion=collect_from_mass(read("carmen-chile.html"))),
               teresa=dict(oficio=teresa, oracion=collect_from_mass(read("teresa-andes.html"))),
               alberto=dict(oficio=hurtado_office(read("hurtado-testimonio.html")),
                            oficioFuente="el Propio de la Compañía de Jesús, con el original español",
                            oracion=collect_from_mass(read("hurtado-misa.html"))),
               laura=dict(oficio=laura_office(read("laura-oficio-salesiano.txt")), oficioFuente="el Propio salesiano", oracion=laura),
               ceferino=ceferino_from_letter(read("ceferino-carta.html")),
               salterioNavidad=psalter, **ferias)
    for key in ("guadalupe", "rosa", "carmen", "teresa", "alberto", "laura", "ceferino"):
        if not any("Segunda lectura" == section.get("title") for section in out[key]["oficio"]):
            raise ValueError(f"Falta la segunda lectura de {key}")
    args.output.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
