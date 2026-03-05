#!/bin/bash

# MPCARS Deployment Script
# This script handles the deployment of the MPCARS application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}=========================================="
echo "MPCARS Deployment Script"
echo "==========================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found at $PROJECT_DIR/.env${NC}"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Load environment variables
set -a
source "$PROJECT_DIR/.env"
set +a

# Change to project directory
cd "$PROJECT_DIR"

# Step 1: Pull latest changes from git (if git repository)
if [ -d "$PROJECT_DIR/.git" ]; then
    echo -e "${YELLOW}Step 1: Pulling latest changes from git...${NC}"
    git pull origin main || git pull origin master
    echo -e "${GREEN}✓ Git pull completed${NC}"
    echo ""
else
    echo -e "${YELLOW}Step 1: Git repository not found, skipping git pull${NC}"
    echo ""
fi

# Step 2: Build containers
echo -e "${YELLOW}Step 2: Building Docker containers...${NC}"
docker-compose build
echo -e "${GREEN}✓ Containers built successfully${NC}"
echo ""

# Step 3: Stop existing services (if running)
echo -e "${YELLOW}Step 3: Stopping existing services...${NC}"
docker-compose down || true
echo -e "${GREEN}✓ Services stopped${NC}"
echo ""

# Step 4: Start services
echo -e "${YELLOW}Step 4: Starting services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 5: Wait for database to be ready
echo -e "${YELLOW}Step 5: Waiting for database to be ready...${NC}"
sleep 10
counter=0
max_attempts=30
while [ $counter -lt $max_attempts ]; do
    if docker-compose exec -T postgres pg_isready -U ${DB_USER:-mpcars} > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database is ready${NC}"
        break
    fi
    counter=$((counter + 1))
    echo "Waiting for database... (attempt $counter/$max_attempts)"
    sleep 2
done

if [ $counter -eq $max_attempts ]; then
    echo -e "${RED}✗ Database failed to become ready${NC}"
    exit 1
fi
echo ""

# Step 6: Run database migrations
echo -e "${YELLOW}Step 6: Running database migrations...${NC}"
if docker-compose exec -T backend alembic upgrade head 2>/dev/null; then
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${YELLOW}Note: Alembic not configured or migrations skipped${NC}"
fi
echo ""

# Step 7: Restart services to ensure clean state
echo -e "${YELLOW}Step 7: Restarting services...${NC}"
docker-compose restart
echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

# Step 8: Show service status
echo -e "${YELLOW}Step 8: Service Status:${NC}"
docker-compose ps
echo ""

# Step 9: Show recent logs
echo -e "${YELLOW}Step 9: Recent Service Logs:${NC}"
echo "Showing last 20 lines from each service..."
echo ""

echo -e "${YELLOW}Backend logs:${NC}"
docker-compose logs --tail=20 backend
echo ""

echo -e "${YELLOW}Frontend logs:${NC}"
docker-compose logs --tail=20 frontend
echo ""

echo -e "${YELLOW}Nginx logs:${NC}"
docker-compose logs --tail=20 nginx
echo ""

# Summary
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Access your application:"
echo "  - Frontend: http://localhost:3000 or https://your-domain.com"
echo "  - Backend API: http://localhost:8000 or https://your-domain.com/api"
echo "  - PgAdmin: http://localhost:8080"
echo "  - Portainer: http://localhost:9000"
echo ""
echo "Useful commands:"
echo "  - View live logs: docker-compose logs -f <service_name>"
echo "  - Restart specific service: docker-compose restart <service_name>"
echo "  - Execute command in backend: docker-compose exec backend <command>"
echo "  - View database: Access PgAdmin at http://localhost:8080"
echo "  - Manage containers: Access Portainer at http://localhost:9000"
echo ""
echo -e "${YELLOW}Remember to:${NC}"
echo "  1. Configure SSL certificates for HTTPS"
echo "  2. Set up proper backups for PostgreSQL data"
echo "  3. Monitor application logs regularly"
echo "  4. Update Docker images periodically"
echo ""
