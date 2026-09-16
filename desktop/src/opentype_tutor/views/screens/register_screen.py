import asyncio
import logging
from collections.abc import Awaitable, Callable

import customtkinter as ctk

from ..components import (
    Caption,
    Card,
    Heading,
    InputField,
    PrimaryButton,
    SecondaryButton,
    Subheading,
)

logger = logging.getLogger(__name__)


class RegisterScreen(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        on_register: Callable[[str, str, str, str], Awaitable[tuple[bool, str | None]]],
        on_switch_to_login: Callable[[], None],
        **kwargs,
    ):
        super().__init__(parent, fg_color="#010102", **kwargs)
        self.on_register = on_register
        self.on_switch_to_login = on_switch_to_login
        self._build_ui()

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        center = ctk.CTkFrame(self, fg_color="transparent")
        center.grid(row=0, column=0, sticky="nsew")
        center.grid_columnconfigure(0, weight=1)

        card = Card(center)
        card.grid(row=0, column=0, padx=48, pady=48, sticky="n")
        card.grid_columnconfigure(0, weight=1)

        Heading(card, "Criar conta", level=2).grid(row=0, column=0, pady=(32, 8), padx=32)
        Subheading(card, "Comece seu treino adaptativo de digitação").grid(row=1, column=0, pady=(0, 32), padx=32)

        self.name_input = InputField(card, placeholder="Nome completo")
        self.name_input.grid(row=2, column=0, pady=8, padx=32, sticky="ew")

        self.email_input = InputField(card, placeholder="E-mail")
        self.email_input.grid(row=3, column=0, pady=8, padx=32, sticky="ew")

        self.password_input = InputField(card, placeholder="Senha (mínimo 8 caracteres)", show="•")
        self.password_input.grid(row=4, column=0, pady=8, padx=32, sticky="ew")

        self.confirm_input = InputField(card, placeholder="Confirme a senha", show="•")
        self.confirm_input.grid(row=5, column=0, pady=8, padx=32, sticky="ew")

        self.layout_var = ctk.StringVar(value="ABNT2")
        layout_frame = ctk.CTkFrame(card, fg_color="transparent")
        layout_frame.grid(row=6, column=0, pady=8, padx=32, sticky="ew")
        layout_frame.grid_columnconfigure(1, weight=1)

        Caption(layout_frame, "Layout do teclado:").grid(row=0, column=0, padx=(0, 12))
        layout_menu = ctk.CTkOptionMenu(
            layout_frame,
            values=["ABNT2", "US-International"],
            variable=self.layout_var,
            font=("Inter", 13),
        )
        layout_menu.grid(row=0, column=1, sticky="ew")

        self.error_label = Caption(card, "", text_color="#DC2626")
        self.error_label.grid(row=7, column=0, pady=(8, 16), padx=32)

        PrimaryButton(card, text="Criar conta", command=lambda: asyncio.create_task(self._handle_register())).grid(row=8, column=0, pady=8, padx=32, sticky="ew")

        SecondaryButton(card, text="Já tem conta? Entrar", command=self.on_switch_to_login).grid(row=9, column=0, pady=(8, 32), padx=32, sticky="ew")

    async def _handle_register(self):
        name = self.name_input.get().strip()
        email = self.email_input.get().strip()
        password = self.password_input.get()
        confirm = self.confirm_input.get()
        layout = self.layout_var.get()

        if not name or not email or not password:
            self._show_error("Preencha todos os campos")
            return

        if password != confirm:
            self._show_error("As senhas não coincidem")
            return

        if len(password) < 8:
            self._show_error("A senha deve ter pelo menos 8 caracteres")
            return

        self._set_loading(True)
        self._show_error("")

        success, error = await self.on_register(name, email, password, layout)
        self._set_loading(False)

        if error:
            self._show_error(error)

    def _show_error(self, message: str):
        self.error_label.configure(text=message)

    def _set_loading(self, loading: bool):
        pass