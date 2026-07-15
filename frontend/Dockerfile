# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:22-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY certs/ca.crt /usr/local/share/ca-certificates/custom-ca.crt
RUN update-ca-certificates

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/
RUN npm run build

# --- Serve stage ---
FROM nginx:1.27

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY certs/ca.crt /usr/local/share/ca-certificates/custom-ca.crt
RUN update-ca-certificates

COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
