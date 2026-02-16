# Stage 1: Build frontend assets
FROM node:22-alpine AS builder

WORKDIR /build

# Copy package files for dependency caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# Vite bakes VITE_* env vars at build time
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_REDIRECT_ORIGIN
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_GOOGLE_REDIRECT_ORIGIN=$VITE_GOOGLE_REDIRECT_ORIGIN

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:1.27-alpine

# Copy nginx config and built assets
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --spider -q http://localhost:80 || exit 1
