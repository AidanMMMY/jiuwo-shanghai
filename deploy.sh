#!/bin/bash
# JIUWO Website Deploy Script
# Usage: ./deploy.sh

# ====== 服务器配置 ======
SERVER_IP="47.96.0.252"
SERVER_PORT="22"
SERVER_USER="root"          # 如果你的用户名不是 root，请改成实际用户名
DEPLOY_DIR="/var/www/jiuwo"
# =========================

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Building static site..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo "Deploying to server..."
rsync -avz --delete \
    -e "ssh -p $SERVER_PORT" \
    dist/ \
    $SERVER_USER@$SERVER_IP:$DEPLOY_DIR/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deploy successful!${NC}"
    echo "Site should be live at: http://$SERVER_IP"
else
    echo -e "${RED}Deploy failed!${NC}"
    exit 1
fi
