#!/bin/bash
# Deployment script for server

set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /path/to/your/project  # Update this path

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Activate virtual environment
echo "🐍 Activating Python virtual environment..."
source myenv/bin/activate

# Install/update Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Install/update Node dependencies
echo "📦 Installing Node dependencies..."
npm ci

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Restart backend service
echo "🔄 Restarting backend service..."
sudo systemctl restart client-portal-backend || pm2 restart client-portal-backend || echo "⚠️  Service restart skipped (update command based on your setup)"

# Restart frontend service (if separate)
echo "🔄 Restarting frontend service..."
sudo systemctl restart client-portal-frontend || pm2 restart client-portal-frontend || echo "⚠️  Frontend service restart skipped"

echo "✅ Deployment complete!"



