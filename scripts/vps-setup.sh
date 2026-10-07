#!/usr/bin/env bash
# ==============================================================================
# Harumi 24/7 VPS Deployment & Bore Tunnel Setup Script
# Compatible with Ubuntu/Debian/Alpine VPS, including FreeVPS (https://github.com/cybershadowvps/FreeVPS)
# ==============================================================================

set -e

echo "=========================================="
echo "🌸 Harumi Discord Bot - 24/7 VPS Setup"
echo "=========================================="

# 1. Update system packages and install FFmpeg (required for Discord voice & TTS)
echo "[1/6] Updating packages and installing FFmpeg & build tools..."
if [ -x "$(command -v apt-get)" ]; then
    sudo apt-get update -y
    sudo apt-get install -y curl git ffmpeg build-essential python3
elif [ -x "$(command -v apk)" ]; then
    apk update
    apk add nodejs npm git ffmpeg make g++ python3 curl
fi

# 2. Verify or Install Node.js (v20+ LTS)
echo "[2/6] Checking Node.js environment..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
    echo "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node.js Version: $(node -v)"
echo "NPM Version: $(npm -v)"

# 3. Install PM2 process manager for 24/7 background uptime
echo "[3/6] Installing PM2 process manager globally..."
sudo npm install -g pm2

# 4. Install Bore for Public Tunneling (https://github.com/ekzhang/bore)
echo "[4/6] Installing Bore tunnel CLI for remote web dashboard access..."
if ! command -v bore &> /dev/null; then
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        curl -fsSL https://github.com/ekzhang/bore/releases/download/v0.5.1/bore-v0.5.1-x86_64-unknown-linux-musl.tar.gz | tar -xz -C /tmp
        sudo mv /tmp/bore /usr/local/bin/bore
        sudo chmod +x /usr/local/bin/bore
        echo "Bore tunnel CLI installed successfully."
    else
        echo "Bore prebuilt binary not matched for $ARCH; install with cargo or use cloudflared if needed."
    fi
fi

# 5. Project dependencies and database initialization
echo "[5/6] Initializing Harumi application & Prisma database..."
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run build

# 6. Start Harumi with PM2 for 24/7 execution
echo "[6/6] Launching Harumi daemon via PM2..."
pm2 delete harumi 2>/dev/null || true
pm2 start server.ts --name "harumi" --interpreter ./node_modules/.bin/tsx
pm2 save
pm2 startup | tail -n 1 | sudo bash || true

echo "=========================================="
echo "✅ Harumi is now running 24/7 on your VPS!"
echo "Status check: pm2 status"
echo "Live bot logs: pm2 logs harumi"
echo ""
echo "To expose the web dashboard externally via Bore tunnel, run:"
echo "  bore local 3000 --to bore.pub"
echo "=========================================="
