# ── WARG AI Engine — Production Dockerfile ──────────────────────
# Runs the FastAPI CV service on CPU-only PyTorch.
# Target platforms: Google Cloud Run, AWS Lightsail, any Docker host.
# Expected minimum RAM: 1 GB (recommended: 2 GB)
# ────────────────────────────────────────────────────────────────

FROM python:3.11-slim AS base

# Prevent Python from buffering stdout/stderr (better for container logs)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies required by OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Python dependencies ─────────────────────────────────
# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy application code & model weights ───────────────────────
COPY main.py .
COPY vision/ ./vision/
COPY weights/ ./weights/

# ── Expose port & launch ────────────────────────────────────────
# Cloud Run injects $PORT; default to 8080 for convention
ENV PORT=8080
EXPOSE ${PORT}

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
