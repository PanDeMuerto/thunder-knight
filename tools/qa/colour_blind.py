"""Colour-blind check (GDD 15.4, M10): simulates protanopia, deuteranopia and tritanopia on HUD screenshots, so the
stat rings, warnings and buttons can be checked by eye. Each stat must still be told apart by its icon and shape, and a
warning by its pulse and outline, not by colour alone.

Usage: python tools/qa/colour_blind.py <screenshot.png> [...]  ->  qa-output/colour-blind/<name>.png
Each output is a row: as seen, then the three simulations. Machado, Oliveira and Fernandes (2009), severity 1.0.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

MATRICES = {
    "protanopia": [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    "deuteranopia": [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    "tritanopia": [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}


def to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def simulate(img, matrix):
    rgb = to_linear(np.asarray(img, dtype=np.float32) / 255)
    out = rgb @ np.array(matrix, dtype=np.float32).T
    return Image.fromarray((to_srgb(out) * 255 + 0.5).astype(np.uint8))


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "..", "qa-output", "colour-blind")
    os.makedirs(out_dir, exist_ok=True)
    for path in sys.argv[1:]:
        img = Image.open(path).convert("RGB")
        views = [("as seen", img)] + [(name, simulate(img, m)) for name, m in MATRICES.items()]
        w, h = img.size
        sheet = Image.new("RGB", (w * len(views), h + 24), (20, 20, 20))
        draw = ImageDraw.Draw(sheet)
        for i, (name, view) in enumerate(views):
            sheet.paste(view, (i * w, 24))
            draw.text((i * w + 8, 6), name, fill=(240, 240, 240))
        target = os.path.join(out_dir, os.path.basename(path))
        sheet.save(target)
        print(target)


if __name__ == "__main__":
    main()
