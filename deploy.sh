#!/bin/bash
# Run this script on your DigitalOcean VPS (or any Linux server) to deploy OpenOA.
# Prerequisites: Docker and Docker Compose installed.

set -e
REPO_URL="${REPO_URL:-https://github.com/NatLabRockies/OpenOA.git}"
DEPLOY_DIR="${DEPLOY_DIR:-./openoa-deploy}"

echo "Cloning repository..."
git clone "$REPO_URL" "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

echo "Building and starting containers..."
docker compose up -d --build

echo "Waiting for backend to initialize (60s)..."
sleep 60

echo "Checking health..."
curl -sf http://localhost:8000/api/health || true

echo ""
echo "Deployment complete. Access the app at http://YOUR_SERVER_IP"
echo "If using Cloudflare: Add an A record pointing your domain to this server's IP."
echo "Ensure ports 80 and 443 are open in your firewall."
