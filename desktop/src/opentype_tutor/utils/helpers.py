import time
from datetime import datetime


def format_duration(ms: int) -> str:
    seconds = ms // 1000
    minutes = seconds // 60
    hours = minutes // 60
    seconds %= 60
    minutes %= 60

    if hours > 0:
        return f"{hours}h {minutes}m"
    elif minutes > 0:
        return f"{minutes}m {seconds}s"
    else:
        return f"{seconds}s"


def format_timestamp(iso_string: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
        return dt.strftime("%d/%m/%Y %H:%M")
    except Exception:
        return iso_string


def calculate_wpm(chars: int, duration_ms: int) -> float:
    if duration_ms <= 0:
        return 0.0
    minutes = duration_ms / 60000
    words = chars / 5
    return words / minutes


def calculate_accuracy(correct: int, total: int) -> float:
    if total <= 0:
        return 100.0
    return (correct / total) * 100


def debounce(wait_ms: int):
    def decorator(func):
        last_call = [0]

        def wrapper(*args, **kwargs):
            now = time.monotonic() * 1000
            if now - last_call[0] >= wait_ms:
                last_call[0] = now
                return func(*args, **kwargs)
        return wrapper
    return decorator


def throttle(wait_ms: int):
    def decorator(func):
        last_call = [0]
        last_result = [None]

        def wrapper(*args, **kwargs):
            now = time.monotonic() * 1000
            if now - last_call[0] >= wait_ms:
                last_call[0] = now
                last_result[0] = func(*args, **kwargs)
            return last_result[0]
        return wrapper
    return decorator