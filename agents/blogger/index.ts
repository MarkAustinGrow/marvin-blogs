// Main agent
export { BloggerAgent } from './BloggerAgent';

// Core services
export { ServiceContainer } from './ServiceContainer';
export { ConfigManager } from './ConfigManager';
export { ErrorHandler, ErrorType } from './ErrorHandler';
export { SupabaseService } from './SupabaseService';
export { QdrantService } from './QdrantService';
export { ContextBuilder } from './ContextBuilder';
export { NarrativeComposer } from './NarrativeComposer';
export { MetadataBuilder } from './MetadataBuilder';
export { PublisherAdapter } from './PublisherAdapter';
export { ActivityLogger } from './ActivityLogger';

// Types
export { BlogContext, Tweet, MemoryInsight } from './types/BlogContext';
export { BlogPost } from './types/BlogPost';
export { TweetData } from './types/TweetData';

/**
 * Marvin Blogger Agent
 * 
 * This agent automatically generates longform blog posts based on Marvin's tweets,
 * art, memory, and cultural signals — and then uses those posts to create
 * follow-up tweets with blog links.
 * 
 * Usage:
 * ```typescript
 * import { BloggerAgent } from './agents/blogger';
 * 
 * const agent = new BloggerAgent();
 * agent.run().catch(console.error);
 * ```
 */
