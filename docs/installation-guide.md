# EAGOWL-POC Installation and Setup Guide

## 🚀 Quick Start

### 1. Extract the Package

```bash
# Extract the downloaded package
tar -xzf eagowl-poc-v1.0.tar.gz
cd eagowl-poc-v1.0
```

### 2. Run the Installation Script

```bash
# Linux/macOS
chmod +x infrastructure/install.sh
sudo ./infrastructure/install.sh

# Windows (as Administrator)
infrastructure\install.bat
```

### 3. Access EAGOWL-POC

- **Web Console**: http://localhost
- **API Server**: http://localhost:8080
- **Monitoring**: http://localhost:3001 (Grafana)
- **Default Login**: admin / admin123

---

## 📋 System Requirements

### Minimum Requirements
- **RAM**: 8GB (16GB+ recommended for 1000+ users)
- **Storage**: 100GB SSD (500GB+ for full logging/recording)
- **CPU**: 4+ cores (8+ cores recommended)
- **OS**: Linux (Ubuntu 20.04+), CentOS 8+, Windows Server 2019+

### Network Requirements
- **Internet**: Required for mobile connectivity
- **Internal Network**: 1Gbps+ for optimal performance
- **Firewall**: Open ports 80, 443, 8080, 9998, 5432, 6379

---

## 🖥️ Application Setup

### Mobile Apps

1. **Download APKs** from `mobile-apks/` directory
2. **Install** on Android devices:
   - `EagowlPOC-arm64-v8a-v1.0.apk` (Modern devices)
   - `EagowlPOC-armeabi-v7a-v1.0.apk` (Legacy devices)
3. **Configure server URL**: http://your-server-ip
4. **Login with provided credentials**

### Desktop Console

1. **Linux**: Run `EagowlPOC-Console-v1.0.AppImage`
2. **Windows**: Install `EagowlPOC-Console-Setup-v1.0.exe`
3. **macOS**: Open `EagowlPOC-Console-v1.0.dmg`
4. **Login with admin credentials**

### Web Interface

1. Open browser to `http://your-server-ip`
2. **Default credentials**:
   - Username: admin
   - Password: admin123
3. **Change default password** immediately

---

## 🔧 Configuration

### Environment Variables

Edit `infrastructure/.env`:

```bash
# Database
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=eagowl_poc_db
POSTGRES_USER=eagowl_poc_user

# Security
JWT_SECRET=your_64_character_jwt_secret
CORS_ORIGIN=http://your-domain.com

# Network
HTTP_PORT=80
HTTPS_PORT=443
API_PORT=8080
WS_PORT=9998
```

### SSL/HTTPS Setup

```bash
# Generate self-signed certificate (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infrastructure/nginx/ssl/key.pem \
  -out infrastructure/nginx/ssl/cert.pem

# Or use Let's Encrypt (production)
certbot --nginx -d your-domain.com
```

---

## 🎛️ Management

### Start/Stop Services

```bash
cd /opt/eagowl-poc

# Start all services
docker-compose up -d

# Stop all services  
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs api-server
docker-compose logs postgres
```

### System Services

```bash
# Enable auto-start
systemctl enable eagowl-poc

# Manual control
systemctl start eagowl-poc
systemctl stop eagowl-poc
systemctl restart eagowl-poc
systemctl status eagowl-poc
```

---

## 👥 User Management

### Create Users via API

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "operator1",
    "email": "operator1@company.com", 
    "password": "SecurePass123",
    "role": "OPERATOR",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Default User Roles

- **ADMIN**: Full system access
- **OPERATOR**: Dispatch console access, user management
- **USER**: Mobile app access only
- **GUEST**: View-only access

---

## 📊 Monitoring

### Grafana Dashboard

- **URL**: http://localhost:3001
- **Login**: admin / admin
- **Dashboards**: System Metrics, PTT Performance, User Activity

### Key Metrics

- **Active Users**: Real-time user count
- **PTT Sessions**: Voice/video call metrics
- **Message Volume**: Communication analytics
- **System Performance**: CPU, memory, disk usage

