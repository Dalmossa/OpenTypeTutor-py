from dataclasses import dataclass


@dataclass
class KeyMapping:
    key: str
    logical_key: str
    shift_key: str | None = None
    altgr_key: str | None = None
    dead_key: str | None = None


LAYOUTS = {
    "ABNT2": {
        "rows": [
            ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
            ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
            ["CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", "ç", ";", "'", "Enter"],
            ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", ":", "?/Shift"],
            ["Ctrl", "Win", "Alt", "Space", "AltGr", "Menu", "Ctrl"],
        ],
        "dead_keys": {
            "`": ["a", "e", "i", "o", "u"],  # crase
            "'": ["a", "e", "i", "o", "u", "c"],  # acento agudo / cedilha
            "^": ["a", "e", "i", "o", "u"],  # circunflexo
            "~": ["a", "o"],  # til
            '"': ["a", "e", "i", "o", "u"],  # trema
        },
    },
    "US-International": {
        "rows": [
            ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
            ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
            ["CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
            ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
            ["Ctrl", "Win", "Alt", "Space", "Alt", "Menu", "Ctrl"],
        ],
        "dead_keys": {
            "`": ["a", "e", "i", "o", "u"],
            "'": ["a", "e", "i", "o", "u", "c"],
            "^": ["a", "e", "i", "o", "u"],
            "~": ["a", "o", "n"],
            '"': ["a", "e", "i", "o", "u"],
        },
    },
    "US": {
        "rows": [
            ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
            ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
            ["CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
            ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
            ["Ctrl", "Win", "Alt", "Space", "Alt", "Menu", "Ctrl"],
        ],
        "dead_keys": {},
    },
}


def get_layout(layout_name: str) -> dict:
    return LAYOUTS.get(layout_name, LAYOUTS["ABNT2"])


def get_dead_keys(layout_name: str) -> dict[str, list[str]]:
    return LAYOUTS.get(layout_name, LAYOUTS["ABNT2"]).get("dead_keys", {})


def is_dead_key(layout_name: str, key: str) -> bool:
    return key in get_dead_keys(layout_name)


def get_composed_char(layout_name: str, dead_key: str, base_key: str) -> str | None:
    compositions = {
        "ABNT2": {
            ("`", "a"): "à", ("`", "e"): "è", ("`", "i"): "ì", ("`", "o"): "ò", ("`", "u"): "ù",
            ("'", "a"): "á", ("'", "e"): "é", ("'", "i"): "í", ("'", "o"): "ó", ("'", "u"): "ú", ("'", "c"): "ç",
            ("^", "a"): "â", ("^", "e"): "ê", ("^", "i"): "î", ("^", "o"): "ô", ("^", "u"): "û",
            ("~", "a"): "ã", ("~", "o"): "õ",
            ('"', "a"): "ä", ('"', "e"): "ë", ('"', "i"): "ï", ('"', "o"): "ö", ('"', "u"): "ü",
        },
        "US-International": {
            ("`", "a"): "à", ("`", "e"): "è", ("`", "i"): "ì", ("`", "o"): "ò", ("`", "u"): "ù",
            ("'", "a"): "á", ("'", "e"): "é", ("'", "i"): "í", ("'", "o"): "ó", ("'", "u"): "ú", ("'", "c"): "ç",
            ("^", "a"): "â", ("^", "e"): "ê", ("^", "i"): "î", ("^", "o"): "ô", ("^", "u"): "û",
            ("~", "a"): "ã", ("~", "o"): "õ", ("~", "n"): "ñ",
            ('"', "a"): "ä", ('"', "e"): "ë", ('"', "i"): "ï", ('"', "o"): "ö", ('"', "u"): "ü",
        },
    }
    return compositions.get(layout_name, {}).get((dead_key, base_key))