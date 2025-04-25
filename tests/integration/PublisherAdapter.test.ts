import { PublisherAdapter, ServiceContainer, SupabaseService, ConfigManager, ErrorHandler, BlogPost } from '../../agents/blogger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Integration tests for PublisherAdapter
 * 
 * These tests use real APIs and require the following environment variables:
 * - SUPABASE_URL and SUPABASE_KEY for Supabase
 * - WORDPRESS_URL, WORDPRESS_USERNAME, and WORDPRESS_PASSWORD for WordPress (optional)
 * 
 * To run these tests:
 * - Set the environment variables in .env
 * - Run: npm run test:integration
 */
describe('PublisherAdapter Integration', () => {
  // Skip all tests if integration tests are not enabled
  const integrationTestsEnabled = process.env.ENABLE_INTEGRATION_TESTS === 'true';
  
  if (!integrationTestsEnabled) {
    it.skip('Integration tests are disabled', () => {
      console.log('Skipping PublisherAdapter integration tests. Set ENABLE_INTEGRATION_TESTS=true to run them.');
    });
    return;
  }
  
  // Check if Supabase credentials are available
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    it.skip('Supabase credentials are missing', () => {
      console.log('Skipping PublisherAdapter integration tests. Set SUPABASE_URL and SUPABASE_KEY in .env');
    });
    return;
  }
  
  // Dependencies
  let container: ServiceContainer;
  let publisherAdapter: PublisherAdapter;
  let testPostId: string | undefined;
  
  // Check if WordPress credentials are available
  const wordpressEnabled = process.env.WORDPRESS_URL && 
                          process.env.WORDPRESS_USERNAME && 
                          process.env.WORDPRESS_PASSWORD;
  
  beforeAll(() => {
    // Create container and register dependencies
    container = new ServiceContainer();
    
    // Register configuration manager with real environment variables
    const configManager = new ConfigManager();
    container.register('configManager', configManager);
    
    // Register error handler
    const errorHandler = new ErrorHandler(null);
    container.register('errorHandler', errorHandler);
    
    // Register Supabase service with real credentials
    const supabaseService = new SupabaseService(configManager);
    container.register('supabaseService', supabaseService);
    
    // Update error handler with Supabase service
    (errorHandler as any).supabaseService = supabaseService;
    
    // Create publisher adapter
    publisherAdapter = new PublisherAdapter(container);
  });
  
  afterAll(async () => {
    // Clean up test data
    if (testPostId) {
      try {
        const supabaseService = container.resolve<SupabaseService>('supabaseService');
        await supabaseService.delete('blog_posts', { id: testPostId });
        console.log(`Cleaned up test post with ID: ${testPostId}`);
      } catch (error) {
        console.error('Error cleaning up test data:', error);
      }
    }
  });
  
  it('should save a blog post to the database', async () => {
    // Create a test blog post
    const testPost: BlogPost = {
      title: `Test Blog Post ${Date.now()}`,
      markdown: '# Test Blog Post\n\nThis is a test blog post created by the integration test.',
      category: 'technology',
      tags: ['test', 'integration', 'supabase'],
      tone: 'technical',
      character_id: 'test-character',
      status: 'draft',
      version: 1
    };
    
    // Save the blog post
    const savedPost = await publisherAdapter.saveAndPublish(testPost);
    
    // Store the post ID for cleanup
    testPostId = savedPost.id;
    
    // Assert
    expect(savedPost).toBeDefined();
    expect(savedPost.id).toBeDefined();
    expect(savedPost.title).toBe(testPost.title);
    expect(savedPost.markdown).toBe(testPost.markdown);
    expect(savedPost.category).toBe(testPost.category);
    expect(savedPost.status).toBe('draft');
    expect(savedPost.version).toBe(1);
    
    console.log(`Created test post with ID: ${savedPost.id}`);
  }, 10000); // Increase timeout for API calls
  
  it('should update an existing blog post', async () => {
    // Skip if no test post was created
    if (!testPostId) {
      console.log('Skipping update test because no test post was created');
      return;
    }
    
    // Get the saved post
    const supabaseService = container.resolve<SupabaseService>('supabaseService');
    const [savedPost] = await supabaseService.select('blog_posts', '*', { id: testPostId });
    
    // Update the post
    const updatedPost: BlogPost = {
      ...savedPost,
      title: `${savedPost.title} (Updated)`,
      markdown: `${savedPost.markdown}\n\nThis post has been updated.`,
      tags: [...savedPost.tags, 'updated']
    };
    
    // Save the updated post
    const result = await publisherAdapter.saveAndPublish(updatedPost);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(testPostId);
    expect(result.title).toBe(updatedPost.title);
    expect(result.markdown).toBe(updatedPost.markdown);
    expect(result.tags).toContain('updated');
    expect(result.version).toBe(2); // Version should be incremented
    
    console.log(`Updated test post with ID: ${result.id}`);
  }, 10000); // Increase timeout for API calls
  
  // Only run WordPress tests if credentials are available
  if (wordpressEnabled) {
    it('should publish a blog post to WordPress', async () => {
      // Skip if no test post was created
      if (!testPostId) {
        console.log('Skipping WordPress test because no test post was created');
        return;
      }
      
      // Get the saved post
      const supabaseService = container.resolve<SupabaseService>('supabaseService');
      const [savedPost] = await supabaseService.select('blog_posts', '*', { id: testPostId });
      
      // Update the post to published status
      const publishedPost: BlogPost = {
        ...savedPost,
        status: 'published',
        title: `${savedPost.title} (WordPress Test)`,
        markdown: `${savedPost.markdown}\n\nThis post has been published to WordPress.`
      };
      
      // Publish the post
      const result = await publisherAdapter.saveAndPublish(publishedPost);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testPostId);
      expect(result.status).toBe('published');
      expect(result.post_url).toBeDefined();
      expect(result.post_url).toContain(process.env.WORDPRESS_URL as string);
      
      console.log(`Published test post to WordPress: ${result.post_url}`);
    }, 20000); // Increase timeout for WordPress API calls
  } else {
    it.skip('WordPress integration is disabled', () => {
      console.log('Skipping WordPress integration test. Set WORDPRESS_URL, WORDPRESS_USERNAME, and WORDPRESS_PASSWORD in .env');
    });
  }
});
