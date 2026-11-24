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


def passage(body, citation=None, heading=None, cycle=None):
    if not body or len(body) < 20:
        raise ValueError(f"Lectura sin texto en {citation}")
    return {key: val for key, val in zip(("h", "c", "y", "x"), (heading, citation, cycle, body)) if val}


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
    acclamation_start = next(i + 1 for i, p in enumerate(paragraphs) if p.upper().startswith("ACLAMACIÓN"))
    acclamation_ref = paragraphs[acclamation_start]
    if re.match(r"^Cf\.\s+\w+\s+\d", acclamation_ref):
        acclamation = passage(paragraphs[acclamation_start + 1], acclamation_ref)
    else:
        acclamation = passage(acclamation_ref)
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


def replace_text(body, original, replacement):
    if body.count(original) != 1:
        raise ValueError(f"No se encontró exactamente una vez el texto por sustituir: {original}")
    return body.replace(original, replacement, 1)


def section_for(form, role):
    return next(section for section in form["p"] if section["s"] == role)


def correct_ordinary_weekdays(data, week_twenty_thursday_source):
    # Ordo 2027, Tiempo Ordinario II: the odd-year source accidentally
    # duplicates the readings from the Thursday of week twenty-two.
    readings, psalm, acclamation, gospel = liturgical_sections(week_twenty_thursday_source)
    readings[0]["x"] = replace_text(readings[0]["x"], "puedoretractarme", "puedo retractarme")
    gospel["x"] = replace_text(gospel["x"], "eltraje", "el traje")
    gospel["x"] = replace_text(gospel["x"], "manos,y", "manos, y")
    thursday = next(form for form in data["dda:fer:20:4"] if form["id"] == "dda:fer:20:4.I")
    thursday["p"] = [part("L1", *readings), part("SAL", psalm), part("ACL", acclamation), part("EV", gospel)]

    week_twenty_two = next(form for form in data["dda:fer:22:4"] if form["id"] == "dda:fer:22:4.I")
    section_for(week_twenty_two, "L1")["o"][0]["c"] = "1, 9-14"

    # The Chilean Ordos for both weekday cycles give the same Gospel on these days.
    for week_day in ("3:6", "8:5", "10:1", "20:3", "23:4", "23:5", "31:1", "31:2", "34:2", "34:3"):
        key = "dda:fer:" + week_day
        odd = next(form for form in data[key] if form["id"] == key + ".I")
        even = next(form for form in data[key] if form["id"] == key + ".II")
        section_for(even, "EV")["o"] = section_for(odd, "EV")["o"]

    # Ordo 2025 and 2026 include Mark 8:13 in the Tuesday of week six.
    # Book of the People of God: https://www.vatican.va/archive/ESL0506/_PVA.HTM
    odd, even = data["dda:fer:6:2"]
    gospel = section_for(even, "EV")["o"][0]
    gospel = passage("Jesús volvió a embarcarse hacia la otra orilla del lago.\n\n" + gospel["x"],
                     "8, 13-21", gospel["h"])
    for form in (odd, even):
        section_for(form, "EV")["o"] = [gospel]

    # The Monday of week eighteen has an alternate Gospel if the preceding
    # Sunday used Matthew's account of the feeding of the five thousand.
    odd, even = data["dda:fer:18:1"]
    section_for(odd, "EV")["o"] = section_for(even, "EV")["o"]

    # Ordo 2026, Tiempo Ordinario II, and Eucaristía Diaria on September 5 and 19.
    saturday = section_for(data["dda:fer:22:6"][1], "L1")["o"][0]
    saturday["c"] = "4, 6b-16"
    saturday["x"] = replace_text(saturday["x"], "\n\nPalabra de Dios.",
                                 " Les ruego, por lo tanto, que sigan mi ejemplo.\n\nPalabra de Dios.")
    saturday = section_for(data["dda:fer:24:6"][1], "L1")["o"][0]
    saturday["c"] = "15, 35-38. 42-49"
    saturday["x"] = replace_text(saturday["x"], "\n\nLo mismo pasa con la resurrección",
                                 " Y Dios da a cada semilla la forma que Él quiere, a cada clase de semilla el cuerpo que le corresponde.\n\nLo mismo pasa con la resurrección")


