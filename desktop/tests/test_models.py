import pytest

from opentype_tutor.models.auth import LoginRequest, RegisterRequest
from opentype_tutor.models.lesson import Difficulty, Lesson, LessonType
from opentype_tutor.models.progress import MasteryState
from opentype_tutor.models.session import SessionStatus
from opentype_tutor.utils.helpers import calculate_accuracy, calculate_wpm, format_duration
from opentype_tutor.utils.keyboard_layout import get_composed_char, get_layout, is_dead_key


class TestModels:
    def test_login_request(self):
        req = LoginRequest(email="test@example.com", password="password123")
        assert req.email == "test@example.com"
        assert req.password == "password123"

    def test_register_request(self):
        req = RegisterRequest(name="Test User", email="test@example.com", password="password123")
        assert req.name == "Test User"

    def test_lesson_model(self):
        from uuid import uuid4
        lesson = Lesson(
            id=uuid4(),
            type=LessonType.GUIDED,
            difficulty=Difficulty.BEGINNER,
            target_keys=["a", "b", "c"],
            content="abc",
            layout="ABNT2",
            order=1,
            created_at="2024-01-01T00:00:00",
        )
        assert lesson.type == LessonType.GUIDED
        assert lesson.difficulty == Difficulty.BEGINNER

    def test_session_status_enum(self):
        assert SessionStatus.CREATED == "CREATED"
        assert SessionStatus.ACTIVE == "ACTIVE"
        assert SessionStatus.COMPLETED == "COMPLETED"

    def test_mastery_state_enum(self):
        assert MasteryState.UNKNOWN == "UNKNOWN"
        assert MasteryState.LEARNING == "LEARNING"
        assert MasteryState.MASTERED == "MASTERED"


class TestKeyboardLayout:
    def test_get_layout_abnt2(self):
        layout = get_layout("ABNT2")
        assert "rows" in layout
        assert "dead_keys" in layout
        assert len(layout["rows"]) == 5

    def test_get_layout_us_international(self):
        layout = get_layout("US-International")
        assert "rows" in layout
        assert "dead_keys" in layout

    def test_is_dead_key(self):
        assert is_dead_key("ABNT2", "'") is True
        assert is_dead_key("ABNT2", "a") is False

    def test_get_composed_char(self):
        assert get_composed_char("ABNT2", "'", "a") == "á"
        assert get_composed_char("ABNT2", "`", "a") == "à"
        assert get_composed_char("ABNT2", "^", "a") == "â"
        assert get_composed_char("ABNT2", "~", "a") == "ã"
        assert get_composed_char("US-International", "'", "c") == "ç"
        assert get_composed_char("ABNT2", "x", "a") is None


class TestHelpers:
    def test_format_duration(self):
        assert format_duration(0) == "0s"
        assert format_duration(1000) == "1s"
        assert format_duration(60000) == "1m 0s"
        assert format_duration(3600000) == "1h 0m"

    def test_calculate_wpm(self):
        assert calculate_wpm(0, 1000) == 0.0
        assert calculate_wpm(250, 60000) == 50.0  # 250 chars = 50 words in 1 min = 50 WPM
        # 500 chars = 100 words in 1 min = 100 WPM
        assert calculate_wpm(500, 60000) == 100.0

    def test_calculate_accuracy(self):
        assert calculate_accuracy(100, 100) == 100.0
        assert calculate_accuracy(90, 100) == 90.0
        assert calculate_accuracy(0, 100) == 0.0
        assert calculate_accuracy(0, 0) == 100.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])