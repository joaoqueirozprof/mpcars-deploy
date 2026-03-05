#!/bin/bash

# MPCARS VPS Setup Script
# This script sets up a fresh Ubuntu VPS for running the MPCARS car rental application

set -e

echo "=========================================="
echo "MPCARS VPS Setup Script"
echo "=========================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# Update system packages
echo "Step 1: Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required system packages
echo "Step 2: Installing required system packages..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    wget \
    git \
    ufw

# Install Docker
echo "Step 3: Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
echo "Step 4: Installing Docker Compose..."
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version

# Configure UFW Firewall
echo "Step 5: Configuring UFW firewall..."
ufw --force enable

# Allow SSH
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Allow Portainer
ufw allow 9000/tcp

# Allow PgAdmin
ufw allow 8080/tcp

echo "Firewall rules configured:"
ufw show added

# Create mpcars user
echo "Step 6: Creating mpcars user..."
if ! id "mpcars" &>/dev/null; then
    useradd -m -s /bin/bash mpcars
    echo "User 'mpcars' created"
else
    echo "User 'mpcars' already exists"
fi

# Add mpcars user to docker group
usermod -aG docker mpcars

# Create project directory structure
echo "Step 7: Creating project directory structure..."
PROJECT_DIR="/home/mpcars/mpcars-web"
mkdir -p "$PROJECT_DIR"/{backend,frontend,nginx,scripts,ssl,certbot}

# Set proper permissions
echo "Step 8: Setting directory permissions..."
chown -R mpcars:mpcars "$PROJECT_DIR"
chmod -R 755 "$PROJECT_DIR"

# Create required directories for docker volumes
mkdir -p "$PROJECT_DIR"/{postgres_data,redis_data,portainer_data}
chown -R mpcars:mpcars "$PROJECT_DIR"/{postgres_data,redis_data,portainer_data}

# Create logs directory
mkdir -p /var/log/mpcars
chown -R mpcars:mpcars /var/log/mpcars

# Create nginx ssl directory
mkdir -p "$PROJECT_DIR"/ssl
chown -R mpcars:mpcars "$PROJECT_DIR"/ssl
chmod 700 "$PROJECT_DIR"/ssl

# Create backup directory
mkdir -p /backups/mpcars
chown -R mpcars:mpcars /backups/mpcars

echo ""
echo "=========================================="
echo "VPS Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy your project files to: $PROJECT_DIR"
echo "2. Create .env file from .env.example:"
echo "   cp $PROJECT_DIR/.env.example $PROJECT_DIR/.env"
echo "3. Edit .env with your configuration"
echo "4. Generate a strong SECRET_KEY:"
echo "   python3 -c 'import secrets; print(secrets.token_urlsafe(32))'"
echo "5. Navigate to project directory:"
echo "   cd $PROJECT_DIR"
echo "6. Start services with docker-compose:"
echo "   docker-compose up -d"
echo ""
echo "Access points:"
echo "  - Frontend: http://your-domain.com"
echo "  - Backend API: http://your-domain.com/api"
echo "  - PgAdmin: http://your-domain.com:8080"
echo "  - Portainer: http://your-domain.com:9000"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Restart services: docker-compose restart"
echo "  - Stop services: docker-compose down"
echo "  - View status: docker-compose ps"
echo ""
