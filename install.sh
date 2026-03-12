#!/bin/bash
# Install script for Anime List Comparator on Debian 13 (Trixie)

# Exit immediately if a command exits with a non-zero status
set -e

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or with sudo."
  exit 1
fi

echo "Updating package lists..."
apt-get update

echo "Installing prerequisites (curl, git, build-essential, sudo)..."
apt-get install -y curl git build-essential sudo

echo "Installing Node.js 22.x (LTS) for Debian..."
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "Verifying Node.js and npm installation..."
node -v
npm -v

# Variables
APP_DIR="/opt/anime-list-comparator"
SERVICE_USER="animelist"
SERVICE_NAME="anime-list-comparator.service"

echo "Creating dedicated system user ($SERVICE_USER) for the application..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -m -d $APP_DIR -s /usr/sbin/nologin $SERVICE_USER
else
    echo "User $SERVICE_USER already exists."
fi

echo "Setting up application directory at $APP_DIR..."
mkdir -p $APP_DIR
# If this repository is cloned elsewhere, copy the app there
# For the purpose of this script assuming it's run from the repo root
if [ -d "anime-list-comparator" ]; then
    cp -r anime-list-comparator/* $APP_DIR/
    cp -r anime-list-comparator/.* $APP_DIR/ 2>/dev/null || true
else
    echo "anime-list-comparator directory not found in the current path. Please run the script from the repository root."
    exit 1
fi

echo "Setting permissions..."
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR

echo "Installing Node dependencies..."
# Switch to the service user to run npm install to avoid permission issues
sudo -u $SERVICE_USER bash -c "cd $APP_DIR && npm install"

echo "Building the Next.js application..."
sudo -u $SERVICE_USER bash -c "cd $APP_DIR && npm run build"

echo "Creating systemd service file..."
cat << EOF > /etc/systemd/system/$SERVICE_NAME
[Unit]
Description=Anime List Comparator Next.js App
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd daemon..."
systemctl daemon-reload

echo "Enabling and starting $SERVICE_NAME..."
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

echo "Installation complete!"
echo "The application should now be running on http://localhost:3000"
echo "You can check its status with: systemctl status $SERVICE_NAME"
