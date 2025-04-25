# Revised Roadmap: Building the Marvin Blogger Agent

## Goal
Automatically generate longform blog posts based on Marvin's tweets, art, memory, and cultural signals — and then use those posts to create follow-up tweets with blog links.

## 🌀 Phase 0: Setup & Architecture

### 0.1 Create New Agent Module
```
📁 /agents/blogger/
├── BloggerAgent.ts          ← Main controller class
├── ContextBuilder.ts        ← Gathers content fragments
├── NarrativeComposer.ts     ← Composes longform blog posts
├── MetadataBuilder.ts       ← Assembles tags, tone, memory links
├── PublisherAdapter.ts      ← Saves blog post & publishes it
├── TweetGenerator.ts        ← Summarizes blog into follow-up tweets
├── QdrantService.ts         ← Memory insights via vector search
├── ErrorHandler.ts          ← Centralized error handling
├── ConfigManager.ts         ← Environment configuration
└── types/                   ← Type definitions
    ├── BlogContext.ts
    ├── BlogPost.ts
    └── TweetData.ts
```

### 0.2 Dependency Management
Implement a simple dependency injection pattern:
- Create a `ServiceContainer` class to register and resolve dependencies
- Each component receives its dependencies via constructor
- This allows for easier testing and component replacement

### 0.3 Configuration Setup
- Use existing `.env` file for environment variables
- Create `.env.example` file for reference
- Implement ConfigManager to load and validate configuration
- Include separate configs for dev/prod environments
- Use the following environment variables:
  - SUPABASE_URL and SUPABASE_KEY for database access
  - OPENAI_API_KEY for content generation
  - QDRANT_HOST and QDRANT_PORT for memory access
  - Other API keys as needed

### 0.4 Error Handling Strategy
Implement centralized error handling in ErrorHandler.ts:
- API failures (OpenAI, Supabase, WordPress)
- Content generation issues
- Database operation errors
- Network/connectivity problems
- Implement retry logic for transient failures
- Log errors to a dedicated errors table for monitoring

## 🧠 Phase 1: Build Context with Supabase + Qdrant
*Can be developed in parallel with Phase 4*

### 1.1 Pull Context From Supabase
- Latest Marvin tweets from tweets_cache table
  - Use fields like tweet_text, vibe_tags, and embedding_vector
- Latest generated art prompt + image (images + prompts tables)
- Character tone/persona from character_files table
- Cultural cues from tweets_cache and sentiment_data tables

### 1.2 Integrate with Marvin's Memory
- Connect to Qdrant using QDRANT_HOST and QDRANT_PORT from .env
- Use OpenAI's text-embedding-3-small model for embedding generation
- Implement semantic search to find related memories
- Query for top 3–5 related memories based on:
  - Art prompts
  - Tweet content
  - Blog topic/category
- Extract content, tags, and timestamps from memory results

### 1.3 Integration Checkpoint
- Create unit tests to verify context structure
- Build a simple CLI tool to test context building in isolation
- Validate that the context object structure works with planned NarrativeComposer

### 1.4 Fallback Triggers
- Implement logic for when no suitable tweets are available
- Add alternative triggers (time-based, trending topic, etc.)

## 🧵 Phase 2: Compose Blog Post

### 2.1 Create NarrativeComposer.ts
- Use OpenAI to generate longform Markdown
- Include:
  - Tweet-inspired intro
  - Art + cultural context
  - Insights from memory
  - Poetic Marvin-style closing

### 2.2 Implement Rate Limiting & Caching
- Add rate limit tracking for OpenAI API calls
- Implement exponential backoff for retries
- Cache character tone/persona data to reduce database calls

### 2.3 Integration Checkpoint
- Test NarrativeComposer with sample context data
- Verify output format and quality

## 🖼️ Phase 3: Visual + Metadata Integration

### 3.1 MediaIntegrator
- Attach image from Supabase as featured_image
- Optional: Add glitch overlay or watermark (Marvin-style)
- Implement error handling for missing images

### 3.2 MetadataBuilder
- Build tags from:
  - Tweet vibe_tags from tweets_cache
  - Art prompt keywords
  - Memory insight tags
- Link related memory_refs by UUID
- Set tone from character_files or inferred from post

## 💾 Phase 4: Database & Publishing Setup
*Can be developed in parallel with Phase 1*

### 4.1 Create Database Tables

```sql
-- Blog posts table with indexing
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  markdown TEXT,
  html TEXT,
  image_url TEXT,
  category TEXT,
  tags TEXT[],
  tone TEXT,
  memory_refs UUID[],
  character_id UUID REFERENCES character_files(id),
  post_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'draft',
  version INT DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX idx_blog_posts_created_at ON blog_posts(created_at);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN(tags);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);

-- Error logging table
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT,
  error_type TEXT,
  message TEXT,
  stack TEXT,
  context JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

### 4.2 Save Post to Supabase
- Use SupabaseService.insert('blog_posts', {...})
- Implement versioning for edited/regenerated posts
- Add status field (draft, published, archived)

### 4.3 WordPress Integration
- Create PublisherAdapter with WordPress REST API integration
- Implement error handling and retry logic
- Add capability to update existing posts

### 4.4 Admin Interface Preparation
- Define API endpoints for admin console
- Implement methods for listing, viewing, and deleting posts

## 🐦 Phase 5: Generate Tweets from the Blog

### 5.1 Create TweetGenerator.ts
- Summarize the blog post in 1–3 tweet drafts
- Include post_url in each
- Reflect Marvin's tone from character_files content

### 5.2 Post or Queue Tweets
- Immediately post one via TwitterService
- Queue others for daily drips (your scheduler)
- Implement error handling for Twitter API failures

## 📈 Phase 6: Logging & Monitoring

### 6.1 Activity Logging
```typescript
SupabaseService.insert('activity_logs', {
  agent_name: 'marvin',
  action: 'blog_created',
  category: 'blog',
  details: 'Published: "Layers in Ink"',
  version: 1
});
```

### 6.2 Basic Performance Metrics
- Track generation time
- Monitor API call counts and latency
- Log resource usage

## 🧪 Phase 7: Testing & MVP Validation

### 7.1 MVP Implementation
- Build minimal version (tweet → blog) without full memory integration
- Test end-to-end workflow with sample data
- Validate core functionality before adding advanced features

### 7.2 Integration Testing
- Create automated tests for the full pipeline
- Test error scenarios and recovery
- Validate with different input types

## 🔄 Future Extensions

### Content Approval Workflow
- Build admin console for blog management
- Implement approval/rejection workflow
- Add capability to edit generated content

### Engagement Monitoring
- Interface with future engagement monitoring agent
- Incorporate feedback into generation process

### Advanced Versioning
- Track content changes across versions
- Implement diff visualization for versions
- Add capability to revert to previous versions

### Scaling Considerations
- Optimize database queries as content grows
- Implement caching for frequently accessed content
- Consider sharding strategy for long-term growth

## Deployment Strategy
- Deploy to Linode server using environment variables from .env
- Set up monitoring and alerting
- Implement backup strategy for database
