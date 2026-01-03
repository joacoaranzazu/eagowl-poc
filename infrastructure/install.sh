#!/bin/bash

# EAGOWL-POC Installation Script
# This script installs and configures the complete EAGOWL-POC platform

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
MIN_RAM=8192
MIN_DISK=100000 # 100GB in MB

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check RAM
    RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [[ $RAM -lt $MIN_RAM ]]; then
        error "Insufficient RAM. Required: ${MIN_RAM}MB, Available: ${RAM}MB"
    fi
    info "RAM check passed: ${RAM}MB available"
    
    # Check disk space
    DISK=$(df / | awk 'NR==2{print $4}')
    if [[ $DISK -lt $MIN_DISK ]]; then
        error "Insufficient disk space. Required: ${MIN_DISK}MB, Available: ${DISK}MB"
    fi
    info "Disk space check passed: ${DISK}MB available"
    
    # Check if Docker is installed
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
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    else
        info "Docker Compose is already installed"
    fi
    
    # Check if ports are available
    local ports=("80" "443" "8080" "9998" "5432" "6379")
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            warning "Port $port is already in use"
        else
            info "Port $port is available"
        fi
    done
}

# Install EAGOWL-POC
install_eagowl_poc() {
    log "Installing EAGOWL-POC..."
    
    # Create installation directory
    mkdir -p $INSTALL_DIR
    cd $INSTALL_DIR
    
    # Download and extract EAGOWL-POC
    if [[ -f "eagowl-poc-v1.0.tar.gz" ]]; then
        log "Using local EAGOWL-POC package"
        tar -xzf eagowl-poc-v1.0.tar.gz
    else
        log "Downloading EAGOWL-POC package..."
        wget -O eagowl-poc-v1.0.tar.gz https://releases.eagowl-poc.com/v1.0/eagowl-poc-v1.0.tar.gz
        tar -xzf eagowl-poc-v1.0.tar.gz
    fi
    
    # Copy infrastructure files
    cp -r infrastructure/* .
    mv .env.example .env
    
    # Generate secure passwords
    log "Generating secure passwords..."
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    REDIS_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 64)
    TURN_PASSWORD=$(openssl rand -base64 32)
    
    # Update .env file with secure passwords
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
    sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/TURN_PASSWORD=.*/TURN_PASSWORD=$TURN_PASSWORD/" .env
    
    # Create backup directory
    mkdir -p $BACKUP_DIR
    
    # Set permissions
    chown -R root:root $INSTALL_DIR
    chmod 755 $INSTALL_DIR
    
    # Store passwords securely
    cat > $INSTALL_DIR/passwords.txt << EOF
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
    chmod 600 $INSTALL_DIR/passwords.txt
    
    log "EAGOWL-POC installed successfully"
    info "Credentials saved to: $INSTALL_DIR/passwords.txt"
}

# Start services
start_services() {
    log "Starting EAGOWL-POC services..."
    
    cd $INSTALL_DIR
    
    # Start Docker Compose services
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        log "EAGOWL-POC services started successfully"
    else
        error "Failed to start some services. Check logs with: docker-compose logs"
    fi
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout=60
    until docker-compose exec -T postgres pg_isready -U eagowl_poc_user -d eagowl_poc_db || [ $timeout -eq 0 ]; do
        sleep 1
        timeout=$((timeout - 1))
    done
    
    if [[ $timeout -gt 0 ]]; then
        info "Database is ready"
    else
        error "Database failed to start within timeout period"
    fi
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose exec api-server npm run prisma:migrate
    
    # Create system service
    create_systemd_service
}

# Create systemd service
create_systemd_service() {
    log "Creating systemd service..."
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=EAGOWL-POC Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    # Enable and start service
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME
    
    log "Systemd service created and enabled"
}

