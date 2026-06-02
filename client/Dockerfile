FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files
COPY client/package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY client/ ./

# Build the application
RUN npm run build

# Runtime stage
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app from builder
COPY --from=builder /build/dist /usr/share/nginx/html

# Copy custom NGINX configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
