#!/bin/bash
# Linux Desktop Auto-Setup (Optimized & Cleaned)
export DEBIAN_FRONTEND=noninteractive
export LC_ALL=C

# Suppress APT & debconf warning noise
echo 'APT::Sandbox::User "root";' > /etc/apt/apt.conf.d/99no-sandbox 2>/dev/null || true
mkdir -p /var/log/apt 2>/dev/null || true
chmod 777 /var/log/apt 2>/dev/null || true
rm -f /var/log/apt/eipp.log.xz 2>/dev/null || true

if [[ -f "/tmp/vps_desktop_running" ]]; then
  echo "Desktop setup already in progress or completed."
fi
touch /tmp/vps_desktop_running

if [[ -z "$LINUX_USER_PASSWORD" ]]; then
  LINUX_USER_PASSWORD="cybervps123"
fi
if [[ -z "$LINUX_USERNAME" ]]; then
  LINUX_USERNAME="runner"
fi

echo "### Setting up User ###"
useradd -m $LINUX_USERNAME 2>/dev/null || true
usermod -aG sudo $LINUX_USERNAME 2>/dev/null || true
echo "$LINUX_USERNAME:$LINUX_USER_PASSWORD" | chpasswd 2>/dev/null || true
sed -i 's/\/bin\/sh/\/bin\/bash/g' /etc/passwd 2>/dev/null || true
hostname ${LINUX_MACHINE_NAME:-FreeVPS} 2>/dev/null || true

echo "### Installing Desktop Environment (If missing) ###"
if ! command -v xfce4-session &> /dev/null; then
    echo "Installing Desktop Environment..."
    apt-get update -qq -y 2>/dev/null || true
    apt-get install -qq -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" apt-utils xfce4 desktop-base nautilus nano gdebi firefox tightvncserver dropbear tar wget curl 2>/dev/null || true
    bash -c 'echo "exec /etc/X11/Xsession /usr/bin/xfce4-session" > /etc/chrome-remote-desktop-session' 2>/dev/null || true
    systemctl disable lightdm.service 2>/dev/null || true
fi

mkdir -p /var/run/sshd 2>/dev/null || true
chmod 0755 /var/run/sshd 2>/dev/null || true
pkill dropbear 2>/dev/null || true
service dropbear start 2>/dev/null || /usr/sbin/dropbear -p 22 -W 65536 &

echo -e "no\n$LINUX_USER_PASSWORD\n$LINUX_USER_PASSWORD" | tightvncserver :1 2>/dev/null || true

if [[ -n "$CHROME_HEADLESS_CODE" && -n "$GOOGLE_REMOTE_PIN" ]]; then
   echo "Starting Chrome Remote Desktop..."
   echo -e "$GOOGLE_REMOTE_PIN\n$GOOGLE_REMOTE_PIN" | su - $LINUX_USERNAME -c "$CHROME_HEADLESS_CODE" || true
fi

echo "### Setting up Tunnel ###"
if [[ -n "$NGROK_AUTH_TOKEN" ]]; then
    echo "Using ngrok..."
    if [[ ! -f "./ngrok" || ! -x "./ngrok" ]]; then
        rm -f ngrok.tgz ngrok 2>/dev/null || true
        curl -sSL -o ngrok.tgz https://bin.equinox.io/c/b342Pmq6Ez7/ngrok-v3-stable-linux-amd64.tgz 2>/dev/null || wget -q -O ngrok.tgz https://bin.equinox.io/c/b342Pmq6Ez7/ngrok-v3-stable-linux-amd64.tgz
        tar -xzf ngrok.tgz 2>/dev/null || true
        rm -f ngrok.tgz
        chmod +x ngrok 2>/dev/null || true
    fi
    ./ngrok config add-authtoken $NGROK_AUTH_TOKEN 2>/dev/null || true
    pkill ngrok 2>/dev/null || true
    nohup ./ngrok tcp 22 --log=stdout > ngrok.log 2>&1 &
    sleep 6
    NGROK_URL=$(grep -oE "tcp://[0-9a-z.]*:[0-9]*" ngrok.log | head -n 1)
        
    if [ -z "$NGROK_URL" ]; then
      echo "Failed to start ngrok. Log dump:"
      cat ngrok.log 2>/dev/null || true
    fi
else
    echo "No NGROK_AUTH_TOKEN found, setting up bore tunnel..."
    if [[ ! -f "./bore" || ! -x "./bore" || ! (./bore --version &>/dev/null) ]]; then
        rm -f bore.tar.gz bore 2>/dev/null || true
        curl -sSL -o bore.tar.gz https://github.com/ekzhang/bore/releases/download/v0.5.1/bore-v0.5.1-x86_64-unknown-linux-musl.tar.gz 2>/dev/null || wget -q -O bore.tar.gz https://github.com/ekzhang/bore/releases/download/v0.5.1/bore-v0.5.1-x86_64-unknown-linux-musl.tar.gz
        tar -xzf bore.tar.gz 2>/dev/null || true
        rm -f bore.tar.gz
        chmod +x bore 2>/dev/null || true
        chmod 755 bore 2>/dev/null || true
    fi

    pkill bore 2>/dev/null || true
    rm -f bore.log
    
    if [[ -x "./bore" ]]; then
        nohup ./bore local 22 --to bore.pub > bore.log 2>&1 &
        sleep 6
        PORT=$(grep -o -E "bore.pub:[0-9]+" bore.log | cut -d ':' -f 2 | head -n 1)
        if [ -z "$PORT" ]; then
          echo "Bore output:"
          cat bore.log 2>/dev/null || true
        fi
    else
        echo "Failed to prepare bore executable."
    fi
fi
