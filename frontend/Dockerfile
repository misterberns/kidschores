# Stage 1: Build frontend assets
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS builder

WORKDIR /build

# Copy package files for dependency caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build (Vite reads .env.production automatically)
COPY . .

RUN npm run build

# Stage 2: Serve with unprivileged nginx (runs as uid 101, listens on 8080)
FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:592b23aa79a6e6c08ba4b20f1fff700e1328895705966722608e115d62e52d39

# Copy nginx config and built assets
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 8080

# Use 127.0.0.1 (IPv4) — busybox wget resolves `localhost` to IPv6 [::1] first, but
# nginx listens on IPv4 only, so `localhost` false-fails and the container
# reads unhealthy → Traefik's Docker provider drops the router (→ 404). This is the
# baked-in image healthcheck that applies on a `docker save`→Portainer-load deploy.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --spider -q http://127.0.0.1:8080 || exit 1
