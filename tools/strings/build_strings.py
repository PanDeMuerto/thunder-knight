"""Builds the game's translated string tables (M11) from plain text.

Each language is `tools/strings/<code>.txt`: one `key|text` line per string, the keys of `src/content/strings/en.ts`
(lines starting with # are notes). This writes `src/content/strings/<code>.ts` with the quoting done, French's
non-breaking space before ! ? : ; », and checks every key is there once and no other. `tests/strings.test.ts` then
checks the placeholders. Run: python tools/strings/build_strings.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EN = ROOT / 'src' / 'content' / 'strings' / 'en.ts'
OUT = ROOT / 'src' / 'content' / 'strings'
HERE = Path(__file__).resolve().parent

LANGUAGES = {
    'fr': ('FR', 'French'),
    'it': ('IT', 'Italian'),
    'de': ('DE', 'German'),
    'es': ('ES', 'Spanish'),
    'pt': ('PT', 'Brazilian Portuguese'),
    'tr': ('TR', 'Turkish'),
    'ru': ('RU', 'Russian'),
    'zh': ('ZH', 'Simplified Chinese'),
    'ja': ('JA', 'Japanese'),
    'ko': ('KO', 'Korean'),
}

NBSP = ' '


def english_keys() -> list[str]:
    text = EN.read_text(encoding='utf-8')
    return re.findall(r"^\s+'?([A-Za-z0-9_.]+)'?:\s", text, re.M)


def read_table(code: str) -> dict[str, str]:
    table: dict[str, str] = {}
    for n, line in enumerate((HERE / f'{code}.txt').read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip() or line.startswith('#'):
            continue
        if '|' not in line:
            sys.exit(f'{code}.txt line {n}: no "|"')
        key, value = line.split('|', 1)
        key = key.strip()
        if key in table:
            sys.exit(f'{code}.txt line {n}: {key} twice')
        table[key] = value.strip()
    return table


def french(text: str) -> str:
    # A thin gap before high punctuation that never breaks onto its own line.
    text = re.sub(r' ([!?:;»%])', NBSP + r'\1', text)
    return text.replace('« ', '«' + NBSP)


def quote(value: str) -> str:
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'").replace(NBSP, '\\u00a0') + "'"


def key_name(key: str) -> str:
    return key if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', key) else f"'{key}'"


def main() -> None:
    keys = english_keys()
    failed = False
    for code, (const, name) in LANGUAGES.items():
        table = read_table(code)
        missing = [k for k in keys if k not in table]
        extra = [k for k in table if k not in keys]
        if missing or extra:
            print(f'{code}: missing {missing}, extra {extra}')
            failed = True
            continue
        lines = [
            "import type { StringKey } from './en';",
            '',
            f'/** {name} (M11). Written from `tools/strings/{code}.txt` by `python tools/strings/build_strings.py`: edit the text file. */',
            f'export const {const}: Record<StringKey, string> = {{',
        ]
        for k in keys:
            value = french(table[k]) if code == 'fr' else table[k]
            lines.append(f'  {key_name(k)}: {quote(value)},')
        lines.append('};')
        (OUT / f'{code}.ts').write_text('\n'.join(lines) + '\n', encoding='utf-8')
        print(f'{code}.ts: {len(keys)} strings')
    if failed:
        sys.exit(1)


main()