def correct_fixed_passages(data):
    # The Saturday of Advent I ends at Is 30:26. The source already ends there.
    section_for(data["adv:fer:1:6"][0], "L1")["o"][0]["c"] = "30, 19-21. 23-26"
    gospel = section_for(data["adv:fer:1:6"][0], "EV")["o"][0]
    gospel["x"] = replace_text(gospel["x"], "en las sinagogas,", "en las sinagogas de ellos,")
    sunday = next(form for form in data["adv:dom:1"] if form["y"] == "C")
    section_for(sunday, "SAL")["o"][0]["c"] = "Sal 24, 4-5a. 8-10. 14"
    sunday = next(form for form in data["adv:dom:3"] if form["y"] == "C")
    gospel = section_for(sunday, "EV")["o"][0]
    gospel["x"] = replace_text(gospel["x"], "tomó la palabra y les dijo:", "tomó la palabra y les dijo a todos:")
    gospel = section_for(data["nav:01-10"][0], "EV")["o"][0]
    gospel["x"] = replace_text(gospel["x"], "Enseñaba en las sinagogas y", "Enseñaba en las sinagogas de ellos y")
    sunday = next(form for form in data["dda:dom:4"] if form["y"] == "A")
    section_for(data["md:11-01"][0], "EV")["o"] = section_for(sunday, "EV")["o"]
    # The proclamation already includes the liturgical incipit of verse 1.
    section_for(data["md:06-28v"][0], "EV")["o"][0]["c"] = "21, 1. 15-19"
    # The next paragraph after Mary's report contains verse 3.
    section_for(data["md:07-22"][0], "EV")["o"][0]["c"] = "20, 1-3. 11-18"
    # The text ends with the encounter, the first part of Cant 3:4.
    section_for(data["md:07-22"][0], "L1")["o"][0]["c"] = "3, 1-4a"
    section_for(data["md:08-21"][0], "SAL")["o"][0]["c"] = "Sal 88, 2-5. 21-22. 25. 27"
    section_for(data["md:08-21"][0], "EV")["o"][0]["c"] = "21, 1. 15-17"
    section_for(data["md:09-30"][0], "SAL")["o"][0]["c"] = "Sal 118, 9-14"
    section_for(data["md:05-01"][0], "EV")["o"][0]["c"] = "13, 54-58"


