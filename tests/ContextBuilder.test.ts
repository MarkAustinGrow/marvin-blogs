import { ContextBuilder, ServiceContainer, SupabaseService, QdrantService, ConfigManager, ErrorHandler } from '../agents/blogger';
import { BlogContext, Tweet, MemoryInsight } from '../agents/blogger';

describe('ContextBuilder', () => {
  // Mock dependencies
  let container: ServiceContainer;
  let supabaseService: jest.Mocked<SupabaseService>;
  let qdrantService: jest.Mocked<QdrantService>;
  let configManager: jest.Mocked<ConfigManager>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let contextBuilder: ContextBuilder;
  
  beforeEach(() => {
    // Create mocks
    supabaseService = {
      select: jest.fn(),
    } as unknown as jest.Mocked<SupabaseService>;
    
    qdrantService = {
      searchMultipleQueries: jest.fn(),
    } as unknown as jest.Mocked<QdrantService>;
    
    configManager = {} as jest.Mocked<ConfigManager>;
    
    errorHandler = {
      handleError: jest.fn(),
    } as unknown as jest.Mocked<ErrorHandler>;
    
    // Create container and register mocks
    container = new ServiceContainer();
    container.register('supabaseService', supabaseService);
    container.register('qdrantService', qdrantService);
    container.register('configManager', configManager);
    container.register('errorHandler', errorHandler);
    
    // Create context builder
    contextBuilder = new ContextBuilder(container);
  });
  
  test('should build context with tweets, image, and memory insights', async () => {
    // Mock tweets
    const mockTweets = [
      {
        id: 1,
        tweet_id: 'tweet1',
        tweet_text: 'This is a test tweet',
        tweet_url: 'https://twitter.com/marvin/status/1',
        created_at: '2025-04-25T10:00:00Z',
        vibe_tags: ['philosophy', 'ai']
      },
      {
        id: 2,
        tweet_id: 'tweet2',
        tweet_text: 'Another test tweet',
        tweet_url: 'https://twitter.com/marvin/status/2',
        created_at: '2025-04-24T10:00:00Z',
        vibe_tags: ['technology', 'programming']
      }
    ];
    
    // Mock image
    const mockImage = {
      image_url: 'https://example.com/image.jpg',
      prompt_id: 'prompt1',
      created_at: '2025-04-25T09:00:00Z'
    };
    
    // Mock prompt
    const mockPrompt = {
      text: 'A digital artwork of a robot philosopher'
    };
    
    // Mock character
    const mockCharacter = {
      content: {
        tone: 'philosophical',
        personality: 'introspective'
      }
    };
    
    // Mock memory insights
    const mockMemoryInsights: MemoryInsight[] = [
      {
        content: 'Memory about AI and philosophy',
        tags: ['ai', 'philosophy'],
        timestamp: '2025-04-20T10:00:00Z'
      },
      {
        content: 'Memory about programming',
        tags: ['technology', 'programming'],
        timestamp: '2025-04-19T10:00:00Z'
      }
    ];
    
    // Setup mocks
    supabaseService.select
      .mockImplementation((table, columns, options) => {
        if (table === 'tweets_cache') {
          return Promise.resolve(mockTweets);
        } else if (table === 'images') {
          return Promise.resolve([mockImage]);
        } else if (table === 'prompts') {
          return Promise.resolve([mockPrompt]);
        } else if (table === 'character_files') {
          return Promise.resolve([mockCharacter]);
        }
        return Promise.resolve([]);
      });
    
    qdrantService.searchMultipleQueries
      .mockResolvedValue(mockMemoryInsights);
    
    // Act
    const context = await contextBuilder.buildContext();
    
    // Assert
    expect(context).toBeDefined();
    expect(context.tweets).toHaveLength(2);
    expect(context.tweets[0].id).toBe('tweet1');
    expect(context.tweets[0].text).toBe('This is a test tweet');
    expect(context.tweets[0].vibe_tags).toEqual(['philosophy', 'ai']);
    
    expect(context.image).toBeDefined();
    expect(context.image?.url).toBe('https://example.com/image.jpg');
    expect(context.image?.prompt).toBe('A digital artwork of a robot philosopher');
    
    expect(context.tone).toBe('philosophical');
    
    expect(context.memoryInsights).toHaveLength(2);
    expect(context.memoryInsights[0].content).toBe('Memory about AI and philosophy');
    expect(context.memoryInsights[0].tags).toEqual(['ai', 'philosophy']);
    
    // The category is determined by the tags, and in this case it's 'technology'
    // because there are more technology-related tags than philosophy-related tags
    expect(context.category).toBe('technology');
    
    // Verify calls
    expect(supabaseService.select).toHaveBeenCalledWith(
      'tweets_cache',
      'id, tweet_id, tweet_text, tweet_url, created_at, vibe_tags',
      expect.anything()
    );
    
    expect(supabaseService.select).toHaveBeenCalledWith(
      'images',
      'image_url, prompt_id, created_at',
      expect.anything()
    );
    
    expect(supabaseService.select).toHaveBeenCalledWith(
      'prompts',
      'text',
      { id: 'prompt1' }
    );
    
    expect(supabaseService.select).toHaveBeenCalledWith(
      'character_files',
      'content',
      { agent_name: 'marvin', is_active: true }
    );
    
    expect(qdrantService.searchMultipleQueries).toHaveBeenCalledWith(
      expect.arrayContaining([
        'This is a test tweet',
        'Another test tweet',
        'A digital artwork of a robot philosopher',
        'philosophy, ai, technology, programming'
      ])
    );
  });
  
  test('should handle errors and return fallback context', async () => {
    // Setup mocks to throw errors
    supabaseService.select.mockRejectedValue(new Error('Database error'));
    
    // Act
    const context = await contextBuilder.buildContext();
    
    // Assert
    expect(context).toBeDefined();
    expect(context.tweets).toEqual([]);
    expect(context.image).toBeUndefined();
    expect(context.memoryInsights).toEqual([]);
    expect(context.tone).toBe('philosophical');
    expect(context.category).toBe('philosophy');
    
    // Verify error was handled
    expect(errorHandler.handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.anything(),
      expect.anything()
    );
  });
  
  test('should determine category based on tags', async () => {
    // Mock tweets with technology tags
    const mockTweets = [
      {
        id: 1,
        tweet_id: 'tweet1',
        tweet_text: 'Tweet about technology',
        tweet_url: 'https://twitter.com/marvin/status/1',
        created_at: '2025-04-25T10:00:00Z',
        vibe_tags: ['technology', 'ai', 'programming']
      }
    ];
    
    // Mock memory insights with technology tags
    const mockMemoryInsights: MemoryInsight[] = [
      {
        content: 'Memory about technology',
        tags: ['technology', 'ai'],
        timestamp: '2025-04-20T10:00:00Z'
      }
    ];
    
    // Setup mocks
    supabaseService.select
      .mockImplementation((table, columns, options) => {
        if (table === 'tweets_cache') {
          return Promise.resolve(mockTweets);
        } else if (table === 'images') {
          return Promise.resolve([]);
        } else if (table === 'character_files') {
          return Promise.resolve([{ content: { tone: 'technical' } }]);
        }
        return Promise.resolve([]);
      });
    
    qdrantService.searchMultipleQueries
      .mockResolvedValue(mockMemoryInsights);
    
    // Act
    const context = await contextBuilder.buildContext();
    
    // Assert
    expect(context.category).toBe('technology');
  });
});
