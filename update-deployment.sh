#!/bin/bash

# Update Deployment Script for Marvin Blogger Agent
# This script updates the deployment on the Linode server

# Display banner
echo "====================================================="
echo "  Marvin Blogger Agent - Deployment Update Script"
echo "====================================================="

# Check if SSH key is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <ssh-key-path>"
  echo "Example: $0 ~/.ssh/id_rsa"
  exit 1
fi

SSH_KEY="$1"
SERVER="root@blogs.marvn.club"
DEPLOY_DIR="/opt/marvin-blogs"

echo "Connecting to $SERVER..."
echo "Using SSH key: $SSH_KEY"

# SSH into the server and run the update commands
ssh -i "$SSH_KEY" "$SERVER" << 'EOF'
  echo "Connected to server. Starting update process..."
  
  # Navigate to the deployment directory
  cd /opt/marvin-blogs
  
  # Check if the directory exists
  if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Error: Deployment directory not found!"
    exit 1
  fi
  
  echo "Pulling latest code from GitHub..."
  git pull
  
  echo "Rebuilding and restarting Docker container..."
  docker-compose up -d --build
  
  echo "Checking container status..."
  docker ps | grep marvin-blogger
  
  echo "Update completed successfully!"
EOF

# Check if the SSH command was successful
if [ $? -eq 0 ]; then
  echo "====================================================="
  echo "  Deployment updated successfully!"
  echo "  Web interface: http://blogs.marvn.club:3000"
  echo "====================================================="
else
  echo "====================================================="
  echo "  Error: Deployment update failed!"
  echo "  Please check the error messages above."
  echo "====================================================="
  exit 1
fi
