import { ServiceContainer } from './ServiceContainer';
import { SupabaseService } from './SupabaseService';
import { ConfigManager } from './ConfigManager';
import { ErrorHandler, ErrorType } from './ErrorHandler';

/**
 * ActivityLogger - Logs agent activities to the database
 * 
 * This class provides methods for logging agent activities to the database
 * for monitoring and auditing purposes.
 */
export class ActivityLogger {
  private supabaseService: SupabaseService;
  private configManager: ConfigManager;
  private errorHandler: ErrorHandler;
  private agentName: string = 'blogger';
  
  /**
   * Create a new ActivityLogger instance
   * 
   * @param container The service container to resolve dependencies from
   */
  constructor(container: ServiceContainer) {
    this.supabaseService = container.resolve<SupabaseService>('supabaseService');
    this.configManager = container.resolve<ConfigManager>('configManager');
    this.errorHandler = container.resolve<ErrorHandler>('errorHandler');
  }
  
  /**
   * Log an activity to the database
   * 
   * @param action The action that was performed
   * @param details Additional details about the activity
   * @param category The category of the activity (default: 'blog')
   * @returns A promise that resolves when the activity has been logged
   */
  async logActivity(action: string, details: Record<string, any>, category: string = 'blog'): Promise<void> {
    try {
      await this.supabaseService.insert('activity_logs', {
        agent_name: this.agentName,
        action,
        category,
        details
      });
      
      console.log(`Activity logged: ${action}`);
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'logActivity',
        details: { action, category }
      });
      
      // Log to console as fallback
      console.error('Failed to log activity to database:', error);
      console.log(`Activity: ${action}, Category: ${category}, Details:`, details);
    }
  }
  
  /**
   * Log a blog post creation activity
   * 
   * @param blogPostId The ID of the blog post
   * @param title The title of the blog post
   * @param tweetCount The number of tweets generated for the blog post
   * @returns A promise that resolves when the activity has been logged
   */
  async logBlogCreated(blogPostId: string, title: string, tweetCount: number): Promise<void> {
    return this.logActivity('blog_created', {
      blogPostId,
      title,
      tweetCount
    });
  }
  
  /**
   * Log a blog post update activity
   * 
   * @param blogPostId The ID of the blog post
   * @param title The title of the blog post
   * @param version The new version of the blog post
   * @returns A promise that resolves when the activity has been logged
   */
  async logBlogUpdated(blogPostId: string, title: string, version: number): Promise<void> {
    return this.logActivity('blog_updated', {
      blogPostId,
      title,
      version
    });
  }
  
  /**
   * Log a blog post publication activity
   * 
   * @param blogPostId The ID of the blog post
   * @param title The title of the blog post
   * @param postUrl The URL of the published blog post
   * @returns A promise that resolves when the activity has been logged
   */
  async logBlogPublished(blogPostId: string, title: string, postUrl: string): Promise<void> {
    return this.logActivity('blog_published', {
      blogPostId,
      title,
      postUrl
    });
  }
  
  /**
   * Log a tweet generation activity
   * 
   * @param blogPostId The ID of the blog post
   * @param tweetCount The number of tweets generated
   * @returns A promise that resolves when the activity has been logged
   */
  async logTweetsGenerated(blogPostId: string, tweetCount: number): Promise<void> {
    return this.logActivity('tweets_generated', {
      blogPostId,
      tweetCount
    });
  }
  
  /**
   * Log an error activity
   * 
   * @param errorType The type of error
   * @param message The error message
   * @param operation The operation that failed
   * @returns A promise that resolves when the activity has been logged
   */
  async logError(errorType: ErrorType, message: string, operation: string): Promise<void> {
    return this.logActivity('error', {
      errorType,
      message,
      operation
    }, 'error');
  }
}
