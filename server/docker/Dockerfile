# Production-ready Dockerfile for eagowl-poc-server (Hostinger-proof)

########## 1) Build stage ##########
FROM node:20-alpine AS production
WORKDIR /app

# toolchain por si alguna dependencia requiere compilación nativa
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Prisma (si existe), evita errores en runtime
RUN if [ -d "prisma" ]; then npx prisma generate; else echo "no prisma/ directory"; fi

# Build con salida explícita en logs (Hostinger suele truncar)
RUN npm run build --silent || ( \
  echo "===== BUILD FAILED: showing context =====" && \
  echo "--- Node/NPM ---" && node -v && npm -v && \
  echo "--- package.json scripts ---" && node -e "console.log(require('./package.json').scripts)" && \
  echo "--- tsconfig.json (if any) ---" && (ls -la && (cat tsconfig.json || true)) && \
  echo "--- First l
