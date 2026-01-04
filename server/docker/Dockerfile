# Optimized production Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies with cache
RUN npm install --production --legacy-peer-deps

# Copy package files first (better layer caching)
COPY package*.json ./
RUN npm ci --production --legacy-peer-deps

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 -G nodejs nodejs

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Expose ports
EXPOSE 8080 9090 9998

# Start application
CMD ["node", "dist/main-simple.js"]