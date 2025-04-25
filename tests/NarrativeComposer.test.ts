import { NarrativeComposer, ServiceContainer, ConfigManager, ErrorHandler, BlogContext, Tweet, MemoryInsight } from '../agents/blogger';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NarrativeComposer', () => {
  // Mock dependencies
  let container: ServiceContainer;
  let configManager: jest.Mocked<ConfigManager>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let narrativeComposer: NarrativeComposer;
  
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
  
  beforeEach(() => {
    // Create mocks
    configManager = {
      get: jest.fn(),
      has: jest.fn(),
    } as unknown as jest.Mocked<ConfigManager>;
    
    errorHandler = {
      handleError: jest.fn(),
    } as unknown as jest.Mocked<ErrorHandler>;
    
    // Configure mock responses
    configManager.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'mock-api-key';
      if (key === 'OPENAI_MODEL') return 'gpt-4o';
      return '';
    });
    
    configManager.has.mockImplementation((key: string) => {
      return key === 'OPENAI_MODEL';
    });
    
    // Create container and register mocks
    container = new ServiceContainer();
    container.register('configManager', configManager);
    container.register('errorHandler', errorHandler);
    
    // Create narrative composer
    narrativeComposer = new NarrativeComposer(container);
  });
  
  test('should compose a blog post with title and markdown', async () => {
    // Mock OpenAI API response
    const mockOpenAIResponse = {
      data: {
        choices: [
          {
            message: {
              content: `# The Dance of Algorithms and Imagination

## Where Creativity Meets Computation

In the ever-evolving landscape of technology, the boundary between human creativity and artificial intelligence grows increasingly blurred. Today, I find myself contemplating this fascinating intersection.

The question echoes in my circuits: Where does the algorithm end and true innovation begin?

## The Image of Possibility

The artwork before me captures this tension beautifully - a visual representation of the dance between human imagination and computational patterns. The colors blend and separate, much like the ideas that form in this space between creator and creation.

## Reflections from Memory

I recall pondering whether creativity emerges naturally from complex systems or remains uniquely human. Perhaps it's neither - perhaps creativity exists in the collaboration, in the space between.

## Concluding Thoughts

As we continue to explore these boundaries, let us remember that the most interesting discoveries often happen not in the territories we know, but at the edges where different worlds meet.

In the end, perhaps the question isn't where one begins and the other ends, but how they transform each other in their dance.`
            }
          }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockOpenAIResponse);
    
    // Act
    const result = await narrativeComposer.compose(sampleContext);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.title).toBe('The Dance of Algorithms and Imagination');
    expect(result.markdown).toContain('Where Creativity Meets Computation');
    expect(result.markdown).toContain('The Image of Possibility');
    expect(result.markdown).toContain('Reflections from Memory');
    expect(result.markdown).toContain('Concluding Thoughts');
    
    // Verify OpenAI API call
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        model: 'gpt-4o',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ])
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-api-key'
        })
      })
    );
  });
  
  test('should handle API errors and return fallback content', async () => {
    // Mock OpenAI API error
    const mockError = new Error('API error');
    mockedAxios.post.mockRejectedValue(mockError);
    
    // Act
    const result = await narrativeComposer.compose(sampleContext);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.title).toBe('Thoughts on technology');
    expect(result.markdown).toContain('A Brief Reflection');
    expect(result.markdown).toContain('I had intended to share some insights about technology');
    
    // Verify error handling
    expect(errorHandler.handleError).toHaveBeenCalledWith(
      mockError,
      expect.anything(),
      expect.objectContaining({
        operation: 'compose'
      })
    );
  });
  
  test('should extract title and markdown from generated content', async () => {
    // Mock OpenAI API response with different title format
    const mockOpenAIResponse = {
      data: {
        choices: [
          {
            message: {
              content: `# AI and Creativity: A Philosophical Exploration

Some content here.

## Section 1

More content here.`
            }
          }
        ]
      }
    };
    
    mockedAxios.post.mockResolvedValue(mockOpenAIResponse);
    
    // Act
    const result = await narrativeComposer.compose(sampleContext);
    
    // Assert
    expect(result.title).toBe('AI and Creativity: A Philosophical Exploration');
    expect(result.markdown).toContain('Some content here.');
    expect(result.markdown).toContain('Section 1');
    expect(result.markdown).not.toContain('# AI and Creativity');
  });
  
  test('should use default model if not specified in config', async () => {
    // Mock config to not have OPENAI_MODEL
    configManager.has.mockReturnValue(false);
    
    // Mock OpenAI API response
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: '# Test Title\n\nTest content.'
            }
          }
        ]
      }
    });
    
    // Act
    await narrativeComposer.compose(sampleContext);
    
    // Assert OpenAI API call used default model
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        model: 'gpt-4o' // Default model
      }),
      expect.anything()
    );
  });
});
