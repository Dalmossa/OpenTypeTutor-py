import logging

import customtkinter as ctk

logger = logging.getLogger(__name__)


class BaseView:
    def __init__(self, parent: ctk.CTkBaseClass):
        self.parent = parent
        self.frame: ctk.CTkFrame | None = None

    def create_frame(self, **kwargs) -> ctk.CTkFrame:
        frame = ctk.CTkFrame(self.parent, **kwargs)
        self.frame = frame
        return frame

    def pack(self, **kwargs):
        if self.frame:
            self.frame.pack(**kwargs)

    def grid(self, **kwargs):
        if self.frame:
            self.frame.grid(**kwargs)

    def destroy(self):
        if self.frame:
            self.frame.destroy()
            self.frame = None


class BaseFrame(ctk.CTkFrame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self._setup_grid()

    def _setup_grid(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)


class BaseWindow(ctk.CTk):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.title("OpenType Tutor")
        self.geometry("1200x800")
        self.minsize(1000, 700)
        self._center_window()

    def _center_window(self):
        self.update_idletasks()
        width = self.winfo_width()
        height = self.winfo_height()
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")