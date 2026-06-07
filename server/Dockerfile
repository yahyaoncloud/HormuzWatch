# Multi-stage build for Go server
FROM golang:1.23-alpine AS builder

# Install git for go mod download
RUN apk add --no-cache git

WORKDIR /build

# Copy source code (includes go.mod)
COPY . ./
# Tidy dependencies based on actual imports
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o harmuz-server ./cmd/main.go

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /build/harmuz-server .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080

ENV PORT=8080 \
    AUTH_DISABLED=true

CMD ["./harmuz-server"]
