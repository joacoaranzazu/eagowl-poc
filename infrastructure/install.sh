#!/bin/bash
# EAGOWL-POC Installation Script (Auto-adaptive VPS edition)
# Modificado para:
# - Auto-adaptarse a RAM real (no hard-fail por "8GB" = 7.9GB)
# - Detectar docker compose v2 o docker-compose
# - Levantar solo servicios que caben (LITE/STANDARD/FULL)
# - Corregir systemd heredocs con variables
# - Corregir llamada show_completion inexistente

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
INSTALL_DIR="/opt/eagowl-poc"
BACKUP_DIR="/var/backups/eagowl-poc"
SERVICE_NAME="eagowl-poc"

# Recomendaciones (ya no hard-fail):
RECOMMENDED_RAM_MB=8192

# Disco: df da bloques de 1K en $4 -> convertimos a MB antes de comparar
MIN_DISK_MB=100000 # 100GB en MB (aprox)

# Globals (auto)
COMPOSE_CMD=""
MODE="STANDARD"
SERVICES_TO_UP=""

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }
warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }
info() { echo -e "${BLUE}[INFO] $1${NC}"; }

check_root() {
  if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root"
  fi
}

# ---------- Compose detection + wrapper ----------
set_compose_cmd() {
  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
  elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
  else
    COMPOSE_CMD=""
  fi
}

dc() {
  # Wrapper: usa docker compose (v2) o docker-compose
  # Uso: dc up -d ...
  ${COMPOSE_CMD} "$@"
}

# ---------- RAM detection / auto profile ----------
detect_ram_mb() {
  free -m | awk 'NR==2{print int($2)}'
}

detect_swap_mb() {
  free -m | awk 'NR==3{print int($2)}'
}

ensure_swap_if_low() {
  local ram_mb="$1"
  local swap_mb
  swap_mb="$(detect_swap_mb)"

  # si ya hay swap, no toques
  if [[ "${swap_mb}" -gt 0 ]]; then
    info "Swap already present: ${swap_mb}MB"
    return 0
  fi

  # En VPS, swap ayuda a estabilidad si RAM real < 8GB
  if [[ "${ram_mb}" -lt 8192 ]]; then
    warning "Low RAM detected (${ram_mb}MB) and no swap. Creating 4GB swap for stability..."
    fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    info "Swap enabled."
  fi
}

select_mode_by_ram() {
  local ram_mb="$1"

  # LITE: <= 8GB reales (tu caso: ~7940MB)
  # STANDARD: 8–12GB
  # FULL: >= 12GB
  if [[ "${ram_mb}" -lt 8192 ]]; then
    MODE="LITE"
    SERVICES_TO_UP="postgres redis api-server coturn nginx"
  elif [[ "${ram_mb}" -lt 12288 ]]; then
    MODE="STANDARD"
    SERVICES_TO_UP="postgres redis api-server coturn nginx prometheus grafana"
  else
    MODE="FULL"
    SERVICES_TO_UP="postgres redis api-server coturn nginx prometheus grafana"
    # Nota: elasticsearch/kibana están en profile logging en tu compose, no se levantan aquí.
  fi

  info "Auto profile selected: MODE=${MODE} (RAM=${ram_mb}MB)"
  info "Services to start: ${SERVICES_TO_UP}"
}

# Check system requirements (auto-adaptativo)
check_requirements() {
  log "Checking system requirements..."

  # RAM (ya no hard fail) — tu script original se moría aquí :contentReference[oaicite:2]{index=2}
  local ram_mb
  ram_mb="$(detect_ram_mb)"

  ensure_swap_if_low "${ram_mb}"
  select_mode_by_ram "${ram_mb}"

  if [[ "${ram_mb}" -lt "${RECOMMENDED_RAM_MB}" ]]; then
    warning "RAM below recommended threshold. Recommended: ${RECOMMENDED_RAM_MB}MB, Available: ${ram_mb}MB"
    warning "Continuing in MODE=${MODE} (auto-adaptive)."
  else
    info "RAM check passed: ${ram_mb}MB available"
  fi

  # Disk space (convertimos a MB correctamente)
  local disk_kb disk_mb
  disk_kb="$(df / | awk 'NR==2{print $4}')"    # 1K blocks
  disk_mb="$(( disk_kb / 1024 ))"
  if [[ "${disk_mb}" -lt "${MIN_DISK_MB}" ]]; then
    error "Insufficient disk space. Required: ${MIN_DISK_MB}MB, Available: ${disk_mb}MB"
  fi
  info "Disk space check passed: ${disk_mb}MB available"

  # Docker
  if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
  else
    info "Docker is already installed"
  fi

  # Compose (prefer v2 plugin; fallback to docker-compose binary)
  set_compose_cmd
  if [[ -z "${COMPOSE_CMD}" ]]; then
    log "Installing Docker Compose (standalone)..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    set_compose_cmd
  fi
  if [[ -z "${COMPOSE_CMD}" ]]; then
    error "Docker Compose not found after install attempt."
  fi
  info "Using compose command: ${COMPOSE_CMD}"

  # Ports
  local ports=("80" "443" "8080" "9998" "5432" "6379")
  for port in "${ports[@]}"; do
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      warning "Port $port is already in use"
    else
      info "Port $port is available"
    fi
  done
}

