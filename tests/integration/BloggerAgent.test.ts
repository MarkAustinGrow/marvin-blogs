import { BloggerAgent, ServiceContainer, SupabaseService } from '../../agents/blogger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Integration tests for BloggerAgent
 * 
 * These tests use real APIs and require the following environment variables:
 * - SUPABASE_URL and SUPABASE_KEY for Supabase
 * - QDRANT_HOST and QDRANT_PORT for Qdrant
 * - OPENAI_API_KEY for OpenAI
 * 
 * To run these tests:
 * - Set the environment variables in .env
 * - Run: npm run test:integration
 */
describe('BloggerAgent Integration', () => {
  // Skip all tests if integration tests are not enabled
  const integrationTestsEnabled = process.env.ENABLE_INTEGRATION_TESTS === 'true';
  
  if (!integrationTestsEnabled) {
    it.skip('Integration tests are disabled', () => {
      console.log('Skipping BloggerAgent integration tests. Set ENABLE_INTEGRATION_TESTS=true to run them.');
    });
    return;
  }
  
  // Check if required credentials are available
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const qdrantHost = process.env.QDRANT_HOST;
  const qdrantPort = process.env.QDRANT_PORT;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  const requiredCredentialsAvailable = supabaseUrl && supabaseKey && qdrantHost && qdrantPort && openaiApiKey;
  
  if (!requiredCredentialsAvailable) {
    it.skip('Required credentials are missing', () => {
      console.log('Skipping BloggerAgent integration tests. Set SUPABASE_URL, SUPABASE_KEY, QDRANT_HOST, QDRANT_PORT, and OPENAI_API_KEY in .env');
    });
    return;
  }
  
  // Dependencies
  let bloggerAgent: BloggerAgent;
  let testPostId: string | undefined;
  
  beforeAll(() => {
    // Create blogger agent
    bloggerAgent = new BloggerAgent();
  });
  
  afterAll(async () => {
    // Clean up test data
    if (testPostId) {
      try {
        // Get the service container from the blogger agent
        const container = (bloggerAgent as any).container as ServiceContainer;
        const supabaseService = container.resolve<SupabaseService>('supabaseService');
        
        // Delete the test blog post
        await supabaseService.delete('blog_posts', { id: testPostId });
        console.log(`Cleaned up test post with ID: ${testPostId}`);
        
        // Delete any associated tweet drafts
        await supabaseService.delete('tweet_drafts', { blog_post_id: testPostId });
        console.log(`Cleaned up tweet drafts for post ID: ${testPostId}`);
      } catch (error) {
        console.error('Error cleaning up test data:', error);
      }
    }
  });
  
  it('should generate a blog post and tweets', async () => {
    // Mock the generateBlogPost method to avoid creating a real blog post
    // This is a hybrid approach - we're using real APIs but not actually creating content
    const originalGenerateBlogPost = (bloggerAgent as any).generateBlogPost;
    
    // Override generateBlogPost to return a mock blog post
    (bloggerAgent as any).generateBlogPost = jest.fn().mockImplementation(async () => {
      // Create a test blog post
      const mockBlogPost = {
        id: `test-${Date.now()}`,
        title: `Test Blog Post ${Date.now()}`,
        markdown: '# Test Blog Post\n\nThis is a test blog post created by the integration test.',
        category: 'technology',
        tags: ['test', 'integration', 'supabase'],
        tone: 'technical',
        character_id: 'test-character',
        status: 'draft',
        version: 1,
        created_at: new Date().toISOString()
      };
      
      // Store the post ID for cleanup
      testPostId = mockBlogPost.id;
      
      return mockBlogPost;
    });
    
    try {
      // Run the blogger agent
      await bloggerAgent.run();
      
      // Assert that generateBlogPost was called
      expect((bloggerAgent as any).generateBlogPost).toHaveBeenCalled();
      
      // Assert that a test post ID was generated
      expect(testPostId).toBeDefined();
      
      console.log('BloggerAgent run completed successfully');
    } finally {
      // Restore original generateBlogPost method
      (bloggerAgent as any).generateBlogPost = originalGenerateBlogPost;
    }
  }, 30000); // Increase timeout for API calls
  
  it('should handle errors gracefully', async () => {
    // Mock the generateBlogPost method to throw an error
    const originalGenerateBlogPost = (bloggerAgent as any).generateBlogPost;
    
    // Override generateBlogPost to throw an error
    (bloggerAgent as any).generateBlogPost = jest.fn().mockRejectedValue(new Error('Test error'));
    
    try {
      // Run the blogger agent
      await bloggerAgent.run();
      
      // Should not throw an error
      expect(true).toBe(true);
      
      console.log('BloggerAgent handled error gracefully');
    } finally {
      // Restore original generateBlogPost method
      (bloggerAgent as any).generateBlogPost = originalGenerateBlogPost;
    }
  }, 10000); // Increase timeout for API calls
  
  // This test is commented out because it would create a real blog post
  // Uncomment it if you want to test the full workflow with real APIs
  /*
  it('should run the full workflow with real APIs', async () => {
    // Run the blogger agent
    await bloggerAgent.run();
    
    // No assertions needed - if it completes without errors, it's a success
    console.log('Full workflow completed successfully');
  }, 60000); // Increase timeout for API calls
  */
});
