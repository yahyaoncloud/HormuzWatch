# syntax=docker/dockerfile:1
# HormuzWatch Python ML Service v2.0.0
# Build:  docker build -f ml-service/Dockerfile -t hormuzwatch-ml:2.0.0 ml-service/
# Run:    docker run -p 8090:8090 -p 8091:8091 hormuzwatch-ml:2.0.0

FROM python:3.11-slim

ARG VERSION=2.0.0
ARG BUILD_TIME

LABEL org.hormuzwatch.version=${VERSION} \
      org.hormuzwatch.component=ml-service

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MPLCONFIGDIR=/tmp \
    ML_PORT=8090 \
    GRPC_PORT=8091 \
    APP_VERSION=${VERSION}

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl procps \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r hormuz && useradd -r -g hormuz hormuz

# Install Python deps first (cached layer)
COPY --chown=hormuz:hormuz requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code with ownership (single layer)
COPY --chown=hormuz:hormuz . .
RUN mkdir -p /app/models /app/logs

USER hormuz

EXPOSE 8090 8091

CMD ["python", "service_entrypoint.py"]
