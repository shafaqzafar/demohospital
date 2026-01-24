#!/bin/bash

# VPS Deployment Script for demohospital
# Frontend: demohospital.healthspire.org
# Backend: demohospital-backend.healthspire.org

echo "🚀 Starting demohospital deployment..."

# Navigate to project directory
cd /var/www/demohospital

# Kill any existing processes on port 4000
echo "🔄 Stopping existing processes..."
sudo pkill -f "node.*4000" || true
sudo pkill -f "npm.*dev" || true

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd backend && npm install && cd ..

# Build the project
echo "🔨 Building project..."
cd backend && npm run build && cd ..
npm run build:front

# Copy production environment file
echo "⚙️ Setting up production environment..."
cp backend/.env.production backend/.env

# Setup PM2
echo "🔧 Setting up PM2..."
npm install -g pm2

# Start backend with PM2
echo "🚀 Starting backend with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save

# Setup PM2 startup
pm2 startup | grep -E '^sudo' | sh

# Setup Nginx
echo "🌐 Setting up Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/demohospital
sudo ln -sf /etc/nginx/sites-available/demohospital /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Install MongoDB if not installed
if ! command -v mongod &> /dev/null; then
    echo "📊 Installing MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
fi

# Create production database users
echo "👥 Creating database users..."
node backend/create_production_users.js

echo "✅ Deployment completed!"
echo "🌐 Frontend: https://demohospital.healthspire.org"
echo "🔧 Backend API: https://demohospital-backend.healthspire.org"
echo "📊 MongoDB: mongodb://localhost:27017/hospital_prod"

echo ""
echo "🔐 Login Credentials:"
echo "   Admin: username: admin, password: 123"
echo "   Finance: username: finance, password: 123"
echo "   Reception: username: recep, password: 123"
echo "   Doctors: username: umar/ibad, password: 123"
echo "   Lab: username: lab, password: 123"
echo "   Pharmacy: username: admin, password: 123"
echo "   Diagnostic: username: diagnostic, password: 123"
