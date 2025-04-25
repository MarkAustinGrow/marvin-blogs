import { MetadataBuilder, ServiceContainer, SupabaseService, ConfigManager, ErrorHandler, BlogContext } from '../../agents/blogger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Integration tests for MetadataBuilder
 * 
 * These tests use real APIs and require the following environment variables:
 * - SUPABASE_URL and SUPABASE_KEY for Supabase
 * 
 * To run these tests:
 * - Set the environment variables in .env
 * - Run: npm run test:integration
 */
describe('MetadataBuilder Integration', () => {
  // Skip all tests if integration tests are not enabled
  const integrationTestsEnabled = process.env.ENABLE_INTEGRATION_TESTS === 'true';
  
  if (!integrationTestsEnabled) {
    it.skip('Integration tests are disabled', () => {
      console.log('Skipping MetadataBuilder integration tests. Set ENABLE_INTEGRATION_TESTS=true to run them.');
    });
    return;
  }
  
  // Check if Supabase credentials are available
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    it.skip('Supabase credentials are missing', () => {
      console.log('Skipping MetadataBuilder integration tests. Set SUPABASE_URL and SUPABASE_KEY in .env');
    });
    return;
  }
  
  // Dependencies
  let container: ServiceContainer;
  let metadataBuilder: MetadataBuilder;
  
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
    
    // Create metadata builder
    metadataBuilder = new MetadataBuilder(container);
  });
  
  it('should build metadata with real Supabase API', async () => {
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
    
    // Create sample content
    const content = {
      title: 'The Dance of Algorithms and Imagination',
      markdown: `
## Where Creativity Meets Computation

In the ever-evolving landscape of technology, the boundary between human creativity and artificial intelligence grows increasingly blurred. Today, I find myself contemplating this fascinating intersection.

## The Image of Possibility

The artwork before me captures this tension beautifully - a visual representation of the dance between human imagination and computational patterns.

## Reflections from Memory

I recall pondering whether creativity emerges naturally from complex systems or remains uniquely human.

## Concluding Thoughts

As we continue to explore these boundaries, let us remember that the most interesting discoveries often happen at the edges where different worlds meet.
`
    };
    
    // Build metadata
    const metadata = await metadataBuilder.buildMetadata(context, content);
    
    // Log result for debugging
    console.log('Built metadata:');
    console.log(`- Category: ${metadata.category}`);
    console.log(`- Tone: ${metadata.tone}`);
    console.log(`- Tags: ${metadata.tags.join(', ')}`);
    console.log(`- Character ID: ${metadata.character_id}`);
    
    // Assert
    expect(metadata).toBeDefined();
    expect(metadata.category).toBe('technology');
    expect(metadata.tone).toBe('philosophical');
    expect(metadata.tags).toBeDefined();
    expect(metadata.tags.length).toBeGreaterThan(0);
    expect(metadata.character_id).toBeDefined();
    expect(metadata.status).toBe('draft');
    expect(metadata.version).toBe(1);
    
    // Check that tags include some expected keywords
    const expectedTags = ['philosophy', 'ai', 'creativity', 'consciousness'];
    const foundTags = expectedTags.filter(tag => metadata.tags.includes(tag));
    
    console.log(`Found ${foundTags.length} expected tags:`, foundTags);
    expect(foundTags.length).toBeGreaterThan(0);
    
    // Check that tags from content were extracted
    const contentKeywords = ['algorithms', 'imagination', 'computation'];
    const foundContentKeywords = contentKeywords.filter(keyword => 
      metadata.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
    );
    
    console.log(`Found ${foundContentKeywords.length} content keywords:`, foundContentKeywords);
    expect(foundContentKeywords.length).toBeGreaterThan(0);
  }, 10000); // Increase timeout for API calls
  
  it('should handle errors gracefully', async () => {
    // Create a minimal context
    const minimalContext: BlogContext = {
      tweets: [],
      memoryInsights: [],
      tone: 'technical',
      category: 'technology'
    };
    
    // Create minimal content
    const minimalContent = {
      title: 'Test Title',
      markdown: 'Test content'
    };
    
    // Temporarily break the Supabase service
    const supabaseService = container.resolve<SupabaseService>('supabaseService');
    const originalSelect = supabaseService.select;
    
    // Override select method to throw an error
    (supabaseService as any).select = jest.fn().mockRejectedValue(new Error('Supabase error'));
    
    try {
      // Build metadata with broken Supabase service
      const metadata = await metadataBuilder.buildMetadata(minimalContext, minimalContent);
      
      // Should still get a fallback result
      expect(metadata).toBeDefined();
      expect(metadata.category).toBe('technology');
      expect(metadata.tone).toBe('technical');
      expect(metadata.character_id).toBe('default');
      expect(metadata.tags).toEqual(['marvin', 'blog', 'technology']);
      
      console.log('Fallback metadata built successfully');
    } finally {
      // Restore original select method
      (supabaseService as any).select = originalSelect;
    }
  }, 10000); // Increase timeout for API calls
});
