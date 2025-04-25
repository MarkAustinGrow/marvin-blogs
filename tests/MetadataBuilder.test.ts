import { MetadataBuilder, ServiceContainer, SupabaseService, ConfigManager, ErrorHandler, BlogContext } from '../agents/blogger';

describe('MetadataBuilder', () => {
  // Mock dependencies
  let container: ServiceContainer;
  let supabaseService: jest.Mocked<SupabaseService>;
  let configManager: jest.Mocked<ConfigManager>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let metadataBuilder: MetadataBuilder;
  
  // Sample blog context
  const sampleContext: BlogContext = {
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
  
  // Sample blog content
  const sampleContent = {
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
  
  beforeEach(() => {
    // Create mocks
    supabaseService = {
      select: jest.fn(),
    } as unknown as jest.Mocked<SupabaseService>;
    
    configManager = {} as jest.Mocked<ConfigManager>;
    
    errorHandler = {
      handleError: jest.fn(),
    } as unknown as jest.Mocked<ErrorHandler>;
    
    // Create container and register mocks
    container = new ServiceContainer();
    container.register('supabaseService', supabaseService);
    container.register('configManager', configManager);
    container.register('errorHandler', errorHandler);
    
    // Create metadata builder
    metadataBuilder = new MetadataBuilder(container);
  });
  
  test('should build metadata with tags from tweets and memory insights', async () => {
    // Mock character ID
    supabaseService.select.mockResolvedValueOnce([{ id: 'character-123' }]);
    
    // Act
    const metadata = await metadataBuilder.buildMetadata(sampleContext, sampleContent);
    
    // Assert
    expect(metadata).toBeDefined();
    expect(metadata.category).toBe('technology');
    expect(metadata.tone).toBe('philosophical');
    expect(metadata.character_id).toBe('character-123');
    expect(metadata.image_url).toBe('https://example.com/image.jpg');
    
    // Check tags
    expect(metadata.tags).toContain('philosophy');
    expect(metadata.tags).toContain('ai');
    expect(metadata.tags).toContain('creativity');
    expect(metadata.tags).toContain('consciousness');
    
    // Check that tags from content were extracted
    expect(metadata.tags).toContain('algorithms');
    expect(metadata.tags).toContain('imagination');
    
    // Verify Supabase calls
    expect(supabaseService.select).toHaveBeenCalledWith(
      'character_files',
      'id',
      { agent_name: 'marvin', is_active: true }
    );
  });
  
  test('should use default character ID if no character found', async () => {
    // Mock empty character result
    supabaseService.select.mockResolvedValueOnce([]);
    
    // Act
    const metadata = await metadataBuilder.buildMetadata(sampleContext, sampleContent);
    
    // Assert
    expect(metadata.character_id).toBe('default');
  });
  
  test('should handle database errors and return fallback metadata', async () => {
    // Mock database error
    const mockError = new Error('Database error');
    supabaseService.select.mockRejectedValueOnce(mockError);
    
    // Act
    const metadata = await metadataBuilder.buildMetadata(sampleContext, sampleContent);
    
    // Assert
    expect(metadata).toBeDefined();
    expect(metadata.category).toBe('technology');
    expect(metadata.tone).toBe('philosophical');
    expect(metadata.character_id).toBe('default');
    expect(metadata.tags).toEqual(['marvin', 'blog', 'technology']);
    
    // Verify error handling
    expect(errorHandler.handleError).toHaveBeenCalledWith(
      mockError,
      expect.anything(),
      expect.objectContaining({
        operation: 'buildMetadata'
      })
    );
  });
  
  test('should limit tags to 10', async () => {
    // Mock character ID
    supabaseService.select.mockResolvedValueOnce([{ id: 'character-123' }]);
    
    // Create context with many tags
    const contextWithManyTags: BlogContext = {
      ...sampleContext,
      tweets: [
        {
          ...sampleContext.tweets[0],
          vibe_tags: [
            'philosophy', 'ai', 'creativity', 'technology', 'art',
            'science', 'future', 'innovation', 'consciousness', 'intelligence',
            'machine-learning', 'deep-learning', 'neural-networks', 'algorithms', 'data'
          ]
        }
      ]
    };
    
    // Act
    const metadata = await metadataBuilder.buildMetadata(contextWithManyTags, sampleContent);
    
    // Assert
    expect(metadata.tags.length).toBeLessThanOrEqual(10);
  });
  
  test('should provide default tags if none are available', async () => {
    // Mock character ID
    supabaseService.select.mockResolvedValueOnce([{ id: 'character-123' }]);
    
    // Create context with no tags
    const contextWithNoTags: BlogContext = {
      ...sampleContext,
      tweets: [{ ...sampleContext.tweets[0], vibe_tags: [] }],
      memoryInsights: [{ ...sampleContext.memoryInsights[0], tags: [] }]
    };
    
    // Create content with no extractable keywords
    const contentWithNoKeywords = {
      title: 'A',
      markdown: 'A simple post with no extractable keywords.'
    };
    
    // Act
    const metadata = await metadataBuilder.buildMetadata(contextWithNoTags, contentWithNoKeywords);
    
    // Assert
    expect(metadata.tags).toEqual(['marvin', 'blog', 'technology']);
  });
});
