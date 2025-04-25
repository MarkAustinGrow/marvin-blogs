import { ServiceContainer } from './ServiceContainer';
import { SupabaseService } from './SupabaseService';
import { QdrantService } from './QdrantService';
import { ConfigManager } from './ConfigManager';
import { ErrorHandler, ErrorType } from './ErrorHandler';
import { BlogContext, Tweet, MemoryInsight } from './types/BlogContext';

/**
 * ContextBuilder - Gathers content fragments for blog generation
 * 
 * This class is responsible for gathering content from various sources,
 * including tweets, images, character files, and memory insights, to build
 * a context object for blog post generation.
 */
export class ContextBuilder {
  private supabaseService: SupabaseService;
  private qdrantService: QdrantService;
  private configManager: ConfigManager;
  private errorHandler: ErrorHandler;
  
  /**
   * Create a new ContextBuilder instance
   * 
   * @param container The service container to resolve dependencies from
   */
  constructor(container: ServiceContainer) {
    this.supabaseService = container.resolve<SupabaseService>('supabaseService');
    this.qdrantService = container.resolve<QdrantService>('qdrantService');
    this.configManager = container.resolve<ConfigManager>('configManager');
    this.errorHandler = container.resolve<ErrorHandler>('errorHandler');
  }
  
  /**
   * Build a context object for blog post generation
   * 
   * @returns A promise that resolves to a BlogContext object
   */
  async buildContext(): Promise<BlogContext> {
    try {
      // Get latest tweets
      const tweets = await this.getLatestTweets();
      
      // Get latest image
      const image = await this.getLatestImage();
      
      // Get character tone
      const tone = await this.getCharacterTone();
      
      // Get memory insights based on tweets and image
      const memoryInsights = await this.getMemoryInsights(tweets, image);
      
      // Determine category based on tweets and memory insights
      const category = this.determineCategory(tweets, memoryInsights);
      
      // Build and return context
      return {
        tweets,
        image,
        memoryInsights,
        tone,
        category
      };
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.UNKNOWN, {
        operation: 'buildContext'
      });
      
      // Return a minimal context as fallback
      return this.createFallbackContext();
    }
  }
  
  /**
   * Get the latest tweets from the tweets_cache table
   * 
   * @param limit The maximum number of tweets to retrieve
   * @returns A promise that resolves to an array of Tweet objects
   */
  private async getLatestTweets(limit: number = 5): Promise<Tweet[]> {
    try {
      const tweets = await this.supabaseService.select(
        'tweets_cache',
        'id, tweet_id, tweet_text, tweet_url, created_at, vibe_tags',
        { order: 'created_at.desc', limit }
      );
      
      return tweets.map(tweet => ({
        id: tweet.tweet_id,
        text: tweet.tweet_text,
        url: tweet.tweet_url,
        created_at: tweet.created_at,
        vibe_tags: tweet.vibe_tags || []
      }));
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'getLatestTweets'
      });
      
      // Return empty array as fallback
      return [];
    }
  }
  
  /**
   * Get the latest image from the images table
   * 
   * @returns A promise that resolves to an image object or undefined if no image is found
   */
  private async getLatestImage(): Promise<BlogContext['image'] | undefined> {
    try {
      const images = await this.supabaseService.select(
        'images',
        'image_url, prompt_id, created_at',
        { order: 'created_at.desc', limit: 1 }
      );
      
      if (images.length === 0) {
        return undefined;
      }
      
      const image = images[0];
      
      // Get the prompt text if prompt_id is available
      let promptText = '';
      if (image.prompt_id) {
        const prompts = await this.supabaseService.select(
          'prompts',
          'text',
          { match: { id: image.prompt_id } }
        );
        
        if (prompts.length > 0) {
          promptText = prompts[0].text;
        }
      }
      
      return {
        url: image.image_url,
        prompt: promptText
      };
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'getLatestImage'
      });
      
      // Return undefined as fallback
      return undefined;
    }
  }
  
  /**
   * Get the character tone from the character_files table
   * 
   * @returns A promise that resolves to a tone string
   */
  private async getCharacterTone(): Promise<string> {
    try {
      const characters = await this.supabaseService.select(
        'character_files',
        'content',
        { match: { agent_name: 'marvin', is_active: true } }
      );
      
      if (characters.length === 0) {
        return 'philosophical';
      }
      
      const character = characters[0];
      
      // Extract tone from character content
      if (character.content && character.content.tone) {
        return character.content.tone;
      }
      
      if (character.content && character.content.personality) {
        return character.content.personality;
      }
      
      // Default tone if not found
      return 'philosophical';
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'getCharacterTone'
      });
      
      // Return default tone as fallback
      return 'philosophical';
    }
  }
  
  /**
   * Get memory insights based on tweets and image
   * 
   * @param tweets The tweets to get memory insights for
   * @param image The image to get memory insights for
   * @returns A promise that resolves to an array of MemoryInsight objects
   */
  private async getMemoryInsights(tweets: Tweet[], image?: BlogContext['image']): Promise<MemoryInsight[]> {
    try {
      // Build queries from tweets and image
      const queries: string[] = [];
      
      // Add tweet texts as queries
      tweets.forEach(tweet => {
        if (tweet.text) {
          queries.push(tweet.text);
        }
      });
      
      // Add image prompt as query if available
      if (image && image.prompt) {
        queries.push(image.prompt);
      }
      
      // Add vibe tags as queries
      const vibeTags = tweets.flatMap(tweet => tweet.vibe_tags || []);
      if (vibeTags.length > 0) {
        queries.push(vibeTags.join(', '));
      }
      
      // If no queries, return empty array
      if (queries.length === 0) {
        return [];
      }
      
      // Search for memories
      return await this.qdrantService.searchMultipleQueries(queries);
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.MEMORY_ERROR, {
        operation: 'getMemoryInsights'
      });
      
      // Return empty array as fallback
      return [];
    }
  }
  
  /**
   * Determine the category for the blog post based on tweets and memory insights
   * 
   * @param tweets The tweets to determine the category from
   * @param memoryInsights The memory insights to determine the category from
   * @returns The determined category
   */
  private determineCategory(tweets: Tweet[], memoryInsights: MemoryInsight[]): string {
    // Extract vibe tags from tweets
    const vibeTags = tweets.flatMap(tweet => tweet.vibe_tags || []);
    
    // Extract tags from memory insights
    const memoryTags = memoryInsights.flatMap(insight => insight.tags || []);
    
    // Combine all tags
    const allTags = [...vibeTags, ...memoryTags];
    
    // Define category mappings
    const categoryMappings: Record<string, string[]> = {
      'philosophy': ['philosophy', 'existential', 'meaning', 'consciousness', 'reality'],
      'technology': ['tech', 'technology', 'ai', 'artificial intelligence', 'programming'],
      'art': ['art', 'creative', 'visual', 'aesthetic', 'design'],
      'culture': ['culture', 'society', 'social', 'politics', 'news'],
      'personal': ['personal', 'reflection', 'life', 'experience', 'journey']
    };
    
    // Count occurrences of each category
    const categoryCounts: Record<string, number> = {};
    
    for (const tag of allTags) {
      const lowercaseTag = tag.toLowerCase();
      
      for (const [category, keywords] of Object.entries(categoryMappings)) {
        if (keywords.some(keyword => lowercaseTag.includes(keyword))) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      }
    }
    
    // Find category with highest count
    let maxCount = 0;
    let maxCategory = 'philosophy'; // Default category
    
    for (const [category, count] of Object.entries(categoryCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxCategory = category;
      }
    }
    
    return maxCategory;
  }
  
  /**
   * Create a fallback context when an error occurs
   * 
   * @returns A minimal BlogContext object
   */
  private createFallbackContext(): BlogContext {
    return {
      tweets: [],
      memoryInsights: [],
      tone: 'philosophical',
      category: 'philosophy'
    };
  }
}
