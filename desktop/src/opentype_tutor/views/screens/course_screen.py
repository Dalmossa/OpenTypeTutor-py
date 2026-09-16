import logging
from pathlib import Path
from typing import Callable

import customtkinter as ctk

from ..components import Heading, SecondaryButton

logger = logging.getLogger(__name__)


class CourseScreen(ctk.CTkFrame):
    def __init__(self, parent, on_back: Callable[[], None], **kwargs):
        super().__init__(parent, fg_color="#010102", **kwargs)
        self.on_back = on_back
        self._build_ui()

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        # Header
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=24, pady=(16, 8))
        header.grid_columnconfigure(1, weight=1)

        SecondaryButton(header, text="← Voltar", command=self.on_back).grid(row=0, column=0, sticky="w")
        Heading(header, "Curso de Digitação", level=3).grid(row=0, column=1, sticky="w", padx=16)

        # Content area: textbox with markdown content
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.grid(row=1, column=0, sticky="nsew", padx=24, pady=(0, 24))
        content.grid_columnconfigure(0, weight=1)
        content.grid_rowconfigure(0, weight=1)

        self.textbox = ctk.CTkTextbox(content, width=900, corner_radius=8)
        self.textbox.grid(row=0, column=0, sticky="nsew")
        self.textbox.configure(state="normal")

        # Load markdown file
        md_path = Path("/home/dalmo/Documentos/Projetos/Open-type-tutor-py/Curso-Digitacao.md")
        try:
            if md_path.exists():
                text = md_path.read_text(encoding="utf-8")
            else:
                text = "Conteúdo do curso não encontrado."
            self.textbox.delete("0.0", "end")
            self.textbox.insert("0.0", text)
            self.textbox.configure(state="disabled")
        except Exception as e:
            logger.exception("Failed to load course markdown")
            self.textbox.delete("0.0", "end")
            self.textbox.insert("0.0", "Erro ao carregar o conteúdo do curso.")
            self.textbox.configure(state="disabled")

        # Optionally show keyboard image if present
        possible = [
            Path("/home/dalmo/Documentos/Projetos/Open-type-tutor-py/desktop/assets/icons/keyboard.png"),
            Path("/home/dalmo/Documentos/Projetos/Open-type-tutor-py/desktop/assets/keyboard_abnt2.png"),
        ]
        for p in possible:
            if p.exists():
                try:
                    from PIL import Image
                    from customtkinter import CTkImage

                    img = Image.open(p).convert("RGBA")
                    tk_img = CTkImage(img, size=(720, 240))
                    img_label = ctk.CTkLabel(content, image=tk_img, text="")
                    img_label.image = tk_img
                    img_label.grid(row=1, column=0, pady=(12, 0))
                except Exception:
                    logger.exception("Failed to load keyboard image")
                break
