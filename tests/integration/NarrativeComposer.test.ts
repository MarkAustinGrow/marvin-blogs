import { NarrativeComposer, ServiceContainer, ConfigManager, ErrorHandler, BlogContext } from '../../agents/blogger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Integration tests for NarrativeComposer
 * 
 * These tests use real APIs and require the following environment variables:
 * - OPENAI_API_KEY for OpenAI
 * 
 * To run these tests:
 * - Set the environment variables in .env
 * - Run: npm run test:integration
 */
describe('NarrativeComposer Integration', () => {
  // Skip all tests if integration tests are not enabled
  const integrationTestsEnabled = process.env.ENABLE_INTEGRATION_TESTS === 'true';
  
  if (!integrationTestsEnabled) {
    it.skip('Integration tests are disabled', () => {
      console.log('Skipping NarrativeComposer integration tests. Set ENABLE_INTEGRATION_TESTS=true to run them.');
    });
    return;
  }
  
  // Check if OpenAI API key is available
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    it.skip('OpenAI API key is missing', () => {
      console.log('Skipping NarrativeComposer integration tests. Set OPENAI_API_KEY in .env');
    });
    return;
  }
  
  // Dependencies
  let container: ServiceContainer;
  let narrativeComposer: NarrativeComposer;
  
  beforeAll(() => {
    // Create container and register dependencies
    container = new ServiceContainer();
    
    // Register configuration manager with real environment variables
    const configManager = new ConfigManager();
    container.register('configManager', configManager);
    
    // Register error handler
    const errorHandler = new ErrorHandler(null);
    container.register('errorHandler', errorHandler);
    
    // Create narrative composer
    narrativeComposer = new NarrativeComposer(container);
  });
  
  it('should generate a blog post with real OpenAI API', async () => {
    // Create a sample context
    const context: BlogContext = {
      tweets: [
        {
          id: 'tweet1',
          text: 'Thinking about the intersection of AI and creativity today. Where does the algorithm end and true innovation begin?',
          url: 'https://twitter.com/marvin/status/1',
          created_at: '2025-04-25T10:00:00Z',
          vibe_tags: ['philosophy', 'ai', 'creativity']
        }
      ],
      image: {
        url: 'https://example.com/image.jpg',
        prompt: 'A digital artwork depicting the blurred boundary between human creativity and artificial intelligence'
      },
      memoryInsights: [
        {
          content: 'I once pondered whether creativity is an emergent property of complex systems or something uniquely human.',
          tags: ['creativity', 'philosophy', 'consciousness'],
          timestamp: '2025-04-20T10:00:00Z'
        }
      ],
      tone: 'philosophical',
      category: 'technology'
    };
    
    // Generate blog post
    const result = await narrativeComposer.compose(context);
    
    // Log result for debugging
    console.log('Generated blog post:');
    console.log(`Title: ${result.title}`);
    console.log(`Markdown length: ${result.markdown.length} characters`);
    console.log(`First 200 characters: ${result.markdown.substring(0, 200)}...`);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.markdown).toBeDefined();
    expect(result.markdown.length).toBeGreaterThan(200); // Should be a substantial post
    
    // Check that the content includes some keywords from the context
    const contentLowerCase = result.markdown.toLowerCase();
    const titleLowerCase = result.title.toLowerCase();
    
    // Check for keywords in title or content
    const keywordsToCheck = ['ai', 'creativity', 'human', 'algorithm', 'innovation'];
    const foundKeywords = keywordsToCheck.filter(keyword => 
      titleLowerCase.includes(keyword) || contentLowerCase.includes(keyword)
    );
    
    console.log(`Found ${foundKeywords.length} keywords in the generated content:`, foundKeywords);
    expect(foundKeywords.length).toBeGreaterThan(0);
  }, 30000); // Increase timeout for OpenAI API calls
  
  it('should handle errors gracefully', async () => {
    // Create a minimal context
    const minimalContext: BlogContext = {
      tweets: [],
      memoryInsights: [],
      tone: 'technical',
      category: 'technology'
    };
    
    // Temporarily break the OpenAI API key
    const configManager = container.resolve<ConfigManager>('configManager');
    const originalGet = configManager.get;
    
    // Override get method to return an invalid API key
    (configManager as any).get = jest.fn().mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'invalid-api-key';
      return originalGet.call(configManager, key);
    });
    
    try {
      // Generate blog post with invalid API key
      const result = await narrativeComposer.compose(minimalContext);
      
      // Should still get a fallback result
      expect(result).toBeDefined();
      expect(result.title).toBe('Thoughts on technology');
      expect(result.markdown).toContain('A Brief Reflection');
      
      console.log('Fallback content generated successfully');
    } finally {
      // Restore original get method
      (configManager as any).get = originalGet;
    }
  }, 10000); // Increase timeout for API calls
});
