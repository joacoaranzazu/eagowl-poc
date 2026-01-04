<<<<<<< HEAD
# Optimized production Dockerfile (fixed)
# - Removes invalid "..."
# - Correct layer caching
# - Multi-stage: build with dev deps, run with prod deps only
# - Installs curl for healthcheck
# - Runs as non-root

########## 1) Dependencies (prod + dev) ##########
FROM node:18-alpine AS deps
WORKDIR /app

# Copy manifests first for better caching
COPY package*.json ./

# Install all deps (needed to build)
RUN npm ci --legacy-peer-deps


########## 2) Build ##########
FROM node:18-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application (expects dist/)
RUN npm run build


########## 3) Production runtime ##########
=======
# Production-ready Dockerfile for eagowl-poc-server

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
>>>>>>> ad4b37d8f27af75b211c9a54f8f9e24f726af791
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

<<<<<<< HEAD
# Install curl for HEALTHCHECK (and CA certs)
RUN apk add --no-cache curl ca-certificates

# Copy manifests and node_modules from deps, then prune dev deps.
# This avoids @prisma/client postinstall issues in prod-only installs.
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

# Copy built output
COPY --from=build /app/dist ./dist
=======
RUN apk add --no-cache curl ca-certificates

COPY package*.json ./
RUN npm ci --production --legacy-peer-deps && npm cache clean --force

COPY --from=build /app/dist ./dist

# Si necesitas otros assets en runtime, agrégalos aquí (ej: prisma, public, etc.)
# COPY --from=build /app/prisma ./prisma
>>>>>>> ad4b37d8f27af75b211c9a54f8f9e24f726af791

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 -G nodejs nodejs

USER nodejs

<<<<<<< HEAD
# Health check
=======
>>>>>>> ad4b37d8f27af75b211c9a54f8f9e24f726af791
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

EXPOSE 8080 9090 9998

<<<<<<< HEAD
# Start application (full server)
CMD ["node", "dist/main.js"]
=======
CMD ["npm", "start"]
>>>>>>> ad4b37d8f27af75b211c9a54f8f9e24f726af791
