import { ContextBuilder, ServiceContainer, SupabaseService, QdrantService, ConfigManager, ErrorHandler } from '../../agents/blogger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Integration tests for ContextBuilder
 * 
 * These tests use real APIs and require the following environment variables:
 * - SUPABASE_URL and SUPABASE_KEY for Supabase
 * - QDRANT_HOST and QDRANT_PORT for Qdrant
 * - OPENAI_API_KEY for OpenAI (used by QdrantService)
 * 
 * To run these tests:
 * - Set the environment variables in .env
 * - Run: npm run test:integration
 */
describe('ContextBuilder Integration', () => {
  // Skip all tests if integration tests are not enabled
  const integrationTestsEnabled = process.env.ENABLE_INTEGRATION_TESTS === 'true';
  
  if (!integrationTestsEnabled) {
    it.skip('Integration tests are disabled', () => {
      console.log('Skipping ContextBuilder integration tests. Set ENABLE_INTEGRATION_TESTS=true to run them.');
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
      console.log('Skipping ContextBuilder integration tests. Set SUPABASE_URL, SUPABASE_KEY, QDRANT_HOST, QDRANT_PORT, and OPENAI_API_KEY in .env');
    });
    return;
  }
  
  // Dependencies
  let container: ServiceContainer;
  let contextBuilder: ContextBuilder;
  
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
    
    // Register Qdrant service with real credentials
    const qdrantService = new QdrantService(configManager, errorHandler);
    container.register('qdrantService', qdrantService);
    
    // Create context builder
    contextBuilder = new ContextBuilder(container);
  });
  
  it('should build context with real data from Supabase and Qdrant', async () => {
    // Build context
    const context = await contextBuilder.buildContext();
    
    // Log context details for debugging
    console.log('Context built with:');
    console.log(`- ${context.tweets.length} tweets`);
    console.log(`- Image: ${context.image ? 'Yes' : 'No'}`);
    console.log(`- ${context.memoryInsights.length} memory insights`);
    console.log(`- Tone: ${context.tone}`);
    console.log(`- Category: ${context.category}`);
    
    // Assert basic structure
    expect(context).toBeDefined();
    expect(context.tone).toBeDefined();
    expect(context.category).toBeDefined();
    
    // If we have tweets, check their structure
    if (context.tweets.length > 0) {
      const firstTweet = context.tweets[0];
      expect(firstTweet.id).toBeDefined();
      expect(firstTweet.text).toBeDefined();
      expect(firstTweet.url).toBeDefined();
      expect(firstTweet.created_at).toBeDefined();
      
      console.log('First tweet:', firstTweet.text);
    }
    
    // If we have an image, check its structure
    if (context.image) {
      expect(context.image.url).toBeDefined();
      expect(context.image.prompt).toBeDefined();
      
      console.log('Image prompt:', context.image.prompt);
    }
    
    // If we have memory insights, check their structure
    if (context.memoryInsights.length > 0) {
      const firstInsight = context.memoryInsights[0];
      expect(firstInsight.content).toBeDefined();
      expect(firstInsight.tags).toBeDefined();
      expect(firstInsight.timestamp).toBeDefined();
      
      console.log('First memory insight:', firstInsight.content);
    }
  }, 30000); // Increase timeout for API calls
  
  it('should handle empty or missing data gracefully', async () => {
    // Mock the Supabase service to return empty results
    const supabaseService = container.resolve<SupabaseService>('supabaseService');
    const originalSelect = supabaseService.select;
    
    // Override select method to return empty arrays
    (supabaseService as any).select = jest.fn().mockResolvedValue([]);
    
    try {
      // Build context with empty data
      const context = await contextBuilder.buildContext();
      
      // Assert that we get a valid context with defaults
      expect(context).toBeDefined();
      expect(context.tweets).toEqual([]);
      expect(context.image).toBeUndefined();
      expect(context.tone).toBe('philosophical'); // Default tone
      expect(context.category).toBe('philosophy'); // Default category
      
      console.log('Context built with empty data:');
      console.log(`- Tone: ${context.tone}`);
      console.log(`- Category: ${context.category}`);
    } finally {
      // Restore original select method
      (supabaseService as any).select = originalSelect;
    }
  }, 10000); // Increase timeout for API calls
});
