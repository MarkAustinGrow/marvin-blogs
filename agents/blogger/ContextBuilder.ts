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
      
      // Get character information and tone
      const { tone, character } = await this.getCharacterInfo();
      
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
        category,
        character
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
   * Build a context object for blog post generation using memories as the primary source
   * 
   * @param memoryCount The number of random memories to retrieve
   * @returns A promise that resolves to a BlogContext object
   */
  async buildContextFromMemory(memoryCount: number = 5): Promise<BlogContext> {
    console.log(`[ContextBuilder] Building context from memory with ${memoryCount} memories...`);
    try {
      // Get random memories
      console.log(`[ContextBuilder] Getting random memories from QdrantService...`);
      const memoryInsights = await this.qdrantService.getRandomMemories(memoryCount);
      console.log(`[ContextBuilder] Received ${memoryInsights.length} memory insights`);
      
      if (memoryInsights.length === 0) {
        console.log(`[ContextBuilder] No memories found, falling back to tweet-based context`);
        return this.buildContext();
      }
      
      // Get a random image
      const image = await this.getLatestImage();
      
      // Get character information and tone
      const { tone, character } = await this.getCharacterInfo();
      
      // Extract tags from memories to use for tweets
      const memoryTags = memoryInsights.flatMap(memory => memory.tags || []);
      console.log(`[ContextBuilder] Memory tags: ${memoryTags.join(', ')}`);
      
      // Get tweets based on memory tags (if available)
      const tweets = memoryTags.length > 0
        ? await this.getTweetsByTags(memoryTags)
        : await this.getLatestTweets(3); // Fallback to latest tweets
      
      console.log(`[ContextBuilder] Found ${tweets.length} tweets related to memory tags`);
      
      // Determine category based on memory insights
      const category = this.determineCategoryFromMemories(memoryInsights);
      console.log(`[ContextBuilder] Determined category: ${category}`);
      
      // Build and return context
      const context = {
        tweets,
        image,
        memoryInsights,
        tone,
        category,
        character
      };
      
      console.log(`[ContextBuilder] Successfully built context from memory with ${memoryInsights.length} memories and ${tweets.length} tweets`);
      return context;
    } catch (error) {
      console.error(`[ContextBuilder] Error building context from memory: ${(error as Error).message}`);
      await this.errorHandler.handleError(error as Error, ErrorType.UNKNOWN, {
        operation: 'buildContextFromMemory'
      });
      
      // Return a minimal context as fallback
      console.log(`[ContextBuilder] Returning fallback context`);
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
      // Use a simple query to get the latest tweets
      const tweets = await this.supabaseService.select(
        'tweets_cache',
        'id, tweet_id, tweet_text, tweet_url, created_at, vibe_tags',
        { limit }
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
   * Get a random image from the images table
   * 
   * @returns A promise that resolves to an image object or undefined if no image is found
   */
  private async getLatestImage(): Promise<BlogContext['image'] | undefined> {
    try {
      // Get all image IDs
      const imageIds = await this.supabaseService.select(
        'images',
        'id'
      );
      
      if (imageIds.length === 0) {
        return undefined;
      }
      
      // Select a random image ID
      const randomIndex = Math.floor(Math.random() * imageIds.length);
      const randomId = imageIds[randomIndex].id;
      
      // Get the specific image by ID
      const images = await this.supabaseService.select(
        'images',
        'image_url, prompt_id, created_at',
        { match: { id: randomId } }
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
   * Get the character information and tone from the character_files table
   * 
   * @returns A promise that resolves to an object containing the tone and character information
   */
  private async getCharacterInfo(): Promise<{ tone: string; character: any }> {
    try {
      const characters = await this.supabaseService.select(
        'character_files',
        'content, id',
        { match: { agent_name: 'marvin', is_active: true } }
      );
      
      if (characters.length === 0) {
        return { tone: 'philosophical', character: null };
      }
      
      const character = characters[0];
      let tone = 'philosophical'; // Default tone
      
      // Extract tone from character content
      if (character.content) {
        if (character.content.tone) {
          tone = character.content.tone;
        } else if (character.content.personality) {
          tone = character.content.personality;
        }
      }
      
      return { tone, character: character.content };
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'getCharacterInfo'
      });
      
      // Return default values as fallback
      return { tone: 'philosophical', character: null };
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
      category: 'philosophy',
      character: null
    };
  }

  /**
   * Get tweets by tags from the tweets_cache table
   * 
   * @param tags The tags to search for
   * @param limit The maximum number of tweets to retrieve
   * @returns A promise that resolves to an array of Tweet objects
   */
  private async getTweetsByTags(tags: string[], limit: number = 5): Promise<Tweet[]> {
    try {
      if (tags.length === 0) {
        return this.getLatestTweets(limit);
      }
      
      // This is a simplified approach. In a real implementation,
      // you would need a more sophisticated search mechanism.
      // For now, we'll just get the latest tweets and filter them by tags.
      const allTweets = await this.supabaseService.select(
        'tweets_cache',
        'id, tweet_id, tweet_text, tweet_url, created_at, vibe_tags',
        { limit: limit * 5 } // Get more tweets than needed to account for filtering
      );
      
      // Filter tweets by tags
      const filteredTweets = allTweets.filter(tweet => {
        const tweetTags = tweet.vibe_tags || [];
        return tags.some(tag => 
          tweetTags.some((tweetTag: string) => 
            tweetTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
      });
      
      // Take the requested number of tweets
      const selectedTweets = filteredTweets.slice(0, limit);
      
      // If we don't have enough tweets after filtering, get some latest tweets
      if (selectedTweets.length < limit) {
        const additionalTweets = await this.getLatestTweets(limit - selectedTweets.length);
        selectedTweets.push(...additionalTweets);
      }
      
      return selectedTweets.map(tweet => ({
        id: tweet.tweet_id,
        text: tweet.tweet_text,
        url: tweet.tweet_url,
        created_at: tweet.created_at,
        vibe_tags: tweet.vibe_tags || []
      }));
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'getTweetsByTags'
      });
      
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Determine the category for the blog post based on memory insights
   * 
   * @param memoryInsights The memory insights to determine the category from
   * @returns The determined category
   */
  private determineCategoryFromMemories(memoryInsights: MemoryInsight[]): string {
    // Extract tags from memory insights
    const memoryTags = memoryInsights.flatMap(insight => insight.tags || []);
    
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
    
    for (const tag of memoryTags) {
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
}