install_eagowl_poc() {
  log "Installing EAGOWL-POC..."

  mkdir -p "$INSTALL_DIR"
  cd "$INSTALL_DIR"

  if [[ -f "eagowl-poc-v1.0.tar.gz" ]]; then
    log "Using local EAGOWL-POC package"
    tar -xzf eagowl-poc-v1.0.tar.gz
  else
    log "Downloading EAGOWL-POC package..."
    wget -O eagowl-poc-v1.0.tar.gz https://releases.eagowl-poc.com/v1.0/eagowl-poc-v1.0.tar.gz
    tar -xzf eagowl-poc-v1.0.tar.gz
  fi

  cp -r infrastructure/* .
  mv .env.example .env

  log "Generating secure passwords..."
  POSTGRES_PASSWORD=$(openssl rand -base64 32)
  REDIS_PASSWORD=$(openssl rand -base64 32)
  JWT_SECRET=$(openssl rand -base64 64)
  TURN_PASSWORD=$(openssl rand -base64 32)

  sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
  sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
  sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
  sed -i "s/TURN_PASSWORD=.*/TURN_PASSWORD=$TURN_PASSWORD/" .env

  mkdir -p "$BACKUP_DIR"

  chown -R root:root "$INSTALL_DIR"
  chmod 755 "$INSTALL_DIR"

  cat > "$INSTALL_DIR/passwords.txt" << EOF
EAGOWL-POC Installation Credentials
=================================
Generated: $(date)

PostgreSQL:
  Database: eagowl_poc_db
  User: eagowl_poc_user
  Password: $POSTGRES_PASSWORD

Redis:
  Password: $REDIS_PASSWORD

JWT Secret:
  Secret: $JWT_SECRET

STUN/TURN:
  Username: eagowl_user
  Password: $TURN_PASSWORD

IMPORTANT: Keep this file secure and make a backup!
EOF
  chmod 600 "$INSTALL_DIR/passwords.txt"

  log "EAGOWL-POC installed successfully"
  info "Credentials saved to: $INSTALL_DIR/passwords.txt"
}

start_services() {
  log "Starting EAGOWL-POC services..."
  cd "$INSTALL_DIR"

  # Arranca SOLO los servicios que caben (según MODE/RAM)
  dc up -d --build $SERVICES_TO_UP

  log "Waiting for services to start..."
  sleep 30

  if dc ps | grep -q "Up"; then
    log "EAGOWL-POC services started successfully"
  else
    error "Failed to start some services. Check logs with: ${COMPOSE_CMD} logs"
  fi

  log "Waiting for database to be ready..."
  timeout=60
  until dc exec -T postgres pg_isready -U eagowl_poc_user -d eagowl_poc_db || [ $timeout -eq 0 ]; do
    sleep 1
    timeout=$((timeout - 1))
  done

  if [[ $timeout -gt 0 ]]; then
    info "Database is ready"
  else
    error "Database failed to start within timeout period"
  fi

  log "Running database migrations..."
  dc exec api-server npm run prisma:migrate

  create_systemd_service
}

create_systemd_service() {
  log "Creating systemd service..."

  # Script helper para systemd (detecta compose v2/v1)
  cat > /usr/local/bin/eagowl-poc-compose << 'EOS'
#!/bin/bash
set -e
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  exec docker compose "$@"
elif command -v docker-compose &>/dev/null; then
  exec docker-compose "$@"
else
  echo "Docker compose not found" >&2
  exit 1
fi
EOS
  chmod +x /usr/local/bin/eagowl-poc-compose

  cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=EAGOWL-POC Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/local/bin/eagowl-poc-compose up -d --build ${SERVICES_TO_UP}
ExecStop=/usr/local/bin/eagowl-poc-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl start "$SERVICE_NAME"

  log "Systemd service created and enabled"
}

