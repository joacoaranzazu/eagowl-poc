#!/bin/bash

# EAGOWL-POC Uninstallation Script
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE_NAME="eagowl-poc"
INSTALL_DIR="/opt/eagowl-poc"
BACKUP_DIR="/var/backups/eagowl-poc"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Stop services
stop_services() {
    log "Stopping EAGOWL-POC services..."
    
    # Stop systemd service
    systemctl stop $SERVICE_NAME 2>/dev/null || true
    systemctl disable $SERVICE_NAME 2>/dev/null || true
    
    # Remove systemd service
    rm -f /etc/systemd/system/$SERVICE_NAME.service
    systemctl daemon-reload
    
    cd $INSTALL_DIR 2>/dev/null || return
    
    # Stop Docker containers
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose down --volumes --remove-orphans 2>/dev/null || true
    fi
    
    log "Services stopped"
}

# Remove Docker containers and images
remove_docker() {
    log "Removing Docker containers and images..."
    
    # Remove containers
    docker rm -f $(docker ps -aq --filter "name=eagowl-poc") 2>/dev/null || true
    
    # Remove images
    docker rmi $(docker images "eagowl-poc*" -q) 2>/dev/null || true
    
    log "Docker resources removed"
}

# Remove files and directories
remove_files() {
    log "Removing EAGOWL-POC files..."
    
    # Ask about backup
    read -p "Do you want to keep backup data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ -d $BACKUP_DIR ]]; then
            mv $BACKUP_DIR "/tmp/eagowl-poc-backup-$(date +%Y%m%d)"
            log "Backup data preserved in /tmp/eagowl-poc-backup-$(date +%Y%m%d)"
        fi
    else
        rm -rf $BACKUP_DIR 2>/dev/null || true
        log "Backup data removed"
    fi
    
    # Remove installation directory
    rm -rf $INSTALL_DIR 2>/dev/null || true
    
    # Remove cron job
    crontab -l | grep -v "eagowl-poc" | crontab - 2>/dev/null || true
    
    log "Files and directories removed"
}

# Remove networks and volumes
cleanup_docker() {
    log "Cleaning up Docker resources..."
    
    # Remove Docker network
    docker network rm eagowl-network 2>/dev/null || true
    
    # Remove Docker volumes
    docker volume rm eagowl-poc_postgres_data 2>/dev/null || true
    docker volume rm eagowl-poc_redis_data 2>/dev/null || true
    docker volume rm eagowl-poc_media_storage 2>/dev/null || true
    docker volume rm eagowl-poc_recordings 2>/dev/null || true
    docker volume rm eagowl-poc_prometheus_data 2>/dev/null || true
    docker volume rm eagowl-poc_grafana_data 2>/dev/null || true
    docker volume rm eagowl-poc_elasticsearch_data 2>/dev/null || true
    
    log "Docker resources cleaned up"
}

# Show completion message
show_completion() {
    log "EAGOWL-POC uninstallation completed!"
    echo ""
    echo "The following has been removed:"
    echo "  - System services"
    echo "  - Docker containers and images"
    echo "  - Application files"
    echo "  - Cron jobs"
    echo "  - Docker networks and volumes"
    echo ""
    echo "EAGOWL-POC has been completely removed from your system."
}

# Main function
main() {
    log "Starting EAGOWL-POC uninstallation..."
    
    # Confirmation
    read -p "Are you sure you want to uninstall EAGOWL-POC? This will remove all data. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Uninstallation cancelled"
        exit 0
    fi
    
    check_root
    stop_services
    remove_docker
    remove_files
    cleanup_docker
    show_completion
    
    log "EAGOWL-POC uninstallation completed!"
}

main "$@"