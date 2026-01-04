# Production-ready Dockerfile for eagowl-poc-server (Hostinger-proof)

########## 1) Build stage ##########
FROM node:20-alpine AS build
WORKDIR /app

# Toolchain por si alguna dependencia requiere compilación nativa
RUN apk add --no-cache python3 make g++

# Instala todas las dependencias (incluye devDependencies para tsc)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copia el código y construye
COPY . .

# Prisma (si existe), genera el client
RUN if [ -d "prisma" ]; then npx prisma generate; else echo "no prisma/ directory"; fi

# Build con logs útiles si falla
RUN npm run build || ( \
  echo "===== BUILD FAILED: context =====" && \
  echo "--- Node/NPM ---" && node -v && npm -v && \
  echo "--- package.json scripts ---" && node -e "console.log(require('./package.json').scripts)" && \
  echo "--- tsconfig.json ---" && (ls -la && (cat tsconfig.json || true)) && \
  echo "===== END CONTEXT =====" && \
  exit 2 \
)

########## 2) Production runtime ##########
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache curl ca-certificates

# Instala SOLO dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copia build output
COPY --from=build /app/dist ./dist

# Prisma runtime files (si existen)
COPY --from=build /app/prisma ./prisma 2>/dev/null || true

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

EXPOSE 8080 9998

# Tu app principal según package.json
CMD ["node", "dist/main-simple.js"]
