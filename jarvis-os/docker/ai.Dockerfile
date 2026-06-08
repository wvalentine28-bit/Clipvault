FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    portaudio19-dev \
    ffmpeg \
    libsndfile1 \
    chromium \
    chromium-driver \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Playwright deps
RUN pip install playwright && playwright install chromium

# Python dependencies
COPY services/ai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY services/ai/ .

ENV PYTHONPATH=/app
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/lib/chromium

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
