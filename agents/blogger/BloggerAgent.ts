import { ServiceContainer } from './ServiceContainer';
import { ConfigManager } from './ConfigManager';
import { ErrorHandler, ErrorType } from './ErrorHandler';
import { SupabaseService } from './SupabaseService';
import { QdrantService } from './QdrantService';
import { ContextBuilder } from './ContextBuilder';
import { NarrativeComposer } from './NarrativeComposer';
import { MetadataBuilder } from './MetadataBuilder';
import { PublisherAdapter } from './PublisherAdapter';
import { ActivityLogger } from './ActivityLogger';
import { BlogPost } from './types/BlogPost';
import { TweetData } from './types/TweetData';
import { BlogContext } from './types/BlogContext';

/**
 * BloggerAgent - Main controller class for the Marvin Blogger Agent
 * 
 * This class orchestrates the blog post generation process, from gathering
 * context to composing the post, adding metadata, publishing, and generating
 * follow-up tweets.
 */
export class BloggerAgent {
  private container: ServiceContainer;
  
  /**
   * Create a new BloggerAgent instance
   */
  constructor() {
    this.container = new ServiceContainer();
    this.setupDependencies();
  }
  
  /**
   * Set up dependencies in the service container
   */
  private setupDependencies(): void {
    // Register configuration manager
    const configManager = new ConfigManager();
    this.container.register('configManager', configManager);
    
    // Register error handler
    const errorHandler = new ErrorHandler(null); // Temporarily null, will be updated after SupabaseService is registered
    this.container.register('errorHandler', errorHandler);
    
    // Register Supabase service
    const supabaseService = new SupabaseService(configManager);
    this.container.register('supabaseService', supabaseService);
    
    // Update error handler with Supabase service
    (errorHandler as any).supabaseService = supabaseService;
    
    // Register Qdrant service
    const qdrantService = new QdrantService(configManager, errorHandler);
    this.container.register('qdrantService', qdrantService);
    
    // Register context builder
    const contextBuilder = new ContextBuilder(this.container);
    this.container.register('contextBuilder', contextBuilder);
    
    // Register narrative composer
    const narrativeComposer = new NarrativeComposer(this.container);
    this.container.register('narrativeComposer', narrativeComposer);
    
    // Register metadata builder
    const metadataBuilder = new MetadataBuilder(this.container);
    this.container.register('metadataBuilder', metadataBuilder);
    
    // Register publisher adapter
    const publisherAdapter = new PublisherAdapter(this.container);
    this.container.register('publisherAdapter', publisherAdapter);
    
    // Register activity logger
    const activityLogger = new ActivityLogger(this.container);
    this.container.register('activityLogger', activityLogger);
    
    // Other services would be registered here as they are implemented
    // For example:
    // this.container.register('tweetGenerator', new TweetGenerator(...));
  }
  
  /**
   * Generate a blog post
   * 
   * This method orchestrates the entire blog post generation process.
   * 
   * @param useMemoryAsSource Whether to use memory as the primary source for blog generation
   * @returns A promise that resolves to the generated blog post
   */
  async generateBlogPost(useMemoryAsSource: boolean = true): Promise<BlogPost> {
    try {
      // Step 1: Build context
      const contextBuilder = this.container.resolve<ContextBuilder>('contextBuilder');
      
      // Use memory-based context building if specified
      const context: BlogContext = useMemoryAsSource
        ? await contextBuilder.buildContextFromMemory(5) // Get 5 random memories
        : await contextBuilder.buildContext();
      
      // Step 2: Compose narrative
      const composer = this.container.resolve<NarrativeComposer>('narrativeComposer');
      const content = await composer.compose(context);
      
      // Step 3: Build metadata
      const metadataBuilder = this.container.resolve<MetadataBuilder>('metadataBuilder');
      const metadata = await metadataBuilder.buildMetadata(context, content);
      
      // Add memory references if using memory as source
      if (useMemoryAsSource && context.memoryInsights) {
        metadata.memory_refs = context.memoryInsights
          .filter(memory => memory.id)
          .map(memory => memory.id as string);
      }
      
      // Step 4: Save and publish
      const publisher = this.container.resolve<PublisherAdapter>('publisherAdapter');
      const blogPost: BlogPost = {
        ...content,
        ...metadata
      };
      
      return await publisher.saveAndPublish(blogPost);
    } catch (error) {
      // Handle errors
      const errorHandler = this.container.resolve<ErrorHandler>('errorHandler');
      await errorHandler.handleError(error as Error, ErrorType.UNKNOWN, { 
        operation: 'generateBlogPost' 
      });
      throw error;
    }
  }
  
  /**
   * Generate tweets from a blog post
   * 
   * @param blogPost The blog post to generate tweets from
   * @returns A promise that resolves to an array of tweet data
   */
  async generateTweetsFromBlog(blogPost: BlogPost): Promise<TweetData[]> {
    try {
      // For now, we'll generate a simple tweet until TweetGenerator is implemented
      const tweet: TweetData = {
        text: `Check out my latest blog post: "${blogPost.title}" ${blogPost.post_url || ''}`,
        post_url: blogPost.post_url || ''
      };
      
      // Save tweet to database
      await this.saveTweetDraft(blogPost.id!, tweet);
      
      return [tweet];
    } catch (error) {
      // Handle errors
      const errorHandler = this.container.resolve<ErrorHandler>('errorHandler');
      await errorHandler.handleError(error as Error, ErrorType.CONTENT_GENERATION, { 
        operation: 'generateTweetsFromBlog',
        details: { blogPostId: blogPost.id }
      });
      throw error;
    }
  }
  
  /**
   * Save a tweet draft to the database
   * 
   * @param blogPostId The ID of the blog post
   * @param tweet The tweet data
   * @returns A promise that resolves when the tweet draft is saved
   */
  private async saveTweetDraft(blogPostId: string, tweet: TweetData): Promise<void> {
    try {
      const supabaseService = this.container.resolve<SupabaseService>('supabaseService');
      
      await supabaseService.insert('tweet_drafts', {
        blog_post_id: blogPostId,
        text: tweet.text,
        post_url: tweet.post_url,
        status: 'draft'
      });
    } catch (error) {
      // Handle errors
      const errorHandler = this.container.resolve<ErrorHandler>('errorHandler');
      await errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, { 
        operation: 'saveTweetDraft',
        details: { blogPostId, tweetText: tweet.text }
      });
    }
  }

  /**
   * Run the full blog post generation and tweet generation process
   * 
   * @param useMemoryAsSource Whether to use memory as the primary source for blog generation (default: true)
   * @returns A promise that resolves when the process is complete
   */
  async run(useMemoryAsSource: boolean = true): Promise<void> {
    try {
      console.log(`Generating blog post using ${useMemoryAsSource ? 'memory' : 'tweets'} as primary source...`);
      
      // Generate blog post
      const blogPost = await this.generateBlogPost(useMemoryAsSource);
      console.log(`Blog post generated: ${blogPost.title}`);
      
      // Generate tweets
      const tweets = await this.generateTweetsFromBlog(blogPost);
      console.log(`Generated ${tweets.length} tweets for blog post`);
      
      // Log activity
      const activityLogger = this.container.resolve<ActivityLogger>('activityLogger');
      await activityLogger.logBlogCreated(blogPost.id!, blogPost.title, tweets.length);
    } catch (error) {
      console.error('Failed to run blogger agent:', error);
    }
  }
}
