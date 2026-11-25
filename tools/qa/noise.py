"""Measures how busy screenshots look, so "less noisy" is a number, not a guess.

    python tools/qa/noise.py qa-output/noise/before qa-output/noise/after

For each image: the mean absolute Laplacian (fine, pixel-level grain such as dither, speckle and texture noise) and the mean
local contrast in 16 px blocks (busy detail at a larger scale, such as clutter and grungy textures). Lower is calmer.
"""

import glob
import os
import sys

import numpy as np
from PIL import Image


def measure(path):
    gray = np.asarray(Image.open(path).convert("L"), dtype=np.float32) / 255.0
    # Leave out the top and bottom bands where most of the HUD lives.
    h = gray.shape[0]
    gray = gray[int(h * 0.15) : int(h * 0.8)]
    lap = np.abs(4 * gray[1:-1, 1:-1] - gray[:-2, 1:-1] - gray[2:, 1:-1] - gray[1:-1, :-2] - gray[1:-1, 2:])
    grain = float(lap.mean())
    b = 16
    hh, ww = (gray.shape[0] // b) * b, (gray.shape[1] // b) * b
    blocks = gray[:hh, :ww].reshape(hh // b, b, ww // b, b)
    busy = float(blocks.std(axis=(1, 3)).mean())
    return grain, busy


folders = sys.argv[1:] or ["qa-output/noise/before"]
results = {}
for folder in folders:
    for path in sorted(glob.glob(os.path.join(folder, "*.png"))):
        results.setdefault(os.path.basename(path), {})[folder] = measure(path)

print(f"{'image':24}" + "".join(f"{os.path.basename(f.rstrip('/')):>22}" for f in folders))
totals = {f: [0.0, 0.0, 0] for f in folders}
for name, per in results.items():
    row = f"{name:24}"
    for f in folders:
        if f in per:
            g, b = per[f]
            row += f"{g * 1000:10.1f} {b * 1000:10.1f} "
            totals[f][0] += g
            totals[f][1] += b
            totals[f][2] += 1
        else:
            row += " " * 22
    print(row)
print(f"{'mean (grain, busy)':24}" + "".join(f"{t[0] / max(1, t[2]) * 1000:10.1f} {t[1] / max(1, t[2]) * 1000:10.1f} " for t in totals.values()))
