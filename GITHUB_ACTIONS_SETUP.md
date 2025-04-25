# GitHub Actions Setup

The GitHub Actions workflow file has been temporarily removed from the repository because it requires a Personal Access Token with the `workflow` scope to be pushed to GitHub.

## Adding the GitHub Actions Workflow

To add the GitHub Actions workflow for automated deployments:

1. Create the `.github/workflows` directory in the repository:
   ```bash
   mkdir -p .github/workflows
   ```

2. Create the `deploy.yml` file in the `.github/workflows` directory with the following content:

```yaml
name: Deploy to Linode

on:
  push:
    branches: [ main, master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ghcr.io/markausingrow/marvin-blogs:latest
      
      - name: Deploy to Linode
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.LINODE_HOST }}
          username: ${{ secrets.LINODE_USERNAME }}
          key: ${{ secrets.LINODE_SSH_KEY }}
          script: |
            mkdir -p /opt/marvin-blogs/logs
            cd /opt/marvin-blogs
            
            # Create or update docker-compose.yml
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
            
            # Pull the latest image and restart the container
            docker-compose pull
            docker-compose up -d
```

3. Add the following secrets to your GitHub repository:
   - `LINODE_HOST`: Your Linode server IP address
   - `LINODE_USERNAME`: SSH username for your Linode server
   - `LINODE_SSH_KEY`: Private SSH key for authentication

4. Commit and push the changes:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add GitHub Actions workflow for deployment"
   git push
   ```

## Creating a Personal Access Token with Workflow Scope

To create a Personal Access Token with the `workflow` scope:

1. Go to your GitHub account settings
2. Click on "Developer settings" at the bottom of the sidebar
3. Click on "Personal access tokens" and then "Tokens (classic)"
4. Click "Generate new token" and then "Generate new token (classic)"
5. Give your token a descriptive name
6. Select the `workflow` scope (and any other scopes you need)
7. Click "Generate token"
8. Copy the token and store it securely

You can then use this token for Git operations that involve workflow files.
