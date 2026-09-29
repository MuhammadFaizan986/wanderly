FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv

WORKDIR /app

# Dependencies first for layer caching.
COPY pyproject.toml uv.lock ./
# No BuildKit cache mount: Railway rejects cache mounts without its own service-id prefix.
RUN uv sync --frozen --no-dev --no-cache

COPY . .

RUN useradd --create-home --uid 1000 wanderly && chown -R wanderly /app
USER wanderly

EXPOSE 8000
# Migrations and seed data run on container start so a fresh deploy is ready to demo.
CMD ["sh", "scripts/start.sh"]
