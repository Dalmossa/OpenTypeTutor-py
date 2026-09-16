import argparse
import subprocess
import sys
from pathlib import Path


HEROICONS = [
    "academic-cap",
    "arrow-right",
    "check-circle",
    "computer-desktop",
    "cog",
    "key",
    "lock-closed",
    "magnifying-glass",
    "pencil",
    "play",
    "pause",
    "stop",
    "x-mark",
    "user",
    "user-plus",
    "arrow-left",
    "chart-bar",
    "chart-pie",
    "refresh",
    "sparkles",
]


def download_heroicons(output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    base_url = "https://raw.githubusercontent.com/tailwindlabs/heroicons/master/optimized/24/outline"

    for icon in HEROICONS:
        url = f"{base_url}/{icon}.svg"
        output_file = output_dir / f"{icon}.svg"
        print(f"Downloading {icon}...")
        try:
            subprocess.run(["curl", "-sL", url, "-o", str(output_file)], check=True)
        except subprocess.CalledProcessError:
            print(f"Failed to download {icon}")


def convert_svg_to_png(svg_dir: Path, png_dir: Path, size: int = 64):
    png_dir.mkdir(parents=True, exist_ok=True)

    for svg_file in svg_dir.glob("*.svg"):
        png_file = png_dir / f"{svg_file.stem}.png"
        try:
            subprocess.run([
                "rsvg-convert", "-w", str(size), "-h", str(size),
                str(svg_file), "-o", str(png_file)
            ], check=True)
            print(f"Converted {svg_file.name} -> {png_file.name}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(f"Failed to convert {svg_file.name} (rsvg-convert not installed?)")


def create_ico(png_dir: Path, output_file: Path, sizes: list = None):
    if sizes is None:
        sizes = [16, 24, 32, 48, 64, 128, 256]

    png_files = list(png_dir.glob("*.png"))
    if not png_files:
        print("No PNG files found")
        return

    try:
        from PIL import Image
        images = []
        for size in sizes:
            for png_file in png_files:
                img = Image.open(png_file)
                img = img.resize((size, size), Image.Resampling.LANCZOS)
                images.append(img)

        images[0].save(output_file, format="ICO", sizes=[(s, s) for s in sizes])
        print(f"Created {output_file}")
    except ImportError:
        print("PIL/Pillow not installed, skipping ICO creation")


def main():
    parser = argparse.ArgumentParser(description="Download and convert Heroicons")
    parser.add_argument("--download", action="store_true", help="Download SVGs from GitHub")
    parser.add_argument("--convert", action="store_true", help="Convert SVGs to PNGs")
    parser.add_argument("--ico", action="store_true", help="Create ICO file")
    parser.add_argument("--size", type=int, default=64, help="PNG size")
    args = parser.parse_args()

    project_root = Path(__file__).parent.parent
    svg_dir = project_root / "assets" / "icons" / "svg"
    png_dir = project_root / "assets" / "icons" / "png"
    ico_file = project_root / "assets" / "icons" / "app.ico"

    if args.download:
        download_heroicons(svg_dir)

    if args.convert:
        convert_svg_to_png(svg_dir, png_dir, args.size)

    if args.ico:
        create_ico(png_dir, ico_file)

    if not any([args.download, args.convert, args.ico]):
        parser.print_help()


if __name__ == "__main__":
    main()