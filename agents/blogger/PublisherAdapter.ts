import { ServiceContainer } from './ServiceContainer';
import { SupabaseService } from './SupabaseService';
import { ConfigManager } from './ConfigManager';
import { ErrorHandler, ErrorType } from './ErrorHandler';
import { BlogPost } from './types/BlogPost';
import axios from 'axios';

/**
 * PublisherAdapter - Saves blog post & publishes it
 * 
 * This class is responsible for saving blog posts to the database and
 * optionally publishing them to WordPress.
 */
export class PublisherAdapter {
  private supabaseService: SupabaseService;
  private configManager: ConfigManager;
  private errorHandler: ErrorHandler;
  private wordpressEnabled: boolean;
  
  /**
   * Create a new PublisherAdapter instance
   * 
   * @param container The service container to resolve dependencies from
   */
  constructor(container: ServiceContainer) {
    this.supabaseService = container.resolve<SupabaseService>('supabaseService');
    this.configManager = container.resolve<ConfigManager>('configManager');
    this.errorHandler = container.resolve<ErrorHandler>('errorHandler');
    
    // Check if WordPress integration is enabled
    this.wordpressEnabled = this.configManager.has('WORDPRESS_URL') && 
                           this.configManager.has('WORDPRESS_USERNAME') && 
                           this.configManager.has('WORDPRESS_PASSWORD');
  }
  
  /**
   * Save a blog post to the database and optionally publish it to WordPress
   * 
   * @param blogPost The blog post to save and publish
   * @returns A promise that resolves to the saved blog post
   */
  async saveAndPublish(blogPost: BlogPost): Promise<BlogPost> {
    try {
      // Save to database
      const savedPost = await this.saveToDatabase(blogPost);
      
      // Publish to WordPress if enabled
      if (this.wordpressEnabled && blogPost.status === 'published') {
        const postUrl = await this.publishToWordPress(savedPost);
        
        // Update post with WordPress URL
        if (postUrl) {
          savedPost.post_url = postUrl;
          await this.updatePostUrl(savedPost.id!, postUrl);
        }
      }
      
      return savedPost;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'saveAndPublish',
        details: { title: blogPost.title }
      });
      throw error;
    }
  }
  
  /**
   * Save a blog post to the database
   * 
   * @param blogPost The blog post to save
   * @returns A promise that resolves to the saved blog post
   */
  private async saveToDatabase(blogPost: BlogPost): Promise<BlogPost> {
    try {
      // If post has an ID, update it
      if (blogPost.id) {
        // Increment version
        blogPost.version = (blogPost.version || 1) + 1;
        
        const updated = await this.supabaseService.update(
          'blog_posts',
          blogPost,
          { id: blogPost.id }
        );
        
        return updated || blogPost;
      }
      
      // Otherwise, insert a new post
      const inserted = await this.supabaseService.insert('blog_posts', blogPost);
      return inserted || blogPost;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'saveToDatabase',
        details: { title: blogPost.title }
      });
      throw error;
    }
  }
  
  /**
   * Publish a blog post to WordPress
   * 
   * @param blogPost The blog post to publish
   * @returns A promise that resolves to the WordPress post URL
   */
  private async publishToWordPress(blogPost: BlogPost): Promise<string | null> {
    try {
      const wordpressUrl = this.configManager.get('WORDPRESS_URL');
      const username = this.configManager.get('WORDPRESS_USERNAME');
      const password = this.configManager.get('WORDPRESS_PASSWORD');
      
      // Create authentication token
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      
      // Prepare post data
      const postData = {
        title: blogPost.title,
        content: blogPost.html || this.convertMarkdownToHtml(blogPost.markdown),
        status: 'publish',
        categories: [this.mapCategoryToWordPress(blogPost.category)],
        tags: blogPost.tags,
        featured_media: blogPost.image_url ? await this.uploadFeaturedImage(blogPost.image_url) : 0
      };
      
      // Send request to WordPress
      const response = await axios.post(
        `${wordpressUrl}/wp-json/wp/v2/posts`,
        postData,
        {
          headers: {
            'Authorization': `Basic ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Return post URL
      return response.data.link || null;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.API_FAILURE, {
        operation: 'publishToWordPress',
        details: { title: blogPost.title }
      });
      
      // For test compatibility, throw the error so it can be caught in the test
      throw error;
    }
  }
  
  /**
   * Update a blog post's URL in the database
   * 
   * @param id The ID of the blog post to update
   * @param url The URL to set
   */
  private async updatePostUrl(id: string, url: string): Promise<void> {
    try {
      await this.supabaseService.update(
        'blog_posts',
        { post_url: url },
        { id }
      );
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.DATABASE_ERROR, {
        operation: 'updatePostUrl',
        details: { id, url }
      });
    }
  }
  
  /**
   * Upload a featured image to WordPress
   * 
   * @param imageUrl The URL of the image to upload
   * @returns A promise that resolves to the WordPress media ID
   */
  private async uploadFeaturedImage(imageUrl: string): Promise<number> {
    try {
      const wordpressUrl = this.configManager.get('WORDPRESS_URL');
      const username = this.configManager.get('WORDPRESS_USERNAME');
      const password = this.configManager.get('WORDPRESS_PASSWORD');
      
      // Create authentication token
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      
      // Get image data
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');
      
      // Get filename from URL
      const filename = imageUrl.split('/').pop() || 'featured-image.jpg';
      
      // Upload to WordPress
      const response = await axios.post(
        `${wordpressUrl}/wp-json/wp/v2/media`,
        imageBuffer,
        {
          headers: {
            'Authorization': `Basic ${token}`,
            'Content-Type': 'image/jpeg',
            'Content-Disposition': `attachment; filename=${filename}`
          }
        }
      );
      
      return response.data.id;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.API_FAILURE, {
        operation: 'uploadFeaturedImage',
        details: { imageUrl }
      });
      return 0;
    }
  }
  
  /**
   * Convert markdown to HTML
   * 
   * @param markdown The markdown to convert
   * @returns The HTML
   */
  private convertMarkdownToHtml(markdown: string): string {
    // This is a simple implementation
    // In a real implementation, we would use a proper markdown parser
    
    // Replace headers
    let html = markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
      .replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    
    // Replace bold and italic
    html = html
      .replace(/\*\*(.*)\*\*/gm, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gm, '<em>$1</em>');
    
    // Replace links
    html = html.replace(/\[(.*?)\]\((.*?)\)/gm, '<a href="$2">$1</a>');
    
    // Replace lists
    html = html
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>');
    
    // Wrap lists
    html = html.replace(/<li>(.*)<\/li>/gm, '<ul><li>$1</li></ul>');
    
    // Replace paragraphs
    html = html.replace(/^(?!<[a-z])(.*$)/gm, '<p>$1</p>');
    
    return html;
  }
  
  /**
   * Map a category to a WordPress category ID
   * 
   * @param category The category to map
   * @returns The WordPress category ID
   */
  private mapCategoryToWordPress(category: string): number {
    // This is a simple implementation
    // In a real implementation, we would fetch categories from WordPress
    
    const categoryMap: Record<string, number> = {
      'philosophy': 1,
      'technology': 2,
      'art': 3,
      'culture': 4,
      'personal': 5
    };
    
    return categoryMap[category] || 1; // Default to philosophy
  }
}
