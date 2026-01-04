FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

FROM node:18-alpine AS build
WORKDIR /app

# toolchain para módulos nativos (bcrypt, sharp, canvas, etc.)
RUN apk add --no-cache python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# imprime info útil si falla
RUN node -v && npm -v
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache curl ca-certificates

COPY package*.json ./
RUN npm ci --production --legacy-peer-deps && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 -G nodejs nodejs
USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8080/health || exit 1

EXPOSE 8080 9090 9998
CMD ["node", "dist/main-simple.js"]
