
# Build application (expects dist/)
RUN npm run build


########## 3) Production runtime ##########
FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install curl for HEALTHCHECK (and CA certs)
RUN apk add --no-cache curl ca-certificates

# Copy manifests and node_modules from deps, then prune dev deps.
# This avoids @prisma/client postinstall issues in prod-only installs.
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

# Copy built output
COPY --from=build /app/dist ./dist

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 -G nodejs nodejs

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

EXPOSE 8080 9090 9998

# Start application (full server)
CMD ["node", "dist/main.js"]
