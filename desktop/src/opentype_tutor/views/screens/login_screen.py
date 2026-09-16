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


class LoginScreen(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        on_login: Callable[[str, str], Awaitable[tuple[bool, str | None]]],
        on_switch_to_register: Callable[[], None],
        **kwargs,
    ):
        super().__init__(parent, fg_color="#010102", **kwargs)
        self.on_login = on_login
        self.on_switch_to_register = on_switch_to_register
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

        Heading(card, "Bem-vindo de volta", level=2).grid(row=0, column=0, pady=(32, 8), padx=32)
        Subheading(card, "Entre para continuar seu treino de digitação").grid(row=1, column=0, pady=(0, 32), padx=32)

        self.email_input = InputField(card, placeholder="E-mail")
        self.email_input.grid(row=2, column=0, pady=8, padx=32, sticky="ew")

        self.password_input = InputField(card, placeholder="Senha", show="•")
        self.password_input.grid(row=3, column=0, pady=8, padx=32, sticky="ew")

        self.error_label = Caption(card, "", text_color="#DC2626")
        self.error_label.grid(row=4, column=0, pady=(8, 16), padx=32)

        PrimaryButton(card, text="Entrar", command=lambda: asyncio.create_task(self._handle_login())).grid(row=5, column=0, pady=8, padx=32, sticky="ew")

        SecondaryButton(card, text="Criar conta", command=self.on_switch_to_register).grid(row=6, column=0, pady=(8, 32), padx=32, sticky="ew")

    async def _handle_login(self):
        email = self.email_input.get().strip()
        password = self.password_input.get()

        if not email or not password:
            self._show_error("Preencha todos os campos")
            return

        self._set_loading(True)
        self._show_error("")

        success, error = await self.on_login(email, password)
        self._set_loading(False)

        if error:
            self._show_error(error)

    def _show_error(self, message: str):
        self.error_label.configure(text=message)

    def _set_loading(self, loading: bool):
        # Could add loading state to button
        pass