check_existing_installation() {
  log "Checking for existing EAGOWL-POC installation..."

  if [[ -d "$INSTALL_DIR" ]]; then
    warning "Existing EAGOWL-POC installation detected!"
    read -p "Do you want to backup existing installation? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
      mv "$INSTALL_DIR" "${INSTALL_DIR}-backup-$BACKUP_DATE"
      log "Existing installation backed up to: ${INSTALL_DIR}-backup-$BACKUP_DATE"
    fi

    read -p "Do you want to remove existing installation? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      systemctl stop "$SERVICE_NAME" 2>/dev/null || true
      cd "$INSTALL_DIR" 2>/dev/null && dc down --volumes --remove-orphans 2>/dev/null || true
      rm -rf "$INSTALL_DIR" 2>/dev/null || true
      log "Existing installation removed"
    fi
  fi
}

setup_monitoring() {
  # En LITE mode no montamos monitor daemon (igual puedes dejarlo si quieres)
  log "Setting up monitoring and alerting..."

  cat > "$INSTALL_DIR/monitor.sh" << EOF
#!/bin/bash
INSTALL_DIR="${INSTALL_DIR}"
LOG_FILE="/var/log/eagowl-poc-monitor.log"
ALERT_EMAIL="admin@yourcompany.com"

send_alert() {
  local message="\$1"
  echo "[\$(date)] ALERT: \$message" >> "\$LOG_FILE"
  if [[ -n "\$ALERT_EMAIL" ]]; then
    echo "\$message" | mail -s "EAGOWL-POC Alert" "\$ALERT_EMAIL"
  fi
}

check_service_health() {
  cd "\$INSTALL_DIR"

  if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
    send_alert "API Server is down"
  fi

  if ! /usr/local/bin/eagowl-poc-compose exec -T postgres pg_isready -U eagowl_poc_user -d eagowl_poc_db > /dev/null 2>&1; then
    send_alert "PostgreSQL database is down"
  fi

  if ! /usr/local/bin/eagowl-poc-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    send_alert "Redis is down"
  fi

  DISK_USAGE=\$(df / | awk 'NR==2{print \$5}' | sed 's/%//')
  if [[ "\$DISK_USAGE" -gt 90 ]]; then
    send_alert "Disk usage is critical: \${DISK_USAGE}%"
  fi
}

check_system_resources() {
  MEMORY_USAGE=\$(free | awk 'NR==2{printf "%.0f", \$3*100/\$2}')
  if [[ "\$MEMORY_USAGE" -gt 90 ]]; then
    send_alert "Memory usage is critical: \${MEMORY_USAGE}%"
  fi

  CPU_LOAD=\$(uptime | awk -F'load average:' '{ print \$2 }' | awk '{print \$2}' | sed 's/,//')
  if command -v bc >/dev/null 2>&1; then
    if (( \$(echo "\$CPU_LOAD > 2.0" | bc -l) )); then
      send_alert "CPU load is high: \$CPU_LOAD"
    fi
  fi
}

while true; do
  check_service_health
  check_system_resources
  sleep 30
done
EOF

  chmod +x "$INSTALL_DIR/monitor.sh"

  cat > /etc/systemd/system/eagowl-poc-monitor.service << EOF
[Unit]
Description=EAGOWL-POC Monitoring Service
After=${SERVICE_NAME}.service
Requires=${SERVICE_NAME}.service

[Service]
Type=simple
User=root
ExecStart=${INSTALL_DIR}/monitor.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable eagowl-poc-monitor
  systemctl start eagowl-poc-monitor

  log "Monitoring service configured and started"
}

