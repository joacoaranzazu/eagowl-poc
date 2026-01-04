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
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install curl for HEALTHCHECK (and CA certs)
RUN apk add --no-cache curl ca-certificates

# Copy only manifests and install prod deps only
COPY package*.json ./
RUN npm ci --production --legacy-peer-deps && npm cache clean --force

# Copy built output + any runtime-needed assets
COPY --from=build /app/dist ./dist

# If your app needs other runtime files (e.g. prisma, public, views), uncomment/add:
# COPY --from=build /app/prisma ./prisma
# COPY --from=build /app/public ./public
# COPY --from=build /app/uploads ./uploads

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
CMD ["node", "dist/main-simple.js"]

