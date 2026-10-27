# ── Backend Dockerfile: Node.js + Express ─────────────────────────────────────
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Configure default production environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json ./

# Install production dependencies using existing lockfile
RUN npm ci --omit=dev

# Copy application source files
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/

# Expose backend port
EXPOSE 5000

# Start server using existing entry point
CMD ["node", "server.js"]
