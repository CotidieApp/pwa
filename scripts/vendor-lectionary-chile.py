"""Build the local Lectionary from downloaded source files. No network access."""

import argparse
import gzip
import html
import json
import re
from pathlib import Path


def plain(markup, preserve_breaks=False):
    if preserve_breaks:
        markup = re.sub(r"<br\s*/?>", "\n", markup, flags=re.I)
    cleaned = html.unescape(re.sub(r"<[^>]+>", "", markup)).replace("\u00ad", "")
    if preserve_breaks:
        return "\n".join(re.sub(r"[^\S\n]+", " ", line).strip() for line in cleaned.split("\n")).strip()
    return " ".join(cleaned.split())


def passage(body, citation=None, heading=None, incipit=None):
    if not body or len(body) < 20:
        raise ValueError(f"Lectura sin texto en {citation}")
    return {key: val for key, val in zip(("h", "c", "i", "x"), (heading, citation, incipit, body)) if val}


def part(role, *passages):
    return {"s": role, "o": list(passages)}


def liturgical_sections(source):
    start = source.index('name="liturgia"')
    end = re.search(r'name="liturgia_eucaristica"|LITURGIA EUCAR', source[start:], re.I)
    paragraphs = [plain(p, True) for p in re.findall(r"<p\b[^>]*>(.*?)</p>", source[start:start + end.start()], re.S | re.I)]
    paragraphs = [re.sub(r"(?<!\n)\n(?!\n)", " ", p).strip() for p in paragraphs if p.strip()]
    readings = []
    pending = None
    for index, paragraph in enumerate(paragraphs):
        if re.match(r"(?:\+\s*)?(?:Lectura de|Evangelio de nuestro Señor)", paragraph, re.I):
            if pending:
                raise ValueError(f"Falta final de lectura antes de {paragraph}")
            match = re.match(r"^(.*?)(\d+,.*)$", paragraph)
            heading, reference = match.groups() if match else (paragraph, paragraphs[index + 1])
            pending = {"heading": heading.strip(), "reference": reference.rstrip(". "), "start": index + (1 if match else 2)}
        elif pending and re.match(r"^Palabra (?:de Dios|del Señor)", paragraph, re.I):
            readings.append(passage("\n\n".join(paragraphs[pending["start"]:index + 1]),
                                    pending["reference"], pending["heading"]))
            pending = None
    psalm_start = next(i for i, p in enumerate(paragraphs) if p.upper().startswith("SALMO RESPONSORIAL"))
    psalm_end = next(i for i in range(psalm_start + 1, len(paragraphs))
                     if re.match(r"^ACLAMACI[ÓO]N|^SEGUNDA LECTURA|^Íntimamente unidos", paragraphs[i], re.I))
    psalm_ref = re.sub(r"^SALMO RESPONSORIAL\s*(?:Sal\.?\s*)?", "", paragraphs[psalm_start], flags=re.I)
    psalm = passage("\n\n".join(paragraphs[psalm_start + 1:psalm_end]), "Sal " + psalm_ref.rstrip(".) "))
    acclamation = next(passage(paragraphs[i + 1]) for i, p in enumerate(paragraphs) if p.upper().startswith("ACLAMACIÓN"))
    if len(readings) < 2 or pending:
        raise ValueError("No se encontraron las lecturas esperadas")
    return readings[:-1], psalm, acclamation, readings[-1]


def bible_verses(source):
    result = {}
    verse = None
    paragraphs = re.findall(r"<p\b[^>]*>(.*?)</p>", source, re.S | re.I)
    for paragraph in paragraphs:
        text = plain(paragraph)
        marker = re.match(r"^(\d+)\s+(.*)$", text)
        if marker:
            verse = int(marker[1])
            result[verse] = marker[2]
        elif text and verse is not None:
            result[verse] += "\n" + text
    return result


def responsorial(verses, citation, refrain, groups, skip_title=False):
    strophes = []
    for group in groups:
        lines = [verses[index] for index in group]
        if skip_title and group[0] == 1:
            lines[0] = lines[0].split("\n", 1)[1]
        strophes.append("\n".join(lines) + "\nR.")
    return passage("\n\n".join([f"R. {refrain}", *strophes]), citation)


def january_six(source):
    source = source.split('name="DÍA_6_DE_ENERO"', 1)[1].split('name="DÍA_7_DE_ENERO"', 1)[0]
    source = plain(source, True)
    # Newlines in the source HTML also wrap prose. Rejoin those lines only.
    source = re.sub(r"(?<=[a-záéíóúñ,;])\n(?=[a-záéíóúñ])", " ", source, flags=re.I)
    first = re.search(r"Lectura de la primera carta del apóstol san Juan\s+5, 5-13\s+(.*?)\s+SALMO", source, re.S)
    psalm = re.search(r"SALMO\s+147, 12-15\. 19-20\s+(.*?)\s+ALELUIA\s+Cf\.", source, re.S)
    gospel = re.search(r"según san Marcos\s+1, 6b-11\s+(.*?Palabra del Señor\.)", source, re.S)
    if not all((first, psalm, gospel)):
        raise ValueError("No se encontró el formulario ferial del 6 de enero")
    return [
        part("L1", passage(first[1], "5, 5-13", "Lectura de la primera carta del apóstol san Juan")),
        part("SAL", passage(psalm[1], "Sal 147, 12-15. 19-20")),
        part("EV", passage(gospel[1], "1, 6b-11", "Evangelio según san Marcos")),
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sources", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    def read(name):
        return (args.sources / name).read_text(encoding="utf-8")

    raw = re.search(r'<script id="dat" type="application/json">([\s\S]*?)</script>', read("leccionario-completo.html"))
    if not raw:
        raise ValueError("El Leccionario no trae el índice JSON esperado")
    data = {}
    for entry in json.loads(raw[1])["e"]:
        form = {key: entry[key] for key in ("id", "lb", "y") if key in entry}
        form["p"] = [
            part(section["s"], *(passage(
                re.sub(r"‹/?[a-z]+›", "", option["x"], flags=re.I).strip(),
                option.get("c"), option.get("h"), option.get("i"),
            ) for option in section["o"] if option.get("x", "").strip()))
            for section in entry["p"]
        ]
        for key in entry["k"]:
            data.setdefault(key, []).append(form)

    def add(key, sections, label=None):
        form = {"id": key, "p": sections}
        if label:
            form["lb"] = label
        data[key] = [form]

    for name, key in {
        "santa-cruz": "chile:santa-cruz",
        "sumo-sacerdote": "chile:sumo-sacerdote",
        "teresa-andes": "chile:teresa-andes",
        "carmen-chile": "chile:carmen",
    }.items():
        readings, psalm, acclamation, gospel = liturgical_sections(read(name + ".html"))
        if name == "carmen-chile":
            psalm = responsorial(bible_verses(read("biblia-salmo130.html")), "Sal 129, 1-8",
                                 "En el Señor se encuentra la misericordia.",
                                 [(1, 2), (3, 4), (5, 6), (7, 8)], True)
        separate_second = name in ("santa-cruz", "carmen-chile")
        sections = [part("L1", *readings[:1] if separate_second else readings), part("SAL", psalm)]
        if separate_second:
            sections.append(part("L2", *readings[1:]))
        add(key, [*sections, part("ACL", acclamation), part("EV", gospel)])

    add("chile:enero-6", january_six(read("enero-6-feria.html")))

    # The older digital form uses the readings of the votive Mass. Replace its
    # psalm and Gospel with the provisions for the obligatory universal memorial.
    votive = data["madre-iglesia"][0]["p"]
    psalm = responsorial(bible_verses(read("biblia-salmo87.html")), "Sal 86, 1-2. 3 y 5. 6-7",
                         "Cosas admirables se dicen de ti, Ciudad de Dios.", [(1, 2), (3, 5), (6, 7)], True)
    verses = bible_verses(read("biblia-juan19.html"))
    gospel = passage("\n\n".join(verses[verse] for verse in range(25, 35)) + "\n\nPalabra del Señor.",
                      "19, 25-34", "Evangelio de nuestro Señor Jesucristo según san Juan")
    add("chile:madre-iglesia", [votive[0], part("SAL", psalm), part("EV", gospel)])

    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    args.output.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))
    print(f"{len(data)} entradas. {len(payload):,} bytes antes de comprimir.")


if __name__ == "__main__":
    main()
