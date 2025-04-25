# Deployment Guide for Marvin Blogger Agent

This guide explains how to deploy the Marvin Blogger Agent to a Linode server using Docker.

## Prerequisites

- A Linode server with Docker and Docker Compose installed
- DNS record pointing to your Linode server (e.g., blogs.marvn.club)
- GitHub repository set up at https://github.com/MarkAustinGrow/marvin-blogs

## Deployment Files

The following files have been created for deployment:

- `Dockerfile`: Defines how to build the Docker image
- `docker-compose.yml`: Defines the Docker service configuration
- `.github/workflows/deploy.yml`: GitHub Actions workflow for CI/CD

## Manual Deployment Steps

If you prefer to deploy manually without GitHub Actions:

1. SSH into your Linode server:
   ```bash
   ssh username@your-linode-ip
   ```

2. Install Docker and Docker Compose if not already installed:
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. Create a directory for the deployment:
   ```bash
   mkdir -p /opt/marvin-blogs/logs
   cd /opt/marvin-blogs
   ```

4. Create a `.env` file with your credentials:
   ```bash
   cat > .env << 'EOL'
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
   ```

5. Clone the repository and build the Docker image:
   ```bash
   git clone https://github.com/MarkAustinGrow/marvin-blogs.git .
   docker-compose up -d
   ```

## Automated Deployment with GitHub Actions

To use the GitHub Actions workflow for automated deployments:

1. Add the following secrets to your GitHub repository:
   - `LINODE_HOST`: Your Linode server IP address
   - `LINODE_USERNAME`: SSH username for your Linode server
   - `LINODE_SSH_KEY`: Private SSH key for authentication

2. Create the `.env` file on your Linode server:
   ```bash
   mkdir -p /opt/marvin-blogs
   cd /opt/marvin-blogs
   
   cat > .env << 'EOL'
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
   ```

3. Push changes to the `main` branch of your GitHub repository:
   ```bash
   git add .
   git commit -m "Initial deployment setup"
   git push origin main
   ```

4. The GitHub Actions workflow will automatically:
   - Build the Docker image
   - Push it to GitHub Container Registry
   - Deploy it to your Linode server

## Monitoring Logs

To check the logs of the running container:

```bash
cd /opt/marvin-blogs
docker-compose logs -f
```

To check the cron job logs specifically:

```bash
cd /opt/marvin-blogs
cat logs/cron.log
```

## Scheduling

The Marvin Blogger Agent is configured to run twice a day:
- 9:00 AM
- 3:00 PM

These times are based on the server's timezone. If you need to change the schedule, modify the cron job in the Dockerfile and rebuild the image.

## Troubleshooting

If you encounter issues:

1. Check the container logs:
   ```bash
   docker-compose logs
   ```

2. Check if the container is running:
   ```bash
   docker ps
   ```

3. Check the cron logs:
   ```bash
   cat logs/cron.log
   ```

4. Restart the container:
   ```bash
   docker-compose restart
