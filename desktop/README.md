# OpenType Tutor Desktop

Frontend desktop application for OpenType Tutor built with customtkinter.

## Architecture (MVC — ADR-018)

A apresentação segue o **protocolo MVC** (ver `ADR.md` ADR-018): Views→Controllers→Services→REST — nenhuma regra de negócio (RN14 idempotência, RN22 insufficient-data, RN16/17 auth/posse) é reimplementada no cliente; ela é consumida via REST.

```
src/opentype_tutor/
├── models/       # Model — DTOs (Pydantic), espelho dos contratos REST
├── views/        # View — telas (screens/), componentes e theme (customtkinter)
├── controllers/  # Controller — orquestração de eventos/estado (BaseController + AppState)
├── services/     # transporte REST (ApiClient, Auth/Lesson/Session/ProgressService)
├── config/       # settings + temas
└── utils/        # parsers de teclado e layout (ABNT2/US-INTERNATIONAL)
```

Mapeamento:
| Camada MVC | Pasta desktop | Responsabilidade |
|---|---|---|
| Model | `models/` | DTOs Pydantic, sem lógica de domínio |
| View | `views/` | Renderização e captura de eventos |
| Controller | `controllers/` | Orquestração, validação de apresentação, `AppState` compartilhado |
| Services | `services/` | HTTP REST e mapeamento de erros do backend |

## Development

```bash
# Install dependencies
uv sync

# Run in development mode
uv run python -m opentype_tutor.main

# Run tests
uv run pytest

# Lint
uv run ruff check src/

# Type check
uv run mypy src/
```

## Build

```bash
# Build with Nuitka (recommended)
uv run python -m scripts.build --tool nuitka --version 0.1.0

# Build with PyInstaller
uv run python -m scripts.build --tool pyinstaller --version 0.1.0
```

## Icons

```bash
# Download and convert Heroicons
uv run python -m scripts.icons --download --convert --ico
```