def correct_chilean_weekday_texts(data, corinthians_source):
    # The Ordo 2026 and Eucaristía Diaria agree on these verse selections.
    def edit(week_day, role, citation, *replacements):
        option = section_for(data["dda:fer:" + week_day][1], role)["o"][0]
        option["c"] = citation
        for before, after in replacements:
            option["x"] = replace_text(option["x"], before, after)
        return option

    david = edit("3:6", "L1", "12, 1-7a. 10-15a")
    david["x"] = david["x"].split("\n\nEl Señor hirió al niño", 1)[0] + "\n\nPalabra de Dios."
    edit("9:6", "SAL", "Sal 70, 8-9. 14-15b. 16-17. 22",
         ("y hasta hoy he narrado tus maravillas. R.",
          "y hasta hoy he narrado tus maravillas. R.\n\nEntonces te daré gracias con el arpa,\npor tu fidelidad, Dios mío;\nTe cantaré con la cítara,\na ti, el Santo de Israel. R."))
    edit("10:3", "SAL", "Sal 15, 1-2a. 5. 8. 11",
         ("\n\nMultiplican sus ídolos y corren tras ellos,\npero yo no les ofreceré libaciones de sangre,\nni mis labios pronunciarán sus nombres. R.", ""))
    edit("11:6", "SAL", "Sal 88, 4-5. 29-35",
         ("ni desmentiré mi fidelidad. R.",
          "ni desmentiré mi fidelidad. R.\n\nNo quebrantaré mi alianza\nni cambiaré lo que salió de mis labios. R."))
    edit("14:2", "L1", "4, 1a; 8, 4-7. 11-13",
         ("Así habla el Señor:", "Escuchen la palabra del Señor, israelitas:"),
         ("Tallos sin espiga no produce", "Tallo sin espiga no produce"))
    edit("16:1", "SAL", "Sal 49, 1. 5-6. 8-9. 16b-17. 21. 23",
         ("\n\n«Reúnanme a mis amigos,", "\n\nEl Dios de los dioses, el Señor,\nhabla para convocar a la tierra\ndesde la salida del sol hasta el ocaso.\n\n«Reúnanme a mis amigos,"))
    edit("17:6", "L1", "26, 11-15. 24",
         ("\n\nLos jefes y todo el pueblo dijeron a los sacerdotes y a los profetas: «Este hombre no es reo de muerte, porque nos ha hablado en nombre del Señor, nuestro Dios.»\n\nSin embargo, Ajicám", "\n\nAjicám"))
    edit("18:2", "L1", "30, 1-2. 4. 12-15. 18-22",
         ("Porque así habla el Señor : ¡Tu herida", "Estas son las palabras que el Señor dirigió a Israel y a Judá.\n\nAsí habla el Señor: ¡Tu herida"))
    edit("29:5", "SAL", "Sal 23, 1-6",
         ("el que no rinde culto a los ídolos. R.", "el que no rinde culto a los ídolos\nni jura falsamente. R."))
    edit("30:6", "L1", "1, 15. 18b-26",
         ("Hermanos:\n\nDe una u otra manera", "Hermanos:\n\nEs verdad que algunos predican a Cristo llevados por la envidia y el espíritu de discordia, pero otros lo hacen con buena intención.\n\nDe una u otra manera"))

    corinthians = edit("23:4", "L1", "8, 1. 4b-13")
    verses = bible_verses(corinthians_source)
    verses[4] = "Sabemos bien" + verses[4].split("sabemos bien", 1)[1]
    verses[8] = verses[8].replace("lo que no acerca a Dios", "lo que nos acerca a Dios")
    corinthians["x"] = "Hermanos:\n\n" + "\n\n".join(verses[verse] for verse in (1, *range(4, 14))) + "\n\nPalabra de Dios."


def add_reviewed_memorials(data):
    # The Chilean Ordo selects a different passage for these memorials.
    for key, original, role, replacement in (
        ("chile:monica", "md:08-27", "L1", "md:10-16"),
        ("chile:agustin", "md:08-28", "EV", "md:01-28"),
    ):
        result = [section_for(data[replacement][0], role) if s["s"] == role else s
                  for s in data[original][0]["p"]]
        data[key] = [{"id": key, "p": result}]

    for key, original in (("chile:isabel-hungria", "md:11-19"), ("chile:nicolas", "md:12-07")):
        data[key] = [{"id": key, "p": data[original][0]["p"]}]

    key = "chile:juan-diego"
    domingo = next(form for form in data["dda:dom:7"] if form["y"] == "A")
    data[key] = [{"id": key, "p": [section_for(domingo, "L1"), section_for(data["md:03-04"][0], "SAL"),
                                  section_for(data["md:11-01"][0], "EV")]}]

    # Ordo 2026: the national form for St Albert uses these particular verses.
    key = "chile:alberto-hurtado"
    james = section_for(next(form for form in data["dda:dom:24"] if form["y"] == "B"), "L2")["o"][0]
    gospel = section_for(data["md:11-11"][0], "EV")["o"][0]
    text = "Jesús dijo a sus discípulos:\n\n«Tuve hambre" + gospel["x"].split("porque tuve hambre", 1)[1]
    data[key] = [{"id": key, "p": [part("L1", james), section_for(data["md:09-27"][0], "SAL"),
                                  part("EV", passage(text, "25, 35-40", gospel["h"]))]}]

    key = "chile:carlos-lwanga"
    maccabees = next(form for form in data["dda:dom:32"] if form["y"] == "C")
    data[key] = [{"id": key, "p": [section_for(maccabees, "L1"), section_for(data["md:06-03"][0], "SAL"),
                                  section_for(data["md:11-01"][0], "EV")]}]

    key = "chile:pio"
    abraham = section_for(next(form for form in data["cuar:dom:2"] if form["y"] == "A"), "L1")["o"][0]
    charity = section_for(data["dda:fer:24:3"][1], "L1")["o"][0]
    data[key] = [{"id": key, "p": [part("L1", abraham, charity), section_for(data["md:07-11"][0], "SAL"),
                                  section_for(data["md:07-11"][0], "EV")]}]


def add_pentecost_forms(data, galatians_source):
    # Chilean Ordos for 2024–2027: Gal 5 in A/B and Rom 8 in C.
    verses = bible_verses(galatians_source)
    body = "Hermanos:\n\n" + "\n\n".join(verses[number] for number in range(16, 26)) + "\n\nPalabra de Dios."
    galatians = passage(body, "5, 16-25", "Lectura de la carta del Apóstol san Pablo a los cristianos de Galacia")
    for form in data["pentecostes"]:
        second = section_for(form, "L2")
        if form["y"] == "C":
            alternate = section_for(form, "L3")
            second["o"] = [*second["o"], *alternate["o"]]
            form["p"].remove(alternate)
        else:
            second["o"].append(galatians)

    short = data["pentecostes-vigilia"][0]
    old_testament = section_for(short, "L1")["o"]
    first = section_for(data["dda:fer:6:5"][0], "SAL")["o"][0]
    second = section_for(data["trinidad"][0], "SAL")["o"][0]
    alternate = section_for(data["dda:fer:16:5"][0], "SAL")["o"][0]
    third = section_for(data["dda:fer:20:5"][1], "SAL")["o"][0]
    key = "pentecostes-vigilia-extensa"
    data[key] = [{"id": key, "p": [
        part("L1", old_testament[0]), part("SAL", first),
        part("L2", old_testament[1]), part("SAL2", second, alternate),
        part("L3", old_testament[2]), part("SAL3", third),
        part("L4", old_testament[3]), section_for(short, "SAL") | {"s": "SAL4"},
        part("EP", *section_for(short, "L2")["o"]), section_for(short, "ACL"), section_for(short, "EV"),
    ]}]


def add_carmen_alternatives(data, read):
    # Proper of Chile, Ordo 2024/2026, July 16.
    form = data["chile:carmen"][0]
    judith13, judith15, judith16 = (bible_verses(read(f"biblia-judit{n}.html")) for n in (13, 15, 16))
    blessing = judith13[20].split(" Porque no vacilaste", 1)[0] + "»"
    body = "\n\n".join([judith13[18], judith13[19], blessing, *(judith15[n] for n in range(8, 11)), "Palabra de Dios."])
    first = section_for(form, "L1")
    first["o"].extend([passage(body, "13, 18-20a; 15, 8-10", "Lectura del libro de Judit"),
                       section_for(data["md:08-22"][0], "L1")["o"][0]])
    section_for(form, "SAL")["o"].append(responsorial(judith16, "Jdt 16, 13-17", "¡Alabado sea Dios, el Señor!",
                                                     [(13,), (14,), (15,), (16, 17)]))
    second = section_for(form, "L2")
    timothy = section_for(data["dda:fer:24:1"][0], "L1")["o"][0]
    galatians = section_for(data["md:01-01"][0], "L2")["o"][0]
    second["o"] = [timothy, *second["o"], galatians]
    section_for(form, "EV")["o"].extend([section_for(data["md:09-15"][0], "EV")["o"][0],
                                           section_for(data["md:08-14v"][0], "EV")["o"][0]])


