# syntax=docker/dockerfile:1
# HormuzWatch React Frontend v2.0.0
# Multi-stage: Node 20 build → Nginx Alpine serve
# Build:  docker build -f client-v2/Dockerfile -t hormuzwatch-client:2.0.0 client-v2/
# Run:    docker run -p 3000:3000 hormuzwatch-client:2.0.0

ARG NODE_VERSION=20
ARG NGINX_VERSION=alpine

FROM node:${NODE_VERSION}-alpine AS builder

ARG VITE_API_BASE_URL=http://localhost:10020
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_VERSION=2.0.0

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY} \
    VITE_APP_VERSION=${VITE_APP_VERSION}

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM nginx:${NGINX_VERSION}

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /build/build/client /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
