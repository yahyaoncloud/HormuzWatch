# syntax=docker/dockerfile:1
# Unified HormuzWatch ML Service (merged ml-service + ml-inference)

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    GRPC_PORT=8090 \
    HTTP_PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p models

EXPOSE 8090 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import socket; s = socket.create_connection(('127.0.0.1', 8090), 2); s.close()" || exit 1

CMD ["python", "service_entrypoint.py"]
