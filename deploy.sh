#!/bin/bash

# ===================================
# Production Deployment Script
# ===================================

set -e

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Please do not run this script as root${NC}"
    exit 1
fi

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p nginx/sites-available nginx/sites-enabled nginx/logs ssl mysql/init

# Copy Nginx site configuration
if [ ! -f "nginx/sites-available/p-inventory.mfu.ac.th" ]; then
    echo -e "${YELLOW}⚠️  Please create nginx/sites-available/p-inventory.mfu.ac.th configuration file${NC}"
fi

# Create symlink for enabled site
if [ ! -L "nginx/sites-enabled/p-inventory.mfu.ac.th" ]; then
    ln -sf ../sites-available/p-inventory.mfu.ac.th nginx/sites-enabled/
fi

# Check SSL certificates
if [ ! -f "ssl/p-inventory.mfu.ac.th.crt" ] || [ ! -f "ssl/p-inventory.mfu.ac.th.key" ]; then
    echo -e "${RED}❌ SSL certificates not found!${NC}"
    echo -e "${YELLOW}Please place your SSL certificates in the ssl/ directory:${NC}"
    echo "  - ssl/p-inventory.mfu.ac.th.crt"
    echo "  - ssl/p-inventory.mfu.ac.th.key"
    echo ""
    echo -e "${YELLOW}💡 For testing purposes, you can generate self-signed certificates:${NC}"
    echo "sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
    echo "  -keyout ssl/p-inventory.mfu.ac.th.key \\"
    echo "  -out ssl/p-inventory.mfu.ac.th.crt \\"
    echo "  -subj '/C=TH/ST=ChiangMai/L=ChiangMai/O=MFU/CN=p-inventory.mfu.ac.th'"
    exit 1
fi

# Check environment file
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo -e "${YELLOW}Please create .env.production file with your configuration${NC}"
    exit 1
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down --remove-orphans || true

# Remove old images (optional, comment out if you want to keep them)
echo -e "${YELLOW}🗑️  Removing old images...${NC}"
docker system prune -f

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
docker-compose --env-file .env.production up --build -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check service health
echo -e "${YELLOW}🏥 Checking service health...${NC}"

# Check MySQL
if docker-compose exec -T mysql mysqladmin ping -h localhost --silent; then
    echo -e "${GREEN}✅ MySQL is running${NC}"
else
    echo -e "${RED}❌ MySQL is not responding${NC}"
fi

# Check Backend
if curl -f -s http://localhost:4000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
fi

# Check Frontend
if curl -f -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend is not responding${NC}"
fi

# Check Nginx
if curl -f -s http://localhost/health > /dev/null; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is not responding${NC}"
fi

# Show running containers
echo -e "${YELLOW}📋 Running containers:${NC}"
docker-compose ps

# Show logs (last 10 lines)
echo -e "${YELLOW}📝 Recent logs:${NC}"
docker-compose logs --tail=10

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${GREEN}🌐 Your application should be available at: https://p-inventory.mfu.ac.th${NC}"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"
echo "  View containers: docker-compose ps"
echo ""
echo -e "${YELLOW}🔧 Troubleshooting:${NC}"
echo "  If services don't start, check logs: docker-compose logs [service_name]"
echo "  To rebuild: docker-compose up --build -d"