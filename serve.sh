#!/usr/bin/env bash
# 启动本地静态服务器,绑定所有网卡(0.0.0.0),方便局域网内手机/平板等真机访问。
# 用法: ./serve.sh [端口]   默认端口 8123
set -e

PORT="${1:-8123}"
BIND="0.0.0.0"
ROOT="$(cd "$(dirname "$0")" && pwd)"

# 探测本机局域网 IPv4(排除回环)
LAN_IP="$(ip -4 addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '^127\.' | head -1)"
[ -z "$LAN_IP" ] && LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

echo "========================================================"
echo "  Science Demo 本地服务器 (绑定所有网卡 ${BIND})"
echo "  根目录 : ${ROOT}"
echo "  本机   : http://localhost:${PORT}/"
[ -n "$LAN_IP" ] && echo "  局域网 : http://${LAN_IP}:${PORT}/   (手机连同一 WiFi 打开)"
echo "  按 Ctrl+C 停止"
echo "========================================================"

cd "$ROOT"
exec python3 -m http.server "$PORT" --bind "$BIND"