setup_firewall() {
  log "Configuring firewall rules..."

  if command -v ufw &> /dev/null; then
    log "Configuring UFW firewall..."

    ufw allow 80/tcp    comment 'EAGOWL-POC HTTP'
    ufw allow 443/tcp   comment 'EAGOWL-POC HTTPS'
    ufw allow 8080/tcp  comment 'EAGOWL-POC API'
    ufw allow 9998/tcp  comment 'EAGOWL-POC WebSocket'
    ufw allow 5432/tcp  comment 'EAGOWL-POC PostgreSQL'
    ufw allow 6379/tcp  comment 'EAGOWL-POC Redis'
    ufw allow 3478/udp  comment 'EAGOWL-POC STUN/TURN'
    ufw allow 49152:65535/udp comment 'EAGOWL-POC RTP/RTCP'

    log "UFW firewall rules configured"
  elif command -v firewall-cmd &> /dev/null; then
    log "Configuring firewalld..."
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=8080/tcp
    firewall-cmd --permanent --add-port=9998/tcp
    firewall-cmd --permanent --add-port=5432/tcp
    firewall-cmd --permanent --add-port=6379/tcp
    firewall-cmd --permanent --add-port=3478/udp
    firewall-cmd --permanent --add-port=49152-65535/udp
    firewall-cmd --reload
    log "firewalld rules configured"
  else
    warning "No supported firewall found. Manual configuration required."
  fi
}

create_desktop_shortcuts() {
  log "Creating desktop shortcuts..."

  cat > /usr/share/applications/eagowl-poc.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=EAGOWL-POC Console
Comment=Professional Push-to-Talk Communications Console
Exec=xdg-open http://localhost
Icon=/opt/eagowl-poc/assets/eagowl-poc-icon.png
Terminal=false
Categories=Network;Office;
Keywords=ptt;communications;push-to-talk;
EOF

  mkdir -p "$HOME/Desktop"
  cp /usr/share/applications/eagowl-poc.desktop "$HOME/Desktop/"

  cat > /usr/local/bin/eagowl-poc << EOF
#!/bin/bash
INSTALL_DIR="${INSTALL_DIR}"

case "\$1" in
  start)   cd "\$INSTALL_DIR" && /usr/local/bin/eagowl-poc-compose up -d --build ${SERVICES_TO_UP} ;;
  stop)    cd "\$INSTALL_DIR" && /usr/local/bin/eagowl-poc-compose down ;;
  restart) cd "\$INSTALL_DIR" && /usr/local/bin/eagowl-poc-compose restart ;;
  logs)    cd "\$INSTALL_DIR" && /usr/local/bin/eagowl-poc-compose logs -f ;;
  status)  cd "\$INSTALL_DIR" && /usr/local/bin/eagowl-poc-compose ps ;;
  monitor) systemctl status eagowl-poc-monitor ;;
  *)
    echo "Usage: eagowl-poc {start|stop|restart|logs|status|monitor}"
    exit 1
    ;;
esac
EOF

  chmod +x /usr/local/bin/eagowl-poc
  log "Desktop shortcuts and command line launcher created"
}

validate_installation() {
  log "Validating installation..."
  sleep 30

  if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    log "✅ API Server is healthy"
  else
    error "❌ API Server health check failed"
  fi

  if dc exec -T postgres pg_isready -U eagowl_poc_user -d eagowl_poc_db > /dev/null 2>&1; then
    log "✅ Database connection is healthy"
  else
    error "❌ Database connection failed"
  fi

  if dc exec -T redis redis-cli ping > /dev/null 2>&1; then
    log "✅ Redis connection is healthy"
  else
    error "❌ Redis connection failed"
  fi

  if curl -f http://localhost > /dev/null 2>&1; then
    log "✅ Web interface is accessible"
  else
    error "❌ Web interface is not accessible"
  fi

  log "Installation validation completed"
}

