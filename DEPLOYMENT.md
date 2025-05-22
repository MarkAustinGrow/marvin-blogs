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
- `run.sh`: Script that runs both the web server and the scheduled job

## Manual Deployment Steps

1. SSH into your Linode server:
   ```bash
   ssh root@blogs.marvn.club
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

4. Clone the repository:
   ```bash
   git clone https://github.com/MarkAustinGrow/marvin-blogs.git .
   ```

5. Create a `.env` file with your credentials:
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

6. Edit the `.env` file to add your actual credentials:
   ```bash
   nano .env
   ```

7. Build and start the Docker container:
   ```bash
   docker-compose up -d
   ```

8. Check if the container is running:
   ```bash
   docker ps
   ```

9. View the logs:
   ```bash
   docker-compose logs -f
   ```

## Accessing the Web Interface

The web interface will be available at:
```
http://blogs.marvn.club:3000
```

You can use this interface to:
- View all generated blog posts
- Manually trigger new blog post generation
- View individual blog posts with proper formatting

## Updating the Deployment

To update the deployment with the latest code:

1. SSH into your Linode server:
   ```bash
   ssh root@blogs.marvn.club
   ```

2. Navigate to the deployment directory:
   ```bash
   cd /opt/marvin-blogs
   ```

3. Pull the latest code:
   ```bash
   git pull
   ```

4. Rebuild and restart the container:
   ```bash
   docker-compose up -d --build
   ```

## Monitoring Logs

To check the logs of the running container:

```bash
cd /opt/marvin-blogs
docker-compose logs -f
```

To check the application logs specifically:

```bash
cd /opt/marvin-blogs
cat logs/app.log
```

## Scheduling

The Marvin Blogger Agent is configured to run:
- Immediately when the container starts
- Every 6 hours after that

These times are based on the server's timezone. If you need to change the schedule, modify the `sleep 21600` value in the run.sh file and rebuild the container.

## Troubleshooting

If you encounter issues:

1. Check the container logs:
   ```bash
   docker-compose logs
   ```

2. Check the container health:
   ```bash
   docker inspect --format='{{json .State.Health}}' marvin-blogger | jq
   ```

3. Check the application logs:
   ```bash
   cat logs/app.log
   ```

4. Restart the container:
   ```bash
   docker-compose restart
   ```

5. Rebuild the container:
   ```bash
   docker-compose up -d --build
   ```

### Common Issues and Solutions

#### Qdrant Connection Issues

If you see errors like `connect ECONNREFUSED` or `connect ETIMEDOUT` when trying to connect to Qdrant, it may be due to DNS resolution issues within the Docker container.

**Solution**: Add an `extra_hosts` section to your `docker-compose.yml` file to ensure proper hostname resolution:

```yaml
services:
  marvin-blogger:
    # ... other configuration ...
    extra_hosts:
      - "qdrant.marvn.club:172.236.2.45"  # Replace with your Qdrant server's actual IP
```

This ensures the container can properly resolve the Qdrant hostname to the correct IP address.

#### Template Rendering Errors

If you see errors like `Cannot read properties of null (reading 'forEach')` in the logs, it may be due to null values in the database that the templates are trying to access.

**Solution**: Add null checks in the EJS templates. For example, for the `post.tags` issue:

```ejs
<div class="blog-post-tags">
  <% if (post.tags && Array.isArray(post.tags)) { %>
    <% post.tags.forEach(tag => { %>
      <span class="tag"><%= tag %></span>
    <% }) %>
  <% } %>
</div>
```

This prevents the template from trying to call methods on null values.

#### Local Changes Conflict with Git Pull

If you've made local changes to files on the server and then try to pull updates from GitHub, you might see an error like:

```
error: Your local changes to the following files would be overwritten by merge:
        docker-compose.yml
Please commit your changes or stash them before you merge.
```

**Solution**: Either stash your local changes or force the pull to overwrite them:

```bash
# Option 1: Stash local changes
git stash
git pull
git stash pop  # Apply stashed changes back (may cause conflicts)

# Option 2: Force pull to overwrite local changes
git fetch
git reset --hard origin/master
```