---

## 🔐 Security

### Default Security Features

- **JWT Authentication**: Secure token-based auth
- **End-to-End Encryption**: Audio/video encryption
- **TLS 1.3**: All communications encrypted
- **Rate Limiting**: API protection
- **Input Validation**: SQL injection protection

### Security Best Practices

1. **Change default passwords**
2. **Use strong JWT secret** (64+ characters)
3. **Enable SSL certificates**
4. **Configure firewall rules**
5. **Regular security updates**
6. **Monitor access logs**

---

## 💾 Backup and Recovery

### Automatic Backups

```bash
# Daily at 2 AM (configured)
cat /var/backups/eagowl-poc/backup.log

# Manual backup
/opt/eagowl-poc/backup.sh
```

### Restore from Backup

```bash
# Stop services
systemctl stop eagowl-poc

# Restore database
docker-compose exec postgres psql -U eagowl_poc_user -d eagowl_poc_db < backup.sql

# Start services
systemctl start eagowl-poc
```

---

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose logs api-server
docker-compose logs postgres
docker-compose logs redis

# Check ports
netstat -tulpn | grep :8080
netstat -tulpn | grep :5432
```

#### Mobile App Connection Issues

1. **Check server URL** in mobile app settings
2. **Verify firewall** allows WebSocket (9998)
3. **Check SSL certificate** validity
4. **Test connectivity** to server

#### Audio/Video Issues

1. **Check STUN/TURN server** configuration
2. **Verify UDP ports** 3478, 49152-65535 open
3. **Check network bandwidth**
4. **Test with different devices**

#### Performance Issues

1. **Monitor system resources** (CPU, RAM, disk)
2. **Check database indexes**
3. **Optimize PostgreSQL settings**
4. **Review log files** for errors

### Support Resources

- **Documentation**: `docs/` directory
- **API Reference**: `docs/api.md`
- **User Manual**: `docs/user-manual.pdf`
- **Emergency Support**: Check system logs first

---

## 📱 Mobile App Features

### Core Functions

- **PTT Voice**: Push-to-talk group and private calls
- **Video PTT**: Real-time video communication
- **GPS Tracking**: Live location sharing
- **Messaging**: Text, images, file sharing
- **Emergency**: SOS, Man-Down alerts
- **Background**: Always-on connectivity

### Configuration

1. **Server URL**: http://your-server-ip:8080
2. **Auto-connect**: Enable on app start
3. **Background tracking**: Enable for continuous location
4. **Quality settings**: Adjust based on network conditions

---

## 🖥️ Desktop Console Features

### Real-time Monitoring

- **User Status**: Online/offline/PTT status
- **GPS Tracking**: Live maps with user locations
- **PTT Monitor**: Active call sessions
- **Emergency Dashboard**: Real-time alerts
- **Message History**: Chat and communication logs

### Management Tools

- **User Management**: Create/edit user accounts
- **Group Configuration**: Manage PTT groups
- **System Settings**: Server configuration
- **Recording Playback**: Voice/video recording access
- **Analytics Dashboard**: Usage statistics and reports

---

## 🔄 Updates

### Auto-Update System

- **Mobile Apps**: Over-the-air updates
- **Desktop Console**: Automatic download/install
- **Server**: Rolling updates with zero downtime

### Manual Update

```bash
# Download latest version
wget https://releases.eagowl-poc.com/v1.1/eagowl-poc-v1.1.tar.gz

# Backup current data
/opt/eagowl-poc/backup.sh

# Extract and update
tar -xzf eagowl-poc-v1.1.tar.gz
./infrastructure/update.sh
```

---

## 📞 Support

### Contact Information

- **Email**: support@eagowl-poc.com
- **Phone**: +1-800-EAGOWL
- **Documentation**: https://docs.eagowl-poc.com
- **Community**: https://community.eagowl-poc.com

### Professional Services

- **Installation assistance**
- **Custom configuration**
- **Training programs**
- **24/7 support contracts**

---

© 2025 EAGOWL-POC. All rights reserved.