"""Generate iOS launch screens (apple-touch-startup-image) for the installed app.

iOS only shows a launch image whose size matches the device exactly, so there's
one per iPhone/iPad screen size: the app icon centered on the light theme's
page background (the manifest's background_color). Portrait only, matching the
manifest's orientation.

Run from the repo root with Pillow installed (pip install pillow):

    python3 scripts/generate-launch-screens.py

It writes public/splash/*.png and prints the <link> tags for index.html.
Add a row to DEVICES when Apple ships a new screen size.
"""

from pathlib import Path

from PIL import Image

BACKGROUND = (0xEA, 0xF7, 0xFC)  # --bg-primary (light), manifest background_color
ICON = Path("public/logo512.png")
OUT_DIR = Path("public/splash")

# (CSS width, CSS height, device pixel ratio), portrait
DEVICES = [
    (440, 956, 3),  # iPhone 16 Pro Max
    (402, 874, 3),  # iPhone 16 Pro
    (430, 932, 3),  # iPhone 14/15 Pro Max, 15/16 Plus
    (393, 852, 3),  # iPhone 14 Pro, 15, 15 Pro, 16
    (428, 926, 3),  # iPhone 12/13 Pro Max, 14 Plus
    (390, 844, 3),  # iPhone 12, 13, 14, 12/13 Pro
    (375, 812, 3),  # iPhone X, XS, 11 Pro, 12/13 mini
    (414, 896, 3),  # iPhone XS Max, 11 Pro Max
    (414, 896, 2),  # iPhone XR, 11
    (414, 736, 3),  # iPhone 6/7/8 Plus
    (375, 667, 2),  # iPhone 6/7/8, SE (2nd/3rd gen)
    (320, 568, 2),  # iPhone SE (1st gen)
    (1032, 1376, 2),  # iPad Pro 13" (M4)
    (1024, 1366, 2),  # iPad Pro 12.9"
    (834, 1210, 2),  # iPad Pro 11" (M4)
    (834, 1194, 2),  # iPad Pro 11"
    (820, 1180, 2),  # iPad Air 10.9", iPad (10th gen)
    (810, 1080, 2),  # iPad 10.2"
    (768, 1024, 2),  # iPad mini (5th gen), older iPads
    (744, 1133, 2),  # iPad mini (6th gen)
]


def main():
    icon = Image.open(ICON).convert("RGBA")
    OUT_DIR.mkdir(exist_ok=True)
    for width, height, ratio in DEVICES:
        size = (width * ratio, height * ratio)
        screen = Image.new("RGB", size, BACKGROUND)
        # About a third of the screen width, never upscaled past the source
        icon_size = min(int(size[0] * 0.35), icon.width)
        scaled = icon.resize((icon_size, icon_size), Image.LANCZOS)
        screen.paste(scaled, ((size[0] - icon_size) // 2, (size[1] - icon_size) // 2), scaled)
        name = f"launch-{size[0]}x{size[1]}.png"
        # A flat background and one icon fit a 256-color palette with no visible
        # loss, at a fraction of the file size
        screen.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(
            OUT_DIR / name, optimize=True
        )
        media = (
            f"(device-width: {width}px) and (device-height: {height}px) and "
            f"(-webkit-device-pixel-ratio: {ratio}) and (orientation: portrait)"
        )
        print(f'    <link rel="apple-touch-startup-image" media="{media}" href="/splash/{name}" />')


if __name__ == "__main__":
    main()
