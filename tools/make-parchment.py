"""Draws the door parchment as a 9-slice image whose edges and middle repeat seamlessly instead of stretching.

Usage: python3 tools/make-parchment.py images/theme/parchment-tile.webp [seed]
"""
import sys
import numpy as np
from PIL import Image

SLICE, PERIOD = 52, 600
SIZE = 2 * SLICE + PERIOD
rng = np.random.default_rng(int(sys.argv[2]) if len(sys.argv) > 2 else 7)

def periodic_noise(n, falloff, low=1, high=None):
    """2D noise that wraps around every n pixels, from a random spectrum."""
    fy, fx = np.meshgrid(np.fft.fftfreq(n) * n, np.fft.fftfreq(n) * n, indexing="ij")
    f = np.hypot(fx, fy)
    amp = np.where((f >= low) & ((high is None) | (f <= (high or 1e9))), 1 / np.maximum(f, 1) ** falloff, 0)
    field = np.real(np.fft.ifft2(amp * np.exp(2j * np.pi * rng.random((n, n)))))
    return (field - field.mean()) / field.std()

def periodic_line(n, falloff=1.4):
    f = np.fft.rfftfreq(n) * n
    amp = np.where(f >= 1, 1 / np.maximum(f, 1) ** falloff, 0)
    line = np.fft.irfft(amp * np.exp(2j * np.pi * rng.random(len(f))), n)
    return line / np.abs(line).max()

def wrap(field):
    """Places the period-sized field so the edge strips and middle start exactly at the slice lines."""
    idx = (np.arange(SIZE) - SLICE) % PERIOD
    return field[np.ix_(idx, idx)]

stains, grain, fibre = wrap(periodic_noise(PERIOD, 1.6, 1, 40)), wrap(periodic_noise(PERIOD, 0.6, 30)), wrap(periodic_noise(PERIOD, 0.2, 120))
coords = np.arange(SIZE)
along = (coords - SLICE) % PERIOD

def edge_depth(seed_line):
    return 13 + 8 * seed_line[along]          # how far in from the outer edge the paper starts

top, bottom, left, right = (edge_depth(periodic_line(PERIOD)) for _ in range(4))
yy, xx = np.meshgrid(coords, coords, indexing="ij")
dist = np.minimum.reduce([yy - top[None, :], (SIZE - 1 - yy) - bottom[None, :], xx - left[:, None], (SIZE - 1 - xx) - right[:, None]])

alpha = np.clip(dist / 1.2 + 0.5, 0, 1)
burn = np.clip(1 - dist / 22, 0, 1) ** 2
base = np.array([238, 219, 184], float)
rgb = base + stains[..., None] * [7, 9, 12] + grain[..., None] * [3, 4, 5] + fibre[..., None] * [2.5, 3, 3.5]
rgb = rgb * (1 - 0.45 * burn[..., None]) + np.array([120, 78, 38]) * 0.45 * burn[..., None]
image = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
Image.fromarray(image, "RGBA").save(sys.argv[1], "WEBP", quality=88)
print("saved", sys.argv[1], SIZE, "slice", SLICE)
