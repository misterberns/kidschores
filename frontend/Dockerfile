# Stage 1: Build frontend assets
FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS builder

WORKDIR /build

# Copy package files for dependency caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build (Vite reads .env.production automatically)
COPY . .

RUN npm run build

# Stage 2: Serve with unprivileged nginx (runs as uid 101, listens on 8080)
FROM nginxinc/nginx-unprivileged:1.31-alpine@sha256:592b23aa79a6e6c08ba4b20f1fff700e1328895705966722608e115d62e52d39

# nginx config is a template, rendered at startup (0.18.1). Only KC_* variables are
# substituted. KC_FRAME_ANCESTORS = which sites may frame the app (default 'self');
# the .envsh validates it and falls back to 'self' before the template renders.
# It renders into /tmp/kc-nginx, NOT /etc/nginx/conf.d: the rootfs may be read-only
# (our compose sets read_only: true), while /tmp must be writable anyway because this
# image keeps its pid file and temp paths there. conf.d/default.conf only includes it.
ENV NGINX_ENVSUBST_FILTER="^KC_"     NGINX_ENVSUBST_OUTPUT_DIR="/tmp/kc-nginx"     KC_FRAME_ANCESTORS="'self'"
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=0755 docker/05-kc-frame-ancestors.envsh /docker-entrypoint.d/05-kc-frame-ancestors.envsh
# Built assets
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 8080

# Use 127.0.0.1 (IPv4) — busybox wget resolves `localhost` to IPv6 [::1] first, but
# nginx listens on IPv4 only, so `localhost` false-fails and the container
# reads unhealthy → Traefik's Docker provider drops the router (→ 404). This is the
# baked-in image healthcheck that applies on a `docker save`→Portainer-load deploy.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --spider -q http://127.0.0.1:8080 || exit 1
