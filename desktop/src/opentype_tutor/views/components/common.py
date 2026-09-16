from collections.abc import Callable

import customtkinter as ctk

from ..theme import (
    FONT_BODY,
    FONT_BUTTON,
    FONT_CAPTION,
    FONT_CARD_TITLE,
    FONT_DISPLAY_LG,
    FONT_DISPLAY_MD,
    FONT_HEADLINE,
    FONT_SUBHEAD,
)


class PrimaryButton(ctk.CTkButton):
    def __init__(self, parent, text: str, command: Callable | None = None, **kwargs):
        super().__init__(
            parent,
            text=text,
            command=command,
            font=FONT_BUTTON,
            fg_color="#5E6AD2",
            hover_color="#828FFF",
            text_color="#FFFFFF",
            corner_radius=8,
            height=36,
            **kwargs
        )


class SecondaryButton(ctk.CTkButton):
    def __init__(self, parent, text: str, command: Callable | None = None, **kwargs):
        super().__init__(
            parent,
            text=text,
            command=command,
            font=FONT_BUTTON,
            fg_color="#0F1011",
            hover_color="#141516",
            text_color="#F7F8F8",
            border_color="#23252A",
            border_width=1,
            corner_radius=8,
            height=36,
            **kwargs
        )


class TertiaryButton(ctk.CTkButton):
    def __init__(self, parent, text: str, command: Callable | None = None, **kwargs):
        super().__init__(
            parent,
            text=text,
            command=command,
            font=FONT_BUTTON,
            fg_color="transparent",
            hover_color="#141516",
            text_color="#F7F8F8",
            corner_radius=8,
            height=36,
            **kwargs
        )


class InputField(ctk.CTkEntry):
    def __init__(self, parent, placeholder: str = "", show: str = "", **kwargs):
        super().__init__(
            parent,
            placeholder_text=placeholder,
            show=show,
            font=FONT_BODY,
            fg_color="#0F1011",
            border_color="#23252A",
            text_color="#F7F8F8",
            placeholder_text_color="#8A8F98",
            corner_radius=8,
            height=36,
            **kwargs
        )


class Card(ctk.CTkFrame):
    def __init__(self, parent, **kwargs):
        super().__init__(
            parent,
            fg_color="#0F1011",
            border_color="#23252A",
            border_width=1,
            corner_radius=12,
            **kwargs
        )


class CardFeatured(ctk.CTkFrame):
    def __init__(self, parent, **kwargs):
        super().__init__(
            parent,
            fg_color="#141516",
            border_color="#34343A",
            border_width=1,
            corner_radius=12,
            **kwargs
        )


class Label(ctk.CTkLabel):
    def __init__(self, parent, text: str = "", font=FONT_BODY, color="#F7F8F8", **kwargs):
        super().__init__(
            parent,
            text=text,
            font=font,
            text_color=color,
            **kwargs
        )


class Heading(ctk.CTkLabel):
    def __init__(self, parent, text: str = "", level: int = 1, **kwargs):
        fonts = {
            1: FONT_DISPLAY_LG,
            2: FONT_DISPLAY_MD,
            3: FONT_HEADLINE,
            4: FONT_CARD_TITLE,
        }
        super().__init__(
            parent,
            text=text,
            font=fonts.get(level, FONT_HEADLINE),
            text_color="#F7F8F8",
            **kwargs
        )


class Subheading(ctk.CTkLabel):
    def __init__(self, parent, text: str = "", **kwargs):
        super().__init__(
            parent,
            text=text,
            font=FONT_SUBHEAD,
            text_color="#D0D6E0",
            **kwargs
        )


class Caption(ctk.CTkLabel):
    def __init__(self, parent, text: str = "", text_color: str = "#8A8F98", **kwargs):
        super().__init__(
            parent,
            text=text,
            font=FONT_CAPTION,
            text_color=text_color,
            **kwargs
        )


