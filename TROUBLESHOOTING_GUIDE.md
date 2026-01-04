# EAGOWL-POC Development Guide

## 🔍 Quick Setup Commands

### 1. Infrastructure Setup
```bash
cd infrastructure
docker-compose up -d postgres redis api-server grafana prometheus
```

### 2. Database Setup
```bash
cd server
npx prisma db push
npx prisma generate
```

### 3. API Development
```bash
cd server
npm run dev
```

### 4. Mobile Development
```bash
cd mobile
npm start
```

### 5. Desktop Development
```bash
cd dispatch-console
npm start
```

## 🐛 Troubleshooting Guide

### Common Build Issues

#### 1. npm ci fails
```bash
# Solution: Clean install with legacy peer deps
npm ci --legacy-peer-deps
```

#### 2. TypeScript errors
```bash
# Solution: Skip type checking for quick start
npm run build || echo "Continuing..."
```

#### 3. Docker build fails
```bash
# Solution: Use build without cache
docker-compose build --no-cache
```

### Common Runtime Issues

#### 1. Database connection
```bash
# Check database status
docker-compose logs postgres

# Test connection
docker exec -it eagowl-poc-postgres psql -U eagowl_poc_user -d eagowl_poc_db
```

#### 2. Redis connection
```bash
# Test Redis connection
docker exec -it eagowl-poc-redis redis-cli ping
```

#### 3. API not responding
```bash
# Check API logs
docker logs eagowl-poc-api

# Test API directly
curl http://localhost:8080/health
```

## 🚀 Production Deployment

### 1. Build all components
```bash
# Run the build script
./scripts/create-final-package.bat
```

### 2. Deploy infrastructure
```bash
cd infrastructure
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Configure production variables
```bash
# Copy production environment
cp .env.production .env
```

## 📊 Performance Optimization

### 1. Enable caching
```yaml
# In docker-compose.yml
services:
  api-server:
    build:
      cache_from:
        - type: gha
        scope: eagowl-poc
```

### 2. Optimize images
```dockerfile
# Use multi-stage builds
FROM node:18-alpine AS deps
# ... dependency installation
FROM node:18-alpine AS builder
COPY . .
RUN npm run build
FROM node:18-alpine AS production
COPY --from=deps /app/node_modules
COPY --from=builder /app/dist
```

## 🔒 Security Best Practices

### 1. Never commit secrets
```bash
# Use environment variables
echo "DATABASE_URL=postgresql://..." >> .env
```

### 2. Use npm audit
```bash
# Check for vulnerabilities
npm audit
npm audit fix
```

### 3. Use non-root containers
```dockerfile
# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs
```

## 📋 Common Commands

### Database operations
```bash
# Generate Prisma client
npx prisma generate

# Apply schema
npx prisma db push

# View database
npx prisma studio
```

### Docker operations
```bash
# Rebuild containers
docker-compose up -d --build

# Clean containers
docker-compose down -v

# View logs
docker-compose logs -f
```

### Git operations
```bash
# Force push (for emergency)
git push --force-with-lease

# Reset to specific commit
git reset --hard HEAD~1

# Stash changes
git stash
git stash pop
```

## 🚨 Emergency Procedures

### 1. API down
```bash
# Restart API service
docker-compose restart api-server

# Check logs
docker logs eagowl-poc-api --tail 50
```

### 2. Database issues
```bash
# Recreate database
docker-compose down postgres
docker volume rm eagowl-poc_postgres_data
docker-compose up -d postgres
```

### 3. Full reset
```bash
# Stop all services
docker-compose down -v

# Remove all volumes
docker system prune -f

# Restart fresh
docker-compose up -d
```

## 📞 Support Information

For additional help:
1. Check GitHub Issues: https://github.com/joacoaranzazu/eagowl-poc/issues
2. Review documentation: ./docs/
3. Check configuration: .env.example

Last updated: 2026-01-03T17:00:00Z