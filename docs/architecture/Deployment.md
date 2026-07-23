# Deployment & Production Architecture

## Production Environment Setup
The application is packaged as a multi-stage Docker container served via Nginx.

## Docker Build Pipeline
```dockerfile
# Stage 1: Build static bundle with React Router v8
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Routing Strategy
Nginx is configured to fallback all unhandled SPA routes to `index.html` to allow React Router v8 Framework client-side routing:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
