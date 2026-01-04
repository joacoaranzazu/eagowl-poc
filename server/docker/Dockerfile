# Production-ready Dockerfile for eagowl-poc-server
# Updated: 2026-01-04 to fix npm prune compatibility issues

########## 1) deps (install all deps incl. dev for build) ##########
FROM node:18-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

########## 2) build (compile TypeScript) ##########
FROM node:18-alpine AS build
WORKDIR /app

# toolchain por si alguna dependencia intenta compilar binarios (seguro y barato)
RUN apk add --no-cache python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

########## 3) production runtime (only prod deps) ##########
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install curl for HEALTHCHECK (and CA certs)
RUN apk add --no-cache curl ca-certificates

# Install production dependencies only
# This avoids @prisma/client postinstall issues in prod-only installs.
COPY package*.json ./
RUN npm ci --production --legacy-peer-deps && npm cache clean --force

# Copy built output
COPY --from=build /app/dist ./dist

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 -G nodejs nodejs

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

# Expose ports
EXPOSE 8080 9090 9998

# Start application
CMD ["node", "dist/main.js"]