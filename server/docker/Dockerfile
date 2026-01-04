# Production-ready Dockerfile for eagowl-poc-server
# Simplified to avoid dependency conflicts

########## 1) Build stage ##########
FROM node:18-alpine AS build
WORKDIR /app

# Install all dependencies for building
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

########## 2) Production runtime ##########
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install curl for healthcheck
RUN apk add --no-cache curl ca-certificates

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && \
    npm cache clean --force

# Copy built application
COPY --from=build /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080 9998

CMD ["node", "dist/main.js"]