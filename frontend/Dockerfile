# Stage 1: Build frontend assets
FROM node:22-alpine AS builder

WORKDIR /build

# Copy package files for dependency caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build (Vite reads .env.production automatically)
COPY . .

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.27-alpine

# Copy nginx config and built assets
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80

# Use 127.0.0.1 (IPv4) — busybox wget resolves `localhost` to IPv6 [::1] first, but
# nginx listens on IPv4 only (`listen 80;`), so `localhost` false-fails and the container
# reads unhealthy → Traefik's Docker provider drops the router (→ 404). This is the
# baked-in image healthcheck that applies on a `docker save`→Portainer-load deploy.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --spider -q http://127.0.0.1:80 || exit 1
