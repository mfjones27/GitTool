"""Convert the generated PNG into a Windows .ico with multiple sizes."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\Mauri\.cursor\projects\c-Users-Mauri-Documents-Python-Projects-GitTool"
    r"\assets\icon_source.png"
)
OUT = ROOT / "assets" / "icon.ico"

img = Image.open(SRC).convert("RGBA")

w, h = img.size
side = min(w, h)
left = (w - side) // 2
top = (h - side) // 2
img = img.crop((left, top, left + side, top + side))

img_big = img.resize((512, 512), Image.LANCZOS)
png_out = ROOT / "frontend" / "public" / "icon.png"
img_big.save(png_out, format="PNG")
print(f"wrote {png_out} ({png_out.stat().st_size} bytes)")

img_ico = img.resize((256, 256), Image.LANCZOS)
sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img_ico.save(OUT, format="ICO", sizes=sizes)
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
