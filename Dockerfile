# =============================================================================
#  SOC Investigation Bootcamp — static build exporter
#
#  There is NO web server inside this image. It only:
#    1. builds the app with Node/pnpm                 (stage: build)
#    2. keeps the compiled static files                (stage: static)
#    3. copies them into the host directory at /out    (CMD below)
#
#  Your existing host nginx then serves /var/www/soc-bootcamp — see
#  deploy/soc_bootcamp.conf (installed at /etc/nginx/conf.d/soc_bootcamp.conf).
#
#  Typical use:
#    docker build -t soc-bootcamp .
#    docker run --rm -v /var/www/soc-bootcamp:/out soc-bootcamp
#
#  (The image tag is optional: `-t soc-bootcamp` gives you soc-bootcamp:latest;
#   use versions like `-t soc-bootcamp:v1.2` if you prefer.)
#
#  Alternative (no container run, needs BuildKit):
#    docker build --target static --output type=local,dest=./deploy-out .
#    # → files land in ./deploy-out/srv/soc-app
# =============================================================================

# ---- Stage 1: build the static app ---------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Net/debug tooling (handy when troubleshooting a build in this stage)
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

# ---- Stage 2: collect the static files -----------------------------------
FROM alpine:3.20 AS static

WORKDIR /srv
COPY --from=build /app/dist ./soc-app

# Copy the built site to the host directory mounted at /out
CMD ["sh", "-c", "if [ ! -d /out ]; then echo 'ERROR: mount a host directory to /out (e.g. -v /var/www/soc-bootcamp:/out)' >&2; exit 1; fi; mkdir -p /out && cp -a /srv/soc-app/. /out/ && echo \"Deployed $(find /out -type f | wc -l) files to /out\" && echo 'Now point your host nginx root at /var/www/soc-bootcamp (see deploy/soc_bootcamp.conf).'"]
