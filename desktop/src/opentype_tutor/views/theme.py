import logging
from pathlib import Path

import customtkinter as ctk

from ..config.settings import settings

logger = logging.getLogger(__name__)

_font_cache: dict[str, ctk.CTkFont] = {}

_current_theme_mode: str = "dark"

DARK_THEME_PATH = Path(__file__).parent.parent / "config" / "theme_dark.json"
LIGHT_THEME_PATH = Path(__file__).parent.parent / "config" / "theme_light.json"


def get_current_theme_mode() -> str:
    return _current_theme_mode


def set_theme_mode(mode: str) -> None:
    global _current_theme_mode
    if mode not in ("dark", "light"):
        raise ValueError(f"Invalid theme mode: {mode}. Must be 'dark' or 'light'")
    _current_theme_mode = mode
    apply_theme()


def apply_theme() -> None:
    theme_path = DARK_THEME_PATH if _current_theme_mode == "dark" else LIGHT_THEME_PATH
    if theme_path.exists():
        ctk.set_default_color_theme(str(theme_path))
        logger.info(f"Applied {_current_theme_mode} theme from {theme_path}")
    else:
        ctk.set_default_color_theme("dark-blue" if _current_theme_mode == "dark" else "blue")
        logger.info(f"Applied default {_current_theme_mode} theme")

    ctk.set_appearance_mode(_current_theme_mode)
    logger.info(f"Set appearance mode: {_current_theme_mode}")


def init_theme_from_settings() -> None:
    """Initialize theme from settings on startup."""
    set_theme_mode(settings.theme_mode)


def toggle_theme() -> str:
    """Toggle between dark and light theme. Returns new theme mode."""
    new_mode = "light" if _current_theme_mode == "dark" else "dark"
    set_theme_mode(new_mode)
    return new_mode


def get_font(family: str = "Inter", size: int = 14, weight: str = "normal") -> ctk.CTkFont:
    key = f"{family}:{size}:{weight}"
    if key not in _font_cache:
        _font_cache[key] = ctk.CTkFont(family=family, size=size, weight=weight)
    return _font_cache[key]


def get_mono_font(size: int = 14) -> ctk.CTkFont:
    key = f"JetBrains Mono:{size}:normal"
    if key not in _font_cache:
        _font_cache[key] = ctk.CTkFont(family="JetBrains Mono", size=size)
    return _font_cache[key]


def init_fonts():
    """Initialize all font constants. Must be called after tkinter root is created."""
    global FONT_DISPLAY_XL, FONT_DISPLAY_LG, FONT_DISPLAY_MD, FONT_HEADLINE
    global FONT_CARD_TITLE, FONT_SUBHEAD, FONT_BODY, FONT_BODY_SM
    global FONT_CAPTION, FONT_BUTTON, FONT_MONO, FONT_MONO_LG, FONT_MONO_XL

    FONT_DISPLAY_XL = get_font("Inter", 48, "bold")
    FONT_DISPLAY_LG = get_font("Inter", 32, "bold")
    FONT_DISPLAY_MD = get_font("Inter", 24, "bold")
    FONT_HEADLINE = get_font("Inter", 20, "bold")
    FONT_CARD_TITLE = get_font("Inter", 16, "bold")
    FONT_SUBHEAD = get_font("Inter", 14, "normal")
    FONT_BODY = get_font("Inter", 13, "normal")
    FONT_BODY_SM = get_font("Inter", 12, "normal")
    FONT_CAPTION = get_font("Inter", 11, "normal")
    FONT_BUTTON = get_font("Inter", 13, "bold")
    FONT_MONO = get_mono_font(14)
    FONT_MONO_LG = get_mono_font(22)
    FONT_MONO_XL = get_mono_font(26)


# Placeholder constants - will be initialized by init_fonts()
FONT_DISPLAY_XL: ctk.CTkFont | None = None
FONT_DISPLAY_LG: ctk.CTkFont | None = None
FONT_DISPLAY_MD: ctk.CTkFont | None = None
FONT_HEADLINE: ctk.CTkFont | None = None
FONT_CARD_TITLE: ctk.CTkFont | None = None
FONT_SUBHEAD: ctk.CTkFont | None = None
FONT_BODY: ctk.CTkFont | None = None
FONT_BODY_SM: ctk.CTkFont | None = None
FONT_CAPTION: ctk.CTkFont | None = None
FONT_BUTTON: ctk.CTkFont | None = None
FONT_MONO: ctk.CTkFont | None = None
FONT_MONO_LG: ctk.CTkFont | None = None
FONT_MONO_XL: ctk.CTkFont | None = None
FONT_MONO_XL: ctk.CTkFont | None = None