def add_november_twenty_three(data):
    base = next(form for form in data["dda:fer:34:1"] if form["id"].endswith(".II"))
    # CECh, Ordo 2026, Tiempo Ordinario II, PDF p. 60. The added verse
    # fragments are from El Libro del Pueblo de Dios (Vatican archive).
    # Ap 14: https://www.vatican.va/archive/ESL0506/_P11A.HTM
    # Sal 23 (24): https://www.vatican.va/archive/ESL0506/_PGT.HTM
    sections = []
    for section in base["p"]:
        option = section["o"][0]
        if section["s"] == "L1":
            body = replace_text(option["x"], "Ellos siguen al Cordero",
                                "Estos son los que no se han contaminado con mujeres y son vírgenes. Ellos siguen al Cordero")
            sections.append(part("L1", passage(body, "14, 1-5", option["h"])))
        elif section["s"] == "SAL":
            body = replace_text(option["x"], "el que no rinde culto a los ídolos. R.",
                                "el que no rinde culto a los ídolos\nni jura falsamente. R.")
            sections.append(part("SAL", passage(body, "Sal 23, 1-6")))
        elif section["s"] == "EV":
            body = replace_text(option["x"], "Levantado los ojos", "Levantando los ojos")
            sections.append(part("EV", passage(body, option["c"], option["h"])))
        else:
            sections.append(section)
    key = "chile:ordinario-34-lunes-II"
    data[key] = [{"id": key, "p": sections}]


def apply_santiago_editions(data, index):
    reviews = json.loads(Path(__file__).with_name("lectionary-santiago-chile.json").read_text(encoding="utf-8"))
    forms = {form["id"]: form for group in data.values() for form in group}
    for date, review in reviews.items():
        form_id = review["form"]
        if index[date]["forms"][0] != form_id:
            raise ValueError(f"La edición de Santiago de {date} debe aplicarse al formulario principal: {form_id}")
        form = forms[form_id]
        form["santiago"] = review["edition"]
        for revision in review["sections"]:
            role = revision["role"]
            section = section_for(form, role)
            options = list(section["o"])
            original = options.pop(revision["option"]) if "option" in revision else {}
            updated = {**original, **revision["passage"]}
            if not updated.get("x") or not updated.get("c"):
                raise ValueError(f"Falta texto o cita en la edición de Santiago de {date}, {role}")
            options.insert(len(options) if revision.get("append") else 0, updated)
            form["p"] = [part(role, *options) if current is section else current for current in form["p"]]


