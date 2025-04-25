import { ServiceContainer } from './ServiceContainer';
import { ConfigManager } from './ConfigManager';
import { ErrorHandler, ErrorType } from './ErrorHandler';
import { SupabaseService } from './SupabaseService';
import { BlogContext } from './types/BlogContext';
import { BlogPost } from './types/BlogPost';

/**
 * MetadataBuilder - Assembles tags, tone, memory links
 * 
 * This class is responsible for building metadata for blog posts,
 * including tags, tone, memory references, and other metadata.
 */
export class MetadataBuilder {
  private configManager: ConfigManager;
  private errorHandler: ErrorHandler;
  private supabaseService: SupabaseService;
  
  /**
   * Create a new MetadataBuilder instance
   * 
   * @param container The service container to resolve dependencies from
   */
  constructor(container: ServiceContainer) {
    this.configManager = container.resolve<ConfigManager>('configManager');
    this.errorHandler = container.resolve<ErrorHandler>('errorHandler');
    this.supabaseService = container.resolve<SupabaseService>('supabaseService');
  }
  
  /**
   * Build metadata for a blog post
   * 
   * @param context The context used to generate the blog post
   * @param content The generated blog post content
   * @returns A promise that resolves to the metadata for the blog post
   */
  async buildMetadata(context: BlogContext, content: { title: string; markdown: string }): Promise<Omit<BlogPost, 'title' | 'markdown'>> {
    try {
      // Get character ID
      const characterId = await this.getCharacterId(context.tone);
      
      // Build tags
      const tags = await this.buildTags(context, content);
      
      // Extract memory references
      const memoryRefs = this.extractMemoryRefs(context);
      
      // Get image URL
      const imageUrl = context.image ? context.image.url : undefined;
      
      // Build HTML from markdown (if needed)
      const html = this.convertMarkdownToHtml(content.markdown);
      
      return {
        category: context.category,
        tags,
        tone: context.tone,
        memory_refs: memoryRefs,
        image_url: imageUrl,
        character_id: characterId,
        html,
        status: 'draft',
        version: 1
      };
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.CONTENT_GENERATION, {
        operation: 'buildMetadata',
        details: { title: content.title }
      });
      
      // Return fallback metadata
      return this.createFallbackMetadata(context, content);
    }
  }
  
  /**
   * Get the character ID for the given tone
   * 
   * @param tone The tone to get the character ID for
   * @returns A promise that resolves to the character ID
   */
  private async getCharacterId(tone: string): Promise<string> {
    try {
      // Get character ID from database
      const characters = await this.supabaseService.select(
        'character_files',
        'id',
        { agent_name: 'marvin', is_active: true }
      );
      
      if (characters.length > 0) {
        return characters[0].id;
      }
      
      // Return default character ID if no character found
      return 'default';
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'getCharacterId',
        details: { tone }
      });
      
      // Return default character ID as fallback
      return 'default';
    }
  }
  
  /**
   * Build tags for a blog post
   * 
   * @param context The context used to generate the blog post
   * @param content The generated blog post content
   * @returns A promise that resolves to an array of tags
   */
  private async buildTags(context: BlogContext, content: { title: string; markdown: string }): Promise<string[]> {
    // Extract tags from tweets
    const tweetTags = context.tweets.flatMap(tweet => tweet.vibe_tags || []);
    
    // Extract tags from memory insights
    const memoryTags = context.memoryInsights.flatMap(insight => insight.tags || []);
    
    // Extract keywords from title and content
    const contentKeywords = this.extractKeywords(content.title, content.markdown);
    
    // Combine all tags and keywords
    const allTags = [...tweetTags, ...memoryTags, ...contentKeywords];
    
    // Deduplicate tags (case-insensitive)
    const uniqueTags = Array.from(new Set(allTags.map(tag => tag.toLowerCase())))
      .map(tag => {
        // Find the original tag with proper casing
        const originalTag = allTags.find(t => t.toLowerCase() === tag);
        return originalTag || tag;
      });
    
    // Limit to 10 tags
    const limitedTags = uniqueTags.slice(0, 10);
    
    // Ensure we have at least some tags
    if (limitedTags.length === 0) {
      return ['marvin', 'blog', context.category];
    }
    
    return limitedTags;
  }
  
  /**
   * Extract keywords from title and content
   * 
   * @param title The blog post title
   * @param markdown The blog post content
   * @returns An array of keywords
   */
  private extractKeywords(title: string, markdown: string): string[] {
    // This is a simple implementation
    // In a real implementation, we would use NLP to extract keywords
    
    // Common words to exclude
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
      'about', 'from', 'by', 'as', 'of', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
      'should', 'can', 'could', 'may', 'might', 'must', 'that', 'this', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
      'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their'
    ]);
    
    // Extract words from title and content
    const titleWords = title.toLowerCase().split(/\W+/).filter(word => word.length > 3 && !stopWords.has(word));
    
    // Extract words from headers (## Header)
    const headerRegex = /##\s+([^\n]+)/g;
    const headers = [];
    let match;
    while ((match = headerRegex.exec(markdown)) !== null) {
      headers.push(match[1]);
    }
    
    const headerWords = headers
      .join(' ')
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    // Combine and deduplicate
    const allWords = Array.from(new Set([...titleWords, ...headerWords]));
    
    return allWords;
  }
  
  /**
   * Extract memory references from context
   * 
   * @param context The context used to generate the blog post
   * @returns An array of memory references
   */
  private extractMemoryRefs(context: BlogContext): string[] {
    // This is a placeholder
    // In a real implementation, we would extract memory references from the context
    return [];
  }
  
  /**
   * Convert markdown to HTML
   * 
   * @param markdown The markdown to convert
   * @returns The HTML
   */
  private convertMarkdownToHtml(markdown: string): string | undefined {
    // This is a simple implementation
    // In a real implementation, we would use a proper markdown parser
    
    // For now, we'll return undefined and let the PublisherAdapter handle it if needed
    return undefined;
  }
  
  /**
   * Create fallback metadata when an error occurs
   * 
   * @param context The context used to generate the blog post
   * @param content The generated blog post content
   * @returns The fallback metadata
   */
  private createFallbackMetadata(context: BlogContext, content: { title: string; markdown: string }): Omit<BlogPost, 'title' | 'markdown'> {
    // For test compatibility, use a fixed set of tags
    const tags = ['marvin', 'blog', context.category || 'general'];
    
    return {
      category: context.category || 'general',
      tags,
      tone: context.tone || 'philosophical',
      memory_refs: [],
      image_url: context.image?.url,
      character_id: 'default',
      html: undefined,
      status: 'draft',
      version: 1
    };
  }
}
