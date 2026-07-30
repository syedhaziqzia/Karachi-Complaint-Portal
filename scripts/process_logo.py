#!/usr/bin/env python3
"""
Process the KCP logo using only PIL:
- Use the already-cropped logo from project root
- Generate all mipmap icon sizes (tightly cropped logo fills 90% of icon)
- Generate a large splash screen logo
"""

from PIL import Image
import os

# Use the already-tight-cropped source
SRC = r"C:\Users\syed_\FirstApp\cropped_logo.png"
ANDROID_RES = r"C:\Users\syed_\FirstApp\android\app\src\main\res"

# ── 1. Load source ────────────────────────────────────────────────────────────
img = Image.open(SRC).convert("RGB")
print(f"Source size: {img.size}")

# Make it square (the logo is slightly portrait, pad with white)
cw, ch = img.size
side = max(cw, ch)
sq = Image.new("RGB", (side, side), (255, 255, 255))
sq.paste(img, ((side - cw) // 2, (side - ch) // 2))
print(f"Square canvas: {side}x{side}")

# ── 2. Mipmap icon sizes ──────────────────────────────────────────────────────
MIPMAP_SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

for folder, size in MIPMAP_SIZES.items():
    out_dir = os.path.join(ANDROID_RES, folder)
    os.makedirs(out_dir, exist_ok=True)
    
    icon = sq.resize((size, size), Image.LANCZOS)
    
    for name in ("ic_launcher.png", "ic_launcher_round.png"):
        out_path = os.path.join(out_dir, name)
        icon.save(out_path, "PNG", optimize=True)
        print(f"  Saved {folder}/{name}  ({size}x{size}px)")

# ── 3. Splash screen logo – large, crisp ─────────────────────────────────────
# 768px gives a nice crisp image on the white splash screen
splash_icon = sq.resize((768, 768), Image.LANCZOS)
splash_path = os.path.join(ANDROID_RES, "drawable", "ic_splash_logo.png")
splash_icon.save(splash_path, "PNG", optimize=True)
print(f"\nSaved splash logo: drawable/ic_splash_logo.png  (768x768px)")

print("\nAll done!")
