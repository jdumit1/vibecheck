#!/bin/bash
set -e

echo "🔨 Building VibeCheck..."

# Build frontend
echo "Building frontend..."
npm ci
npm run build

# Move frontend build to backend static folder
mkdir -p backend/static
cp -r dist/* backend/static/

echo "✅ Build complete!"
