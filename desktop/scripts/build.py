import argparse
import subprocess
import sys
from pathlib import Path


def build_pyinstaller(version: str, onefile: bool = True, windowed: bool = True):
    project_root = Path(__file__).parent.parent
    main_script = project_root / "src" / "opentype_tutor" / "main.py"
    assets_dir = project_root / "assets"
    icons_dir = assets_dir / "icons"
    fonts_dir = assets_dir / "fonts"

    cmd = [
        "pyinstaller",
        "--name", f"opentype-tutor-{version}",
        "--clean",
        "--noconfirm",
    ]

    if onefile:
        cmd.append("--onefile")
    if windowed:
        cmd.append("--windowed")

    cmd.extend([
        "--add-data", f"{assets_dir}:assets",
        "--add-data", f"{project_root / 'src' / 'opentype_tutor' / 'config' / 'theme.json'}:opentype_tutor/config",
        "--hidden-import", "customtkinter",
        "--hidden-import", "httpx",
        "--hidden-import", "pydantic",
        "--hidden-import", "pydantic_settings",
        "--hidden-import", "matplotlib",
        "--hidden-import", "keyring",
        "--collect-all", "customtkinter",
        "--collect-all", "matplotlib",
        str(main_script),
    ])

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=project_root)
    return result.returncode == 0


def build_nuitka(version: str):
    project_root = Path(__file__).parent.parent
    main_script = project_root / "src" / "opentype_tutor" / "main.py"
    assets_dir = project_root / "assets"

    cmd = [
        sys.executable, "-m", "nuitka",
        "--onefile",
        "--enable-plugin=tk-inter",
        "--include-package=customtkinter",
        "--include-package=httpx",
        "--include-package=pydantic",
        "--include-package=pydantic_settings",
        "--include-package=matplotlib",
        "--include-package=keyring",
        "--include-data-dir", f"{assets_dir}=assets",
        "--include-data-file", f"{project_root / 'src' / 'opentype_tutor' / 'config' / 'theme.json'}=opentype_tutor/config/theme.json",
        "--output-dir", f"{project_root / 'dist'}",
        "--output-filename", f"opentype-tutor-{version}",
        str(main_script),
    ]

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=project_root)
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(description="Build OpenType Tutor Desktop")
    parser.add_argument("--tool", choices=["pyinstaller", "nuitka"], default="nuitka", help="Build tool to use")
    parser.add_argument("--version", default="0.1.0", help="Version string")
    args = parser.parse_args()

    project_root = Path(__file__).parent.parent
    dist_dir = project_root / "dist"
    dist_dir.mkdir(exist_ok=True)

    if args.tool == "pyinstaller":
        success = build_pyinstaller(args.version)
    else:
        success = build_nuitka(args.version)

    if success:
        print(f"Build successful! Check {dist_dir}")
    else:
        print("Build failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()