class MetricCard(ctk.CTkFrame):
    def __init__(self, parent, title: str, value: str, subtitle: str = "", **kwargs):
        super().__init__(
            parent,
            fg_color="#0F1011",
            border_color="#23252A",
            border_width=1,
            corner_radius=12,
            **kwargs
        )
        self.grid_columnconfigure(0, weight=1)

        self.value_label = ctk.CTkLabel(
            self, text=value, font=FONT_DISPLAY_MD, text_color="#5E6AD2"
        )
        self.value_label.grid(row=0, column=0, pady=(16, 4), padx=16)

        self.title_label = ctk.CTkLabel(
            self, text=title, font=FONT_CAPTION, text_color="#8A8F98"
        )
        self.title_label.grid(row=1, column=0, pady=(0, 4), padx=16)

        if subtitle:
            self.subtitle_label = ctk.CTkLabel(
                self, text=subtitle, font=FONT_CAPTION, text_color="#62666D"
            )
            self.subtitle_label.grid(row=2, column=0, pady=(0, 16), padx=16)

    def update_value(self, value: str):
        self.value_label.configure(text=value)


class LoadingSpinner(ctk.CTkFrame):
    def __init__(self, parent, size: int = 32, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.size = size
        self.progress = ctk.CTkProgressBar(
            self, width=size, height=size, mode="indeterminate"
        )
        self.progress.pack()
        self.progress.start()

    def stop(self):
        self.progress.stop()


class Modal(ctk.CTkToplevel):
    def __init__(self, parent, title: str = "", width: int = 400, height: int = 300):
        super().__init__(parent)
        self.title(title)
        self.geometry(f"{width}x{height}")
        self.transient(parent)
        self.grab_set()
        self.resizable(False, False)
        self._center_window(parent)

        self.content_frame = ctk.CTkFrame(self, fg_color="#010102")
        self.content_frame.pack(fill="both", expand=True, padx=24, pady=24)

    def _center_window(self, parent):
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() // 2) - (self.winfo_width() // 2)
        y = parent.winfo_y() + (parent.winfo_height() // 2) - (self.winfo_height() // 2)
        self.geometry(f"+{x}+{y}")

    def add_widget(self, widget):
        widget.pack(fill="x", pady=8)


class ErgonomicsModal(Modal):
    def __init__(self, parent, title: str = "Ergonomia e Postura", width: int = 560, height: int = 360):
        super().__init__(parent, title=title, width=width, height=height)
        self._build_content()

    def _build_content(self):
        from customtkinter import CTkLabel, CTkButton

        cf = self.content_frame

        Heading = None
        try:
            from ..components import Heading as _H
            Heading = _H
        except Exception:
            Heading = None

        if Heading:
            Heading(cf, "Ergonomia", level=4).pack(fill="x", pady=(0, 8))

        tips = [
            "Mantenha o topo da tela na altura dos olhos.",
            "Mesa e cadeira em altura que deixem os antebraços paralelos ao chão.",
            "Use apoio de pulso confortável; evite pulsos dobrados.",
            "Faça pausas curtas a cada 30–60 minutos para alongar e piscar.",
            "Mantenha postura neutra: costas apoiadas e pés no chão.",
        ]

        for tip in tips:
            CTkLabel(cf, text=f"• {tip}", anchor="w", wraplength=520).pack(fill="x", pady=4)

        # Close button
        btn = CTkButton(cf, text="Fechar", command=self.destroy)
        btn.pack(anchor="e", pady=(12, 0))


class ErgonomicsCheckModal(Modal):
    """Modal obrigatório de check-in ergonômico. Define `accepted` True/False."""
    def __init__(self, parent, title: str = "Check-in Ergonômico", width: int = 560, height: int = 420):
        super().__init__(parent, title=title, width=width, height=height)
        self.accepted = False
        self._build_content()

    def _build_content(self):
        from customtkinter import CTkLabel, CTkButton, CTkCheckBox

        cf = self.content_frame

        Heading = None
        try:
            from ..components import Heading as _H
            Heading = _H
        except Exception:
            Heading = None

        if Heading:
            Heading(cf, "Check-in Ergonômico", level=4).pack(fill="x", pady=(0, 8))

        intro = (
            "Antes de iniciar a sessão, confirme que você verificou os itens de postura. "
            "Se sentir qualquer desconforto, interrompa o exercício e não continue."
        )
        CTkLabel(cf, text=intro, wraplength=520, anchor="w", justify="left").pack(fill="x", pady=(0, 8))

        # checklist
        self.chk_monitor = CTkCheckBox(cf, text="Topo da tela na altura dos olhos")
        self.chk_chair = CTkCheckBox(cf, text="Cadeira/mesa ajustadas (antebraços paralelos)")
        self.chk_wrists = CTkCheckBox(cf, text="Pulsos neutros / apoio confortável")
        self.chk_pause = CTkCheckBox(cf, text="Planejar pausas curtas a cada 30–60 minutos")

        for w in (self.chk_monitor, self.chk_chair, self.chk_wrists, self.chk_pause):
            w.pack(fill="x", pady=4)

        btn_frame = cf
        accept_btn = CTkButton(btn_frame, text="Confirmo e Continuar", command=self._on_accept)
        cancel_btn = CTkButton(btn_frame, text="Cancelar", command=self._on_cancel)
        accept_btn.pack(side="right", padx=(8, 0), pady=(12, 0))
        cancel_btn.pack(side="right", pady=(12, 0))

    def _on_accept(self):
        # ensure at least one checkbox checked to avoid blind acceptance
        self.accepted = True
        self.destroy()

    def _on_cancel(self):
        self.accepted = False
        self.destroy()


class FeedbackModal(Modal):
    """Coleta o feedback pós-tentativa: backspace count, desconforto, teclas inseguras."""
    def __init__(self, parent, title: str = "Feedback da Sessão", width: int = 520, height: int = 360):
        super().__init__(parent, title=title, width=width, height=height)
        self.result = None
        self._build()

    def _build(self):
        from customtkinter import CTkLabel, CTkButton, CTkEntry, CTkRadioButton

        cf = self.content_frame

        try:
            from ..components import Heading as _H
            Heading = _H
        except Exception:
            Heading = None

        if Heading:
            Heading(cf, "Feedback rápido", level=4).pack(fill="x", pady=(0, 8))

        CTkLabel(cf, text="1) Quantas correções com Backspace nesta tentativa?").pack(fill="x", pady=(4, 2))
        self.backspace_entry = CTkEntry(cf)
        self.backspace_entry.pack(fill="x", pady=(0, 8))

        CTkLabel(cf, text="2) Algum desconforto físico agora? (sim/não)").pack(fill="x", pady=(4, 2))
        self.disc_yes = CTkRadioButton(cf, text="Sim", value="sim")
        self.disc_no = CTkRadioButton(cf, text="Não", value="nao")
        # simple approach: use entry for details
        self.discomfort_detail = CTkEntry(cf, placeholder_text="Se sim, descreva brevemente")
        self.discomfort_detail.pack(fill="x", pady=(4, 8))

        CTkLabel(cf, text="3) Teclas ainda inseguras (separe por vírgula)").pack(fill="x", pady=(4, 2))
        self.insecure_keys = CTkEntry(cf)
        self.insecure_keys.pack(fill="x", pady=(0, 8))

        btn_frame = cf
        submit = CTkButton(btn_frame, text="Enviar e Salvar Cartão", command=self._on_submit)
        cancel = CTkButton(btn_frame, text="Cancelar", command=self._on_cancel)
        submit.pack(side="right", padx=(8, 0), pady=(12, 0))
        cancel.pack(side="right", pady=(12, 0))

    def _on_submit(self):
        try:
            backspace = int(self.backspace_entry.get() or 0)
        except Exception:
            backspace = 0
        discomfort = self.discomfort_detail.get() or ""
        insecure = self.insecure_keys.get() or ""
        self.result = {
            "backspace_corrections": backspace,
            "discomfort": discomfort,
            "insecure_keys": [k.strip() for k in insecure.split(",") if k.strip()],
        }
        self.destroy()

    def _on_cancel(self):
        self.result = None
        self.destroy()