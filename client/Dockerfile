# ── Stage 1: Build React + Vite SPA ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies required for Vite build)
RUN npm ci

# Copy frontend source code
COPY . .

# Configurable build argument for API URL (empty defaults to Nginx reverse-proxy)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN npm run build

# ── Stage 2: Serve via Nginx Web Server ──────────────────────────────────────
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose frontend port 5173
EXPOSE 5173

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
