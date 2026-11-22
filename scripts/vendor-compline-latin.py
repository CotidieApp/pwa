"""Extract the Roman Compline forms from breviar.kbs.sk's Latin HTML archive."""

import argparse
import json
import re
from html import unescape
from pathlib import Path
from zipfile import ZipFile


# Monday to Sunday, plus the prayer of solemnities celebrated on weekdays.
FORMS = (
    "2602-feb/260202_1k.htm",
    "2602-feb/260203_0k.htm",
    "2602-feb/260204_0k.htm",
    "2602-feb/260205_1k.htm",
    "2602-feb/260206_1k.htm",
    "2602-feb/260207_0k.htm",
    "2602-feb/260201_0k.htm",
)


def text(fragment):
    return " ".join(unescape(re.sub(r"<[^>]*>", "", fragment)).split())


def part(markup, title=None):
    markup = re.sub(r'<(?:p|span) class="section-title"[^>]*>[^<]*</(?:p|span)>', '', markup)
    lines = []
    for match in re.finditer(r'<p(?: class="([^"]+)")?>(.*?)</p>', markup, re.S):
        style, body = match.groups()
        value = text(body)
        if not value:
            continue
        if style == 'respV':
            value = '$℣. $' + value
        if style == 'respR':
            value = '$℟. $' + value
        if style in ('redsmall', 'rubric'):
            value = f'${value}$'
        if value.startswith('Ant.'):
            lines.extend(('', f'_{value}_', ''))
            continue
        if style == 'bibleref' and title == 'Lectio brevis':
            title += ' · ' + value
            continue
        if style == 'bibleref' and title and title.endswith(value):
            continue
        lines.append(value)
        if style and 'last' in style.split():
            lines.append('')
    result = {'text': '\n'.join(lines).strip()}
    if not result['text']:
        raise ValueError(f'Empty section: {title}')
    if title:
        result['title'] = title
    return result


def split_office(archive, path):
    html = re.sub(r'<!--.*?-->', '', archive.read(path).decode('utf-8'), flags=re.S)
    parts = html.split('<div class="tts_section"></div>')
    reading = next(i for i, value in enumerate(parts) if '>LECTIO BREVIS<' in value)
    psalms = []
    for markup in parts[4:reading]:
        if not text(markup):
            continue
        title = re.search(r'<div class="psalm-name">(.*?)</div>', markup).group(1)
        psalms.append(part(markup, text(title)))
    return {
        'opening': [part(parts[0].split('<div class="respons">', 1)[1] + parts[1]),
                    part(parts[2], 'Examen conscientiæ'), part(parts[3], 'Hymnus')],
        'psalms': psalms,
        'reading': part(parts[reading], 'Lectio brevis'),
        'closing': [part(parts[reading + 1], 'Responsorium breve'),
                    part(parts[reading + 2], 'Canticum Simeonis · Lc 2, 29-32')],
        'prayer': part(parts[reading + 3], 'Oratio'),
        'blessing': part(parts[reading + 4]),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    with ZipFile(args.archive) as archive:
        forms = [split_office(archive, path) for path in FORMS]
        solemnity = split_office(archive, '2606-jun/260624_1k.htm')['prayer']
    first = forms[0]
    assert all(form['opening'] == first['opening'] and form['closing'] == first['closing']
               and form['blessing'] == first['blessing'] for form in forms)
    out = {**{key: first[key] for key in ('opening', 'closing', 'blessing')}, 'solemnity': solemnity,
           'week': [{key: form[key] for key in ('psalms', 'reading', 'prayer')} for form in forms]}
    args.output.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