# Check for existing installation
check_existing_installation() {
    log "Checking for existing EAGOWL-POC installation..."
    
    if [[ -d "/opt/eagowl-poc" ]]; then
        warning "Existing EAGOWL-POC installation detected!"
        read -p "Do you want to backup existing installation? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [[ -d "/opt/eagowl-poc" ]]; then
                BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
                mv "/opt/eagowl-poc" "/opt/eagowl-poc-backup-$BACKUP_DATE"
                log "Existing installation backed up to: /opt/eagowl-poc-backup-$BACKUP_DATE"
            fi
        fi
        
        read -p "Do you want to remove existing installation? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            systemctl stop eagowl-poc 2>/dev/null || true
            cd /opt/eagowl-poc 2>/dev/null && docker-compose down --volumes --remove-orphans 2>/dev/null || true
            rm -rf /opt/eagowl-poc 2>/dev/null || true
            log "Existing installation removed"
        fi
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Create monitoring script
    cat > $INSTALL_DIR/monitor.sh << 'EOF'
#!/bin/bash
# EAGOWL-POC Monitoring Script

INSTALL_DIR="/opt/eagowl-poc"
LOG_FILE="/var/log/eagowl-poc-monitor.log"
ALERT_EMAIL="admin@yourcompany.com"

# Function to send alert
send_alert() {
    local message="$1"
    echo "[$(date)] ALERT: $message" >> $LOG_FILE
    
    # Send email if configured
    if [[ -n "$ALERT_EMAIL" ]]; then
        echo "$message" | mail -s "EAGOWL-POC Alert" "$ALERT_EMAIL"
    fi
}

# Check service health
check_service_health() {
    cd $INSTALL_DIR
    
    # Check API server
    if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
        send_alert "API Server is down"
    fi
    
    # Check database
    if ! docker-compose exec -T postgres pg_isready -U eagowl_poc_user -d eagowl_poc_db > /dev/null 2>&1; then
        send_alert "PostgreSQL database is down"
    fi
    
    # Check Redis
    if ! docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        send_alert "Redis is down"
    fi
    
    # Check disk space (less than 10% free)
    DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
    if [[ $DISK_USAGE -gt 90 ]]; then
        send_alert "Disk usage is critical: ${DISK_USAGE}%"
    fi
}

# Check system resources
check_system_resources() {
    # Memory usage
    MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ $MEMORY_USAGE -gt 90 ]]; then
        send_alert "Memory usage is critical: ${MEMORY_USAGE}%"
    fi
    
    # CPU load (average over 5 minutes)
    CPU_LOAD=$(uptime | awk -F'load average:' '{ print $2 }' | awk '{print $2}' | sed 's/,//')
    if (( $(echo "$CPU_LOAD > 2.0" | bc -l) )); then
        send_alert "CPU load is high: $CPU_LOAD"
    fi
}

# Main monitoring loop
while true; do
    check_service_health
    check_system_resources
    sleep 30  # Check every 30 seconds
done
EOF
    
    chmod +x $INSTALL_DIR/monitor.sh
    
    # Create systemd service for monitoring
    cat > /etc/systemd/system/eagowl-poc-monitor.service << 'EOF'
[Unit]
Description=EAGOWL-POC Monitoring Service
After=eagowl-poc.service
Requires=eagowl-poc.service

[Service]
Type=simple
User=root
ExecStart=$INSTALL_DIR/monitor.sh
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

