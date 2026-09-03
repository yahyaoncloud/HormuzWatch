# syntax=docker/dockerfile:1
# HormuzWatch Go Backend v2.0.0
# Multi-stage build: Go 1.23 → minimal Alpine runtime
# Build:  docker build -f server/Dockerfile -t hormuzwatch-server:2.0.0 .
# Run:    docker run -p 10020:10020 --env-file .env hormuzwatch-server:2.0.0

ARG ALPINE_VERSION=3.21

FROM golang:alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . ./

ARG VERSION=2.0.0
ARG BUILD_TIME
ARG GIT_COMMIT

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath \
    -ldflags="-w -s \
      -X main.Version=${VERSION} \
      -X main.BuildTime=${BUILD_TIME} \
      -X main.GitCommit=${GIT_COMMIT}" \
    -o /out/hormuz-server ./cmd/

FROM alpine:${ALPINE_VERSION}

RUN apk add --no-cache ca-certificates tzdata curl

RUN addgroup -S hormuz && adduser -S hormuz -G hormuz
USER hormuz

WORKDIR /app

COPY --from=builder /out/hormuz-server .

# data/ and templates/ are mounted as volumes at runtime (see docker-compose)
# COPY data/ ./data/
# COPY templates/ ./templates/

ENV GIN_MODE=release \
    PORT=10020 \
    AUTH_DISABLED=false

EXPOSE 10020

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -sf http://localhost:${PORT}/health || exit 1

CMD ["./hormuz-server"]
