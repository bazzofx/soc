# ---- Stage 1: build the static app ---------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

#Install Net Tools
RUN apk add bash curl wget nano vim iproute2 iputils bind-tools net-tools procps lsof

# pnpm (pin major for reproducible lockfile behaviour)
RUN npm install --global pnpm@11 --silent

# Install dependencies first for better layer caching
COPY app/package.json app/pnpm-lock.yaml app/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy sources (node_modules / dist excluded via .dockerignore)
COPY app/ .

# Production build -> /app/dist (data bundles under public/data are included)
RUN pnpm build

# ---- Stage 2: serve with nginx ------------------------------------------
FROM nginx:alpine

# nginx site config (gzip, asset caching, SPA fallback)
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