# Setup firewall rules
setup_firewall() {
    log "Configuring firewall rules..."
    
    # Check if ufw is available
    if command -v ufw &> /dev/null; then
        log "Configuring UFW firewall..."
        
        # Allow EAGOWL-POC ports
        ufw allow 80/tcp    comment 'EAGOWL-POC HTTP'
        ufw allow 443/tcp   comment 'EAGOWL-POC HTTPS'
        ufw allow 8080/tcp  comment 'EAGOWL-POC API'
        ufw allow 9998/tcp  comment 'EAGOWL-POC WebSocket'
        ufw allow 5432/tcp  comment 'EAGOWL-POC PostgreSQL'
        ufw allow 6379/tcp  comment 'EAGOWL-POC Redis'
        
        # Allow WebRTC ports
        ufw allow 3478/udp  comment 'EAGOWL-POC STUN/TURN'
        ufw allow 49152:65535/udp comment 'EAGOWL-POC RTP/RTCP'
        
        log "UFW firewall rules configured"
        
    elif command -v firewall-cmd &> /dev/null; then
        log "Configuring firewalld..."
        
        # Add services
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        
        # Add custom ports
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

# Create desktop shortcuts
create_desktop_shortcuts() {
    log "Creating desktop shortcuts..."
    
    # Create desktop entry
    cat > /usr/share/applications/eagowl-poc.desktop << 'EOF'
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
    
    # Create desktop directory if doesn't exist
    mkdir -p $HOME/Desktop
    
    # Copy to desktop
    cp /usr/share/applications/eagowl-poc.desktop $HOME/Desktop/
    
    # Create command line launcher
    cat > /usr/local/bin/eagowl-poc << 'EOF'
#!/bin/bash
# EAGOWL-POC Command Line Launcher

INSTALL_DIR="/opt/eagowl-poc"

case "$1" in
    start)
        cd $INSTALL_DIR
        docker-compose up -d
        ;;
    stop)
        cd $INSTALL_DIR
        docker-compose down
        ;;
    restart)
        cd $INSTALL_DIR
        docker-compose restart
        ;;
    logs)
        cd $INSTALL_DIR
        docker-compose logs -f
        ;;
    status)
        cd $INSTALL_DIR
        docker-compose ps
        ;;
    monitor)
        systemctl status eagowl-poc-monitor
        ;;
    *)
        echo "Usage: eagowl-poc {start|stop|restart|logs|status|monitor}"
        echo "  start    - Start EAGOWL-POC services"
        echo "  stop     - Stop EAGOWL-POC services"
        echo "  restart  - Restart EAGOWL-POC services"
        echo "  logs     - Show service logs"
        echo "  status   - Show service status"
        echo "  monitor  - Show monitoring service status"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/eagowl-poc
    
    log "Desktop shortcuts and command line launcher created"
}

# Validate installation
validate_installation() {
    log "Validating installation..."
    
    # Wait for services to be fully ready
    sleep 30
    
    # Test API health
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log "✅ API Server is healthy"
    else
        error "❌ API Server health check failed"
    fi
    
    # Test database connection
    if docker-compose exec -T postgres pg_isready -U eagowl_poc_user -d eagowl_poc_db > /dev/null 2>&1; then
        log "✅ Database connection is healthy"
    else
        error "❌ Database connection failed"
    fi
    
    # Test Redis connection
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log "✅ Redis connection is healthy"
    else
        error "❌ Redis connection failed"
    fi
    
    # Test web interface
    if curl -f http://localhost > /dev/null 2>&1; then
        log "✅ Web interface is accessible"
    else
        error "❌ Web interface is not accessible"
    fi
    
    log "Installation validation completed"
}

