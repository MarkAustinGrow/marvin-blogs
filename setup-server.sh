#!/bin/bash
# Setup script for Marvin Blogger Agent on Linode server

# Exit on error
set -e

# Print commands
set -x

# Update system
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create deployment directory
mkdir -p /opt/marvin-blogs/logs
cd /opt/marvin-blogs

# Create docker-compose.yml
cat > docker-compose.yml << 'EOL'
version: '3.8'

services:
  marvin-blogger:
    image: ghcr.io/markausingrow/marvin-blogs:latest
    restart: always
    env_file: .env
    volumes:
      - ./logs:/app/logs
EOL

# Create .env template (to be filled in manually)
cat > .env.template << 'EOL'
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
QDRANT_HOST=your_qdrant_host
QDRANT_PORT=6333
OPENAI_API_KEY=your_openai_api_key

# Optional WordPress credentials
# WORDPRESS_URL=your_wordpress_url
# WORDPRESS_USERNAME=your_wordpress_username
# WORDPRESS_PASSWORD=your_wordpress_password
EOL

# Copy template to .env (to be edited)
cp .env.template .env

# Set permissions
chmod 600 .env

echo "========================================================"
echo "Server setup complete!"
echo "========================================================"
echo "Next steps:"
echo "1. Edit the .env file with your credentials:"
echo "   nano /opt/marvin-blogs/.env"
echo ""
echo "2. Pull and start the Docker container:"
echo "   cd /opt/marvin-blogs && docker-compose up -d"
echo ""
echo "3. Check the logs:"
echo "   docker-compose logs -f"
echo "========================================================"
