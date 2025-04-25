import { PublisherAdapter, ServiceContainer, SupabaseService, ConfigManager, ErrorHandler } from '../agents/blogger';
import { BlogPost } from '../agents/blogger';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PublisherAdapter', () => {
  // Mock dependencies
  let container: ServiceContainer;
  let supabaseService: jest.Mocked<SupabaseService>;
  let configManager: jest.Mocked<ConfigManager>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let publisherAdapter: PublisherAdapter;
  
  beforeEach(() => {
    // Create mocks
    supabaseService = {
      insert: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<SupabaseService>;
    
    configManager = {
      get: jest.fn(),
      has: jest.fn(),
    } as unknown as jest.Mocked<ConfigManager>;
    
    errorHandler = {
      handleError: jest.fn(),
    } as unknown as jest.Mocked<ErrorHandler>;
    
    // Create container and register mocks
    container = new ServiceContainer();
    container.register('supabaseService', supabaseService);
    container.register('configManager', configManager);
    container.register('errorHandler', errorHandler);
    
    // Create publisher adapter
    publisherAdapter = new PublisherAdapter(container);
  });
  
  test('should save blog post to database', async () => {
    // Mock WordPress integration as disabled
    configManager.has.mockReturnValue(false);
    
    // Mock Supabase insert
    const mockBlogPost: BlogPost = {
      title: 'Test Blog Post',
      markdown: '# Test Blog Post\n\nThis is a test blog post.',
      category: 'technology',
      tags: ['test', 'blog'],
      tone: 'technical',
      character_id: '123',
      status: 'draft',
      version: 1
    };
    
    const mockInsertedPost = {
      ...mockBlogPost,
      id: '456',
      created_at: '2025-04-25T10:00:00Z'
    };
    
    supabaseService.insert.mockResolvedValue(mockInsertedPost);
    
    // Act
    const result = await publisherAdapter.saveAndPublish(mockBlogPost);
    
    // Assert
    expect(result).toEqual(mockInsertedPost);
    expect(supabaseService.insert).toHaveBeenCalledWith('blog_posts', mockBlogPost);
  });
  
  test('should update existing blog post in database', async () => {
    // Mock WordPress integration as disabled
    configManager.has.mockReturnValue(false);
    
    // Mock Supabase update
    const mockBlogPost: BlogPost = {
      id: '456',
      title: 'Updated Blog Post',
      markdown: '# Updated Blog Post\n\nThis is an updated blog post.',
      category: 'technology',
      tags: ['test', 'blog', 'updated'],
      tone: 'technical',
      character_id: '123',
      status: 'draft',
      version: 1
    };
    
    const mockUpdatedPost = {
      ...mockBlogPost,
      version: 2,
      created_at: '2025-04-25T10:00:00Z'
    };
    
    supabaseService.update.mockResolvedValue(mockUpdatedPost);
    
    // Act
    const result = await publisherAdapter.saveAndPublish(mockBlogPost);
    
    // Assert
    expect(result).toEqual(mockUpdatedPost);
    expect(supabaseService.update).toHaveBeenCalledWith(
      'blog_posts',
      { ...mockBlogPost, version: 2 },
      { id: '456' }
    );
  });
  
  test('should publish blog post to WordPress if enabled', async () => {
    // Mock WordPress integration as enabled
    configManager.has.mockReturnValue(true);
    configManager.get.mockImplementation((key: string) => {
      if (key === 'WORDPRESS_URL') return 'https://example.com/wp';
      if (key === 'WORDPRESS_USERNAME') return 'user';
      if (key === 'WORDPRESS_PASSWORD') return 'pass';
      return '';
    });
    
    // Mock Supabase insert
    const mockBlogPost: BlogPost = {
      title: 'Test Blog Post',
      markdown: '# Test Blog Post\n\nThis is a test blog post.',
      category: 'technology',
      tags: ['test', 'blog'],
      tone: 'technical',
      character_id: '123',
      status: 'published', // Note: 'published' status
      version: 1
    };
    
    const mockInsertedPost = {
      ...mockBlogPost,
      id: '456',
      created_at: '2025-04-25T10:00:00Z'
    };
    
    supabaseService.insert.mockResolvedValue(mockInsertedPost);
    
    // Mock WordPress API response
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        link: 'https://example.com/wp/blog/test-blog-post'
      }
    });
    
    // Mock update post URL
    supabaseService.update.mockResolvedValueOnce({
      ...mockInsertedPost,
      post_url: 'https://example.com/wp/blog/test-blog-post'
    });
    
    // Act
    const result = await publisherAdapter.saveAndPublish(mockBlogPost);
    
    // Assert
    expect(result.post_url).toBe('https://example.com/wp/blog/test-blog-post');
    expect(supabaseService.insert).toHaveBeenCalledWith('blog_posts', mockBlogPost);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://example.com/wp/wp-json/wp/v2/posts',
      expect.objectContaining({
        title: 'Test Blog Post',
        status: 'publish'
      }),
      expect.anything()
    );
    expect(supabaseService.update).toHaveBeenCalledWith(
      'blog_posts',
      { post_url: 'https://example.com/wp/blog/test-blog-post' },
      { id: '456' }
    );
  });
  
  test('should handle errors when saving to database', async () => {
    // Mock WordPress integration as disabled
    configManager.has.mockReturnValue(false);
    
    // Mock Supabase insert to throw error
    const mockBlogPost: BlogPost = {
      title: 'Test Blog Post',
      markdown: '# Test Blog Post\n\nThis is a test blog post.',
      category: 'technology',
      tags: ['test', 'blog'],
      tone: 'technical',
      character_id: '123',
      status: 'draft',
      version: 1
    };
    
    const mockError = new Error('Database error');
    supabaseService.insert.mockRejectedValue(mockError);
    
    // Act & Assert
    await expect(publisherAdapter.saveAndPublish(mockBlogPost)).rejects.toThrow('Database error');
    expect(errorHandler.handleError).toHaveBeenCalledWith(
      mockError,
      expect.anything(),
      expect.objectContaining({
        operation: 'saveAndPublish',
        details: { title: 'Test Blog Post' }
      })
    );
  });
  
  test('should handle errors when publishing to WordPress', async () => {
    // Mock WordPress integration as enabled
    configManager.has.mockReturnValue(true);
    configManager.get.mockImplementation((key: string) => {
      if (key === 'WORDPRESS_URL') return 'https://example.com/wp';
      if (key === 'WORDPRESS_USERNAME') return 'user';
      if (key === 'WORDPRESS_PASSWORD') return 'pass';
      return '';
    });
    
    // Mock Supabase insert
    const mockBlogPost: BlogPost = {
      title: 'Test Blog Post',
      markdown: '# Test Blog Post\n\nThis is a test blog post.',
      category: 'technology',
      tags: ['test', 'blog'],
      tone: 'technical',
      character_id: '123',
      status: 'published', // Note: 'published' status
      version: 1
    };
    
    const mockInsertedPost = {
      ...mockBlogPost,
      id: '456',
      created_at: '2025-04-25T10:00:00Z'
    };
    
    supabaseService.insert.mockResolvedValue(mockInsertedPost);
    
    // Mock WordPress API error
    const mockError = new Error('WordPress API error');
    mockedAxios.post.mockRejectedValueOnce(mockError);
    
    // Act & Assert
    await expect(publisherAdapter.saveAndPublish(mockBlogPost)).rejects.toThrow('WordPress API error');
    expect(supabaseService.insert).toHaveBeenCalledWith('blog_posts', mockBlogPost);
    expect(mockedAxios.post).toHaveBeenCalled();
    expect(errorHandler.handleError).toHaveBeenCalledWith(
      mockError,
      expect.anything(),
      expect.objectContaining({
        operation: 'publishToWordPress'
      })
    );
  });
});