# Enhanced backup
setup_backup() {
    log "Setting up enhanced backup configuration..."
    
    # Create backup script
    cat > $INSTALL_DIR/backup.sh << 'EOF'
#!/bin/bash
# Enhanced EAGOWL-POC Backup Script

BACKUP_DIR="/var/backups/eagowl-poc"
INSTALL_DIR="/opt/eagowl-poc"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7
S3_BUCKET=""  # Configure if using AWS S3

# Create backup directory
mkdir -p $BACKUP_DIR

# Function to backup with verification
backup_component() {
    local component="$1"
    local command="$2"
    local output_file="$3"
    
    echo "Backing up $component..."
    
    if eval "$command" > "$output_file" 2>/tmp/backup_error.log; then
        echo "✅ $component backup successful"
        return 0
    else
        echo "❌ $component backup failed"
        cat /tmp/backup_error.log
        return 1
    fi
}

# Backup PostgreSQL database
backup_component "PostgreSQL" \
    "docker-compose -f $INSTALL_DIR/docker-compose.yml exec -T postgres pg_dump -U eagowl_poc_user eagowl_poc_db" \
    "$BACKUP_DIR/postgres_$DATE.sql"

# Backup Redis data
backup_component "Redis" \
    "docker-compose -f $INSTALL_DIR/docker-compose.yml exec -T redis redis-cli --rdb -" \
    "$BACKUP_DIR/redis_$DATE.rdb"

# Backup media files
backup_component "Media Files" \
    "tar -czf - -C $INSTALL_DIR/storage media 2>/dev/null" \
    "$BACKUP_DIR/media_$DATE.tar.gz"

# Backup configuration files
backup_component "Configuration" \
    "tar -czf - -C $INSTALL_DIR infrastructure .env docker-compose.yml" \
    "$BACKUP_DIR/config_$DATE.tar.gz"

# Upload to S3 if configured
if [[ -n "$S3_BUCKET" ]]; then
    echo "Uploading to S3 bucket: $S3_BUCKET"
    for file in "$BACKUP_DIR"/*_$DATE*; do
        aws s3 cp "$file" "s3://$S3_BUCKET/backups/" --storage-class STANDARD_IA
    done
fi

# Remove old backups
find $BACKUP_DIR -name "*" -type f -mtime +$RETENTION_DAYS -delete -print

# Create backup summary
cat > "$BACKUP_DIR/backup_$DATE.txt" << SUMMARY
EAGOWL-POC Backup Summary - $DATE
=================================
Components Backed Up:
- PostgreSQL Database: postgres_$DATE.sql
- Redis Data: redis_$DATE.rdb
- Media Files: media_$DATE.tar.gz
- Configuration: config_$DATE.tar.gz

Backup Location: $BACKUP_DIR
Retention Period: $RETENTION_DAYS days
Files Size: $(du -sh $BACKUP_DIR/*_$DATE* | awk '{sum+=$1} END {print sum}')
SUMMARY

echo "Backup completed successfully!"
echo "Summary saved to: $BACKUP_DIR/backup_$DATE.txt"
EOF
    
    chmod +x $INSTALL_DIR/backup.sh
    
    # Create multiple backup schedules
    (crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/backup.sh") | crontab -
    
    # Create systemd timer for more flexible scheduling
    cat > /etc/systemd/system/eagowl-poc-backup.timer << 'EOF'
[Unit]
Description=EAGOWL-POC Backup Timer
Requires=eagowl-poc-backup.service

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=1800  # Random delay up to 30 minutes

[Install]
WantedBy=timers.target
EOF
    
    cat > /etc/systemd/system/eagowl-poc-backup.service << 'EOF'
[Unit]
Description=EAGOWL-POC Backup Service
After=docker.service

[Service]
Type=oneshot
ExecStart=$INSTALL_DIR/backup.sh
User=root
EOF
    
    systemctl daemon-reload
    systemctl enable eagowl-poc-backup.timer
    systemctl start eagowl-poc-backup.timer
    
    log "Enhanced backup configuration completed"
}

# Show post-installation information
show_info() {
    log "EAGOWL-POC Installation Complete!"
    echo ""
    echo -e "${BLUE}Access Information:${NC}"
    echo "  Web Console: http://localhost"
    echo "  API Server: http://localhost:8080"
    echo "  WebSocket: ws://localhost:9998"
    echo ""
    echo -e "${BLUE}Monitoring:${NC}"
    echo "  Grafana: http://localhost:3001 (admin/admin)"
    echo "  Prometheus: http://localhost:9091"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  View logs: docker-compose -f $INSTALL_DIR/docker-compose.yml logs -f"
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

# Enhanced installation function
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
    show_completion
    
    log "EAGOWL-POC installation completed successfully!"
}

# Handle interruption
trap 'error "Installation interrupted"' INT TERM

# Run main function
main "$@"