setup_backup() {
  log "Setting up enhanced backup configuration..."

  cat > "$INSTALL_DIR/backup.sh" << EOF
#!/bin/bash
BACKUP_DIR="${BACKUP_DIR}"
INSTALL_DIR="${INSTALL_DIR}"
DATE=\$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7
S3_BUCKET=""

mkdir -p "\$BACKUP_DIR"

backup_component() {
  local component="\$1"
  local command="\$2"
  local output_file="\$3"

  echo "Backing up \$component..."
  if eval "\$command" > "\$output_file" 2>/tmp/backup_error.log; then
    echo "✅ \$component backup successful"
    return 0
  else
    echo "❌ \$component backup failed"
    cat /tmp/backup_error.log
    return 1
  fi
}

backup_component "PostgreSQL" \
  "/usr/local/bin/eagowl-poc-compose -f \$INSTALL_DIR/docker-compose.yml exec -T postgres pg_dump -U eagowl_poc_user eagowl_poc_db" \
  "\$BACKUP_DIR/postgres_\$DATE.sql"

backup_component "Redis" \
  "/usr/local/bin/eagowl-poc-compose -f \$INSTALL_DIR/docker-compose.yml exec -T redis redis-cli --rdb -" \
  "\$BACKUP_DIR/redis_\$DATE.rdb"

backup_component "Media Files" \
  "tar -czf - -C \$INSTALL_DIR/storage media 2>/dev/null" \
  "\$BACKUP_DIR/media_\$DATE.tar.gz"

backup_component "Configuration" \
  "tar -czf - -C \$INSTALL_DIR infrastructure .env docker-compose.yml" \
  "\$BACKUP_DIR/config_\$DATE.tar.gz"

if [[ -n "\$S3_BUCKET" ]]; then
  echo "Uploading to S3 bucket: \$S3_BUCKET"
  for file in "\$BACKUP_DIR"/*_\$DATE*; do
    aws s3 cp "\$file" "s3://\$S3_BUCKET/backups/" --storage-class STANDARD_IA
  done
fi

find "\$BACKUP_DIR" -name "*" -type f -mtime +\$RETENTION_DAYS -delete -print

cat > "\$BACKUP_DIR/backup_\$DATE.txt" << SUMMARY
EAGOWL-POC Backup Summary - \$DATE
=================================
Components Backed Up:
- PostgreSQL Database: postgres_\$DATE.sql
- Redis Data: redis_\$DATE.rdb
- Media Files: media_\$DATE.tar.gz
- Configuration: config_\$DATE.tar.gz

Backup Location: \$BACKUP_DIR
Retention Period: \$RETENTION_DAYS days
SUMMARY

echo "Backup completed successfully!"
echo "Summary saved to: \$BACKUP_DIR/backup_\$DATE.txt"
EOF

  chmod +x "$INSTALL_DIR/backup.sh"

  (crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/backup.sh") | crontab -

  cat > /etc/systemd/system/eagowl-poc-backup.timer << EOF
[Unit]
Description=EAGOWL-POC Backup Timer
Requires=eagowl-poc-backup.service

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=1800

[Install]
WantedBy=timers.target
EOF

  cat > /etc/systemd/system/eagowl-poc-backup.service << EOF
[Unit]
Description=EAGOWL-POC Backup Service
After=docker.service

[Service]
Type=oneshot
ExecStart=${INSTALL_DIR}/backup.sh
User=root
EOF

  systemctl daemon-reload
  systemctl enable eagowl-poc-backup.timer
  systemctl start eagowl-poc-backup.timer

  log "Enhanced backup configuration completed"
}

show_info() {
  log "EAGOWL-POC Installation Complete!"
  echo ""
  echo -e "${BLUE}Access Information:${NC}"
  echo "  Web Console: http://localhost"
  echo "  API Server: http://localhost:8080"
  echo "  WebSocket: ws://localhost:9998"
  echo ""
  echo -e "${BLUE}Monitoring:${NC}"
  if [[ "${MODE}" == "LITE" ]]; then
    echo "  MODE=LITE -> Prometheus/Grafana not started (by design)"
  else
    echo "  Grafana: http://localhost:3001"
    echo "  Prometheus: http://localhost:9091"
  fi
  echo ""
  echo -e "${BLUE}Useful Commands:${NC}"
  echo "  View logs: /usr/local/bin/eagowl-poc-compose -f $INSTALL_DIR/docker-compose.yml logs -f"
  echo "  Stop services: systemctl stop $SERVICE_NAME"
  echo "  Start services: systemctl start $SERVICE_NAME"
  echo "  Restart services: systemctl restart $SERVICE_NAME"
  echo "  Backup manually: $INSTALL_DIR/backup.sh"
  echo ""
  echo -e "${BLUE}Configuration:${NC}"
  echo "  Environment file: $INSTALL_DIR/.env"
  echo "  Credentials file: $INSTALL_DIR/passwords.txt"
  echo ""
  echo -e "${GREEN}Installation completed successfully!${NC}"
}

main() {
  log "Starting EAGOWL-POC Enhanced Installation..."

  check_root
  check_requirements
  check_existing_installation
  install_eagowl_poc
  start_services
  setup_monitoring
  setup_firewall
  setup_backup
  create_desktop_shortcuts
  validate_installation

  # Tu script original llamaba show_completion, pero no existe :contentReference[oaicite:3]{index=3}
  show_info

  log "EAGOWL-POC installation completed successfully!"
}

trap 'error "Installation interrupted"' INT TERM
main "$@"
