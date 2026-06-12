# syntax=docker/dockerfile:1

FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /src/server

COPY go.mod go.sum ./
RUN go mod download

COPY . ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /out/hormuz-server ./cmd

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /app

COPY --from=builder /out/hormuz-server ./hormuz-server
COPY data ./data

ENV GIN_MODE=release \
    PORT=10000 \
    AUTH_DISABLED=true

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT:-10000}/health" || exit 1

CMD ["./hormuz-server"]
