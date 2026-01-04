# EAGOWL-POC Professional Push-to-Talk over Cellular (POC) Communications Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![React Native](https://img.shields.io/badge/react%20native-0.73-blue.svg)](https://reactnative.dev/)

## 🚀 Overview

EAGOWL-POC is a professional-grade Push-to-Talk over Cellular (POC) communications platform designed for modern mobile workforce management. It provides secure, real-time voice communication, GPS tracking, video calling, and emergency management capabilities.

## ✨ Key Features

### 🎤 Communication
- **PTT Voice**: Push-to-talk over cellular with group and private calls
- **Video Calling**: WebRTC-based face-to-face communication
- **DMR Integration**: Digital Mobile Radio gateway support
- **Text Messaging**: Group and private chat with file sharing

### 📍 Location & Tracking
- **Real-time GPS**: Continuous location tracking with historical trails
- **Geofencing**: Automated alerts for zone entry/exit
- **Route Analytics**: Historical path analysis and reporting

### 🚨 Emergency Management
- **SOS Alerts**: Panic button with immediate notification
- **Man-Down Detection**: Automatic fall detection and alerts
- **Priority Messaging**: High-priority broadcast system
- **Emergency Coordination**: Centralized emergency response dashboard

### 📱 Multi-Platform Support
- **Mobile**: React Native app for Android devices
- **Desktop**: Electron-based dispatch console
- **Web**: Browser-based administration interface

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │ Desktop Console │    │   Web Interface │
│  (React Native) │    │   (Electron)    │    │     (React)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      Backend Services     │
                    │    (Node.js + Fastify)    │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     Data & Storage       │
                    │ PostgreSQL + Redis + S3  │
                    └───────────────────────────┘
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Fastify for high-performance APIs
- **WebSocket**: Socket.IO for real-time communication
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session management
- **Media**: FFmpeg for audio/video processing

### Mobile
- **Framework**: React Native 0.72 with Expo
- **State**: Redux Toolkit for predictable state
- **Communication**: WebRTC for PTT and video calls
- **Location**: Expo Location for GPS tracking
- **UI**: Tamagui for consistent cross-platform design

### Desktop Console
- **Framework**: Electron + React 18
- **UI Library**: Material-UI components
- **Maps**: Mapbox GL for visualization
- **Charts**: Recharts for analytics dashboards
- **Real-time**: Socket.IO client integration

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx for load balancing
- **SSL/TLS**: Let's Encrypt automation
- **Monitoring**: Grafana + Prometheus
- **Logging**: Structured logs with Winston

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Installation

#### Windows (Recommended)
```bash
# Right-click and "Run as administrator"
infrastructure\install.bat
```

#### Linux/macOS
```bash
chmod +x infrastructure/install.sh
sudo ./infrastructure/install.sh
```

#### Manual Setup
```bash
# Clone and setup
git clone https://github.com/your-org/eagowl-poc.git
cd eagowl-poc

# Start services
cd infrastructure
docker-compose up -d

# Setup database
docker-compose exec api-server npm run prisma:migrate
```

### Access Points
- **Web Console**: http://localhost
- **API Server**: http://localhost:8080
- **Grafana**: http://localhost:3001
- **WebSocket**: ws://localhost:9998

## 📱 Installation Guides

### Mobile Applications
APK files are available in the `mobile-apks/` directory after running the package generator:

- `EagowlPOC-arm64-v8a-v1.0.apk` - Modern devices
- `EagowlPOC-armeabi-v7a-v1.0.apk` - Legacy devices

### Desktop Console
Installers are in `desktop-packages/`:
- Windows: `EagowlPOC-Console-Setup-v1.0.exe`
- Linux: `EagowlPOC-Console-v1.0.AppImage`
- macOS: `EagowlPOC-Console-v1.0.dmg`

## 📚 Documentation

- [Installation Guide](docs/installation-guide.md) - Detailed setup instructions
- [API Reference](docs/api.md) - REST API documentation
- [User Manual](docs/user-manual.md) - End-user guide
- [Admin Guide](docs/admin-guide.md) - System administration

## 🔧 Development

### Project Structure
```
eagowl-poc/
├── server/                 # Backend services
│   ├── src/
│   │   ├── api/           # REST API endpoints
│   │   ├── auth/          # Authentication
│   │   ├── websocket/     # Real-time services
│   │   └── database/      # Database models
│   └── prisma/            # Database schema
├── mobile/                 # React Native app
│   ├── src/
│   │   ├── screens/       # App screens
│   │   ├── components/    # UI components
│   │   ├── services/      # API services
│   │   └── store/         # State management
├── dispatch-console/       # Electron desktop app
├── infrastructure/         # Docker & deployment
├── docs/                  # Documentation
└── tests/                 # Test suites
```

### Development Commands

#### Backend
```bash
cd server
npm install
npm run dev          # Development server
npm run build        # TypeScript compilation
npm test             # Run tests
npm run lint         # Code quality
```

#### Mobile
```bash
cd mobile
npm install
expo start           # Development server
expo build:android   # Build APK
expo build:ios       # Build iOS
```

#### Desktop
```bash
cd dispatch-console
npm install
npm run electron-dev # Development
npm run dist        # Build packages
```

## 🐳 Docker Services

The platform runs on multiple Docker containers:

| Service | Description | Port |
|---------|-------------|------|
| `api-server` | Backend API & WebSocket | 8080, 9998 |
| `postgres` | PostgreSQL database | 5432 |
| `redis` | Redis cache | 6379 |
| `nginx` | Reverse proxy | 80, 443 |
| `prometheus` | Metrics collection | 9090 |
| `grafana` | Monitoring dashboard | 3001 |

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **End-to-End Encryption**: Audio/video communication encryption
- **TLS 1.3**: All web communications encrypted
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive data sanitization
- **RBAC**: Role-based access control

## 📊 Performance Metrics

- **API Response**: < 200ms average
- **PTT Latency**: < 100ms
- **System Uptime**: > 99.9%
- **GPS Accuracy**: < 5 meters
- **Concurrent Users**: 1000+ (scalable)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Standards
- Follow TypeScript strict mode
- Write comprehensive tests
- Use ESLint + Prettier
- Maintain git commit conventions
- Document API changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/eagowl-poc/issues)
- **Email**: support@eagowl-poc.com
- **Community**: [Discussions](https://github.com/your-org/eagowl-poc/discussions)

## 🗺️ Roadmap

### v1.1 (Q2 2025)
- [ ] AI-powered pattern analysis
- [ ] Emergency 911 integration
- [ ] Wearable device support
- [ ] Predictive analytics

### v2.0 (Q4 2025)
- [ ] Microservices architecture
- [ ] Multi-tenant isolation
- [ ] Public API for integrations
- [ ] Machine learning optimization

---

**© 2025 EAGOWL-POC. All rights reserved.**

Made with ❤️ for professional communication teams worldwide.