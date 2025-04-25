# Marvin Blogger Agent

Automatically generate longform blog posts based on Marvin's tweets, art, memory, and cultural signals — and then use those posts to create follow-up tweets with blog links.

## Overview

The Marvin Blogger Agent is a Node.js application that:

1. Gathers content from tweets, images, and memory insights
2. Generates longform blog posts using OpenAI
3. Adds metadata like tags, tone, and memory links
4. Saves posts to a Supabase database
5. Optionally publishes to WordPress
6. Creates follow-up tweet drafts

## Project Structure

```
📁 /agents/blogger/
├── BloggerAgent.ts          ← Main controller class
├── ContextBuilder.ts        ← Gathers content fragments
├── NarrativeComposer.ts     ← Composes longform blog posts
├── MetadataBuilder.ts       ← Assembles tags, tone, memory links
├── PublisherAdapter.ts      ← Saves blog post & publishes it
├── QdrantService.ts         ← Memory insights via vector search
├── ErrorHandler.ts          ← Centralized error handling
├── ConfigManager.ts         ← Environment configuration
├── SupabaseService.ts       ← Database interaction service
├── ActivityLogger.ts        ← Logs agent activities
├── ServiceContainer.ts      ← Dependency injection container
├── index.ts                 ← Entry point and exports
└── types/                   ← Type definitions
    ├── BlogContext.ts
    ├── BlogPost.ts
    └── TweetData.ts
```

## Deployment

This project is configured for deployment using Docker and GitHub Actions. For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Quick Start

1. Clone this repository
2. Create a `.env` file based on `.env.example`
3. Build and run the Docker container:
   ```bash
   docker-compose up -d
   ```

## Configuration

The application requires the following environment variables:

- `SUPABASE_URL` and `SUPABASE_KEY`: For database access
- `QDRANT_HOST` and `QDRANT_PORT`: For memory access
- `OPENAI_API_KEY`: For content generation
- `WORDPRESS_URL`, `WORDPRESS_USERNAME`, and `WORDPRESS_PASSWORD` (optional): For WordPress publishing

## Scheduling

The agent is configured to run twice a day (9 AM and 3 PM) to generate new blog posts.

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript code:
   ```bash
   npm run build
   ```

3. Run the application:
   ```bash
   npm start
   ```

## Testing

Run the tests:
```bash
npm test
```

Run integration tests with real APIs:
```bash
ENABLE_INTEGRATION_TESTS=true npm run test:integration
