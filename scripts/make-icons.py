#!/usr/bin/env python3
"""Render the PWA icons in public/icons/ from the game's own mark.

The mark is the one already in public/favicon.svg: the 2x2 picture grid that
IS the game. One cell carries an amber tile, which is the answer you are
building. Colours are the CSS tokens in src/styles/global.css and nothing else.

Only needs re-running if the palette or the mark changes:

    python3 scripts/make-icons.py        # needs Pillow
"""

from pathlib import Path

from PIL import Image, ImageDraw

TEAL = "#0a5c50"  # --accent
CREAM = "#fbf8f2"  # --paper
AMBER = "#8a3b0b"  # --warn

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"


def draw(size: int, inset: float) -> Image.Image:
    """The mark on a full-bleed teal field.

    `inset` is the fraction of the canvas left as padding around the 2x2 grid.
    Maskable icons get a big one: Android may crop to a circle, and anything
    outside the middle 80% can be cut off.
    """
    # 4x supersample, then downscale — Pillow has no antialiased shape drawing.
    s = size * 4
    img = Image.new("RGB", (s, s), TEAL)
    d = ImageDraw.Draw(img)

    pad = s * inset
    grid = s - 2 * pad
    gap = grid * 0.08
    cell = (grid - gap) / 2
    radius = cell * 0.18

    for row in range(2):
        for col in range(2):
            x = pad + col * (cell + gap)
            y = pad + row * (cell + gap)
            d.rounded_rectangle([x, y, x + cell, y + cell], radius=radius, fill=CREAM)
            # Bottom-right cell is the letter tile you have just placed.
            if row == 1 and col == 1:
                m = cell * 0.26
                d.rounded_rectangle(
                    [x + m, y + m, x + cell - m, y + cell - m],
                    radius=radius * 0.8,
                    fill=AMBER,
                )

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # "any" icons are shown as drawn, so they keep the tight favicon framing.
    for size in (192, 512):
        draw(size, inset=0.19).save(OUT / f"icon-{size}.png")
    # iOS home screen: no masking, no transparency.
    draw(180, inset=0.19).save(OUT / "apple-touch-icon.png")
    # Maskable: everything important inside the middle 80%.
    for size in (192, 512):
        draw(size, inset=0.29).save(OUT / f"icon-{size}-maskable.png")
    for p in sorted(OUT.glob("*.png")):
        print(p.relative_to(OUT.parent.parent), p.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
