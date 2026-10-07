#!/usr/bin/env bash
# ==============================================================================
# Harumi 24/7 VPS Runner with Bore Tunnel daemon
# ==============================================================================

set -e

echo "Starting Harumi Discord Bot Engine 24/7..."
npx prisma generate
npx prisma db push

# Launch Harumi with PM2
pm2 delete harumi 2>/dev/null || true
pm2 start server.ts --name "harumi" --interpreter ./node_modules/.bin/tsx

echo "Harumi service launched."
pm2 status

# Launch Bore tunnel if available to expose the port 3000 dashboard
if command -v bore &> /dev/null; then
    echo "Starting Bore tunnel on port 3000 to bore.pub..."
    pm2 delete harumi-tunnel 2>/dev/null || true
    pm2 start "bore local 3000 --to bore.pub" --name "harumi-tunnel"
    echo "Bore tunnel started! Check 'pm2 logs harumi-tunnel' for public URL."
fi
