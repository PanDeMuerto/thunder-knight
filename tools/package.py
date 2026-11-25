"""Packs a build into release/ as the zip to upload, with index.html at the top level.

    python -I tools/package.py poki    dist/      -> release/thunder-knight-<version>-poki.zip
    python -I tools/package.py itch    dist-itch/ -> release/thunder-knight-<version>-itch.zip

Run through `npm run package` or `npm run package:itch`, which build first. This is Python because PowerShell's
Compress-Archive can write backslashes into paths, and those break when a zip is unpacked on a Linux server.
"""

import json
import os
import sys
import zipfile

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
TARGETS = {"poki": "dist", "itch": "dist-itch"}
TARGET = sys.argv[1] if len(sys.argv) > 1 else "poki"
if TARGET not in TARGETS:
    print(f"Unknown target {TARGET}: use one of {', '.join(TARGETS)}")
    sys.exit(1)
DIST = os.path.join(ROOT, TARGETS[TARGET])
OUT = os.path.join(ROOT, "release")
NOT_FOR_RELEASE = (".map", ".DS_Store", "Thumbs.db", ".log")


def fail(message):
    print(message)
    sys.exit(1)


def files_in(folder):
    found = []
    for directory, _, names in os.walk(folder):
        for name in names:
            path = os.path.join(directory, name)
            found.append(os.path.relpath(path, folder).replace(os.sep, "/"))
    return sorted(found)


with open(os.path.join(ROOT, "package.json"), encoding="utf8") as package:
    version = json.load(package)["version"]

names = files_in(DIST)
if "index.html" not in names:
    fail(f"{TARGETS[TARGET]}/index.html is missing. Build it first.")
stray = [name for name in names if name.endswith(NOT_FOR_RELEASE)]
if stray:
    fail(f"Not for release: {stray}")

if TARGET == "itch":
    with open(os.path.join(DIST, "index.html"), encoding="utf8") as page:
        if "poki" in page.read().lower():
            fail("The itch build's index.html mentions Poki: it must be built with --mode web.")

os.makedirs(OUT, exist_ok=True)
target = os.path.join(OUT, f"thunder-knight-{version}-{TARGET}.zip")
with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in names:
        archive.write(os.path.join(DIST, name), name)

with zipfile.ZipFile(target) as archive:
    packed = sorted(archive.namelist())
    if packed != names:
        fail(f"The zip doesn't match {TARGETS[TARGET]}/.")
    if archive.testzip() is not None:
        fail("The zip is damaged.")

print(f"{os.path.relpath(target, ROOT)}: {len(names)} files, {os.path.getsize(target) / 1024:.0f} KB")