def add_ordo(data):
    index = json.loads(Path(__file__).with_name("lectionary-ordo-chile.json").read_text(encoding="utf-8"))
    apply_santiago_editions(data, index)
    forms = {form["id"]: form for group in data.values() for form in group}
    for date, entry in index.items():
        source = {
            "url": f"https://www.iglesia.cl/docs/{entry['source']}.pdf#page={entry['page']}",
            "references": entry["references"],
            "pending": entry.get("pending", False),
            "unverified": entry.get("unverified", []),
        }
        choices = []
        for position, form_id in enumerate(entry["forms"]):
            form = forms[form_id]
            sections = form["p"]
            if position == 0 and entry.get("replace"):
                substitutions = {}
                for role, (other_id, other_role, index) in entry["replace"].items():
                    other = next(section["o"] for section in forms[other_id]["p"] if section["s"] == other_role)
                    substitutions[role] = other[index]
                sections = []
                for section in form["p"]:
                    role, options = section["s"], section["o"]
                    if role in substitutions:
                        replacement = substitutions[role]
                        sections.append(part(role, replacement, *(option for option in options[1:] if option != replacement)))
                    else:
                        sections.append(section)
            choice = {**form, "p": sections, "ordo": source if position == 0 else {**source, "unverified": []}}
            if position and "lb" not in choice:
                choice["lb"] = "Lecturas de la feria" if re.match(r"^(?:dda|adv|pas|cuar):fer:", form_id) else "Lecturas del santoral"
            choices.append(choice)
        data[f"ordo:{date}"] = choices

        for form_id in entry.get("recurringMemorials", []):
            if form_id not in entry["forms"]:
                raise ValueError(f"Memoria recurrente fuera de los formularios de {date}: {form_id}")
            recurring = data.setdefault(f"chile:memoriales:{date[5:]}", [])
            if not any(form["id"] == form_id for form in recurring):
                form = forms[form_id]
                recurring.append({**form, "lb": form.get("lb") or "Lecturas del santoral"})


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
        # The source's "i" field is an editorial subtitle. Only "x" is proclaimed.
        form["p"] = [
            part(section["s"], *(passage(
                re.sub(r"‹/?[a-z]+›", "", option["x"], flags=re.I).strip(),
                option.get("c"), option.get("h"), option.get("y"),
            ) for option in section["o"] if option.get("x", "").strip()))
            for section in entry["p"]
        ]
        for key in entry["k"]:
            data.setdefault(key, []).append(form)

    # The source puts 1 Cor under the psalm. The Chilean Ordo lists it as an alternative first reading.
    lateran = data["md:11-09"][0]["p"]
    first_readings = next(section["o"] for section in lateran if section["s"] == "L1")
    psalms = next(section["o"] for section in lateran if section["s"] == "SAL")
    misplaced = next(option for option in psalms if option["c"] == "Sal 3, 9c-11. 16-17")
    psalms.remove(misplaced)
    first_readings.append(passage(misplaced["x"], "3, 9c-11. 16-17",
                                 "Lectura de la primera carta del Apóstol san Pablo a los cristianos de Corinto"))

    def add(key, sections, label=None):
        form = {"id": key, "p": sections}
        if label:
            form["lb"] = label
        data[key] = [form]

    # On Sunday, 1 Corinthians is the second reading of the Lateran Mass.
    add("chile:letran-domingo", [
        part("L1", first_readings[0]), part("SAL", *psalms), part("L2", first_readings[1]),
        *(section for section in lateran if section["s"] not in ("L1", "SAL")),
    ], "Dedicación de la Basílica de Letrán")

    # The Chilean Ordos of 2025 and 2026 group these readings as a Mass.
    # The digital corpus includes the three passages under separate roles.
    all_souls = data["md:11-02"][0]
    add("chile:difuntos", [
        part("L1", section_for(all_souls, "L2")["o"][1]),
        part("SAL", section_for(all_souls, "SAL")["o"][1]),
        part("EV", section_for(all_souls, "EV")["o"][1]),
    ], "Lecturas de difuntos")

    for name, key in {
        "santa-cruz": "chile:santa-cruz",
        "sumo-sacerdote": "chile:sumo-sacerdote",
        "teresa-andes": "chile:teresa-andes",
        "carmen-chile": "chile:carmen",
    }.items():
        readings, psalm, acclamation, gospel = liturgical_sections(read(name + ".html"))
        if name == "sumo-sacerdote":
            source = read("sumo-sacerdote-hebreos.html")
            body = re.search(r"Lectura de la carta a los Hebreos 10, 12-23</em></p>(.*?)<p><strong>SALMO RESPONSORIAL", source, re.S)
            if not body:
                raise ValueError("Falta Heb 10, 12-23 en la fuente de Eucaristía Diaria.")
            paragraphs = [plain(p) for p in re.findall(r"<p>(.*?)</p>", body[1], re.S)]
            readings.append(passage("\n\n".join([*paragraphs, "Palabra de Dios."]), "10, 12-23",
                                    "Lectura de la carta a los Hebreos"))
            psalm["c"] = psalm["c"].replace(". .", ". ")
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

    correct_ordinary_weekdays(data, read("ordinario-20-jueves-impar.html"))
    correct_fixed_passages(data)
    correct_chilean_weekday_texts(data, read("biblia-1cor8.html"))
    add_reviewed_memorials(data)
    add_pentecost_forms(data, read("biblia-galatas5.html"))
    add_carmen_alternatives(data, read)
    add_november_twenty_three(data)
    add_ordo(data)

    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    args.output.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))
    print(f"{len(data)} entradas. {len(payload):,} bytes antes de comprimir.")


if __name__ == "__main__":
    main()
