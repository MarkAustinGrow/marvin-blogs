import { ActivityLogger, ServiceContainer, SupabaseService, ConfigManager, ErrorHandler, ErrorType } from '../agents/blogger';

describe('ActivityLogger', () => {
  // Mock dependencies
  let container: ServiceContainer;
  let supabaseService: jest.Mocked<SupabaseService>;
  let configManager: jest.Mocked<ConfigManager>;
  let errorHandler: jest.Mocked<ErrorHandler>;
  let activityLogger: ActivityLogger;
  
  // Mock console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Create mocks
    supabaseService = {
      insert: jest.fn(),
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
    
    // Create activity logger
    activityLogger = new ActivityLogger(container);
  });
  
  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  test('should log activity to database', async () => {
    // Mock Supabase insert
    supabaseService.insert.mockResolvedValue({ id: 'activity-id' });
    
    // Act
    await activityLogger.logActivity('test_action', { test: 'data' }, 'test_category');
    
    // Assert
    expect(supabaseService.insert).toHaveBeenCalledWith('activity_logs', {
      agent_name: 'blogger',
      action: 'test_action',
      category: 'test_category',
      details: { test: 'data' },
      version: 1
    });
    
    expect(console.log).toHaveBeenCalledWith('Activity logged: test_action');
  });
  
  test('should handle database errors gracefully', async () => {
    // Mock Supabase insert to throw error
    const mockError = new Error('Database error');
    supabaseService.insert.mockRejectedValue(mockError);
    
    // Act
    await activityLogger.logActivity('test_action', { test: 'data' });
    
    // Assert
    expect(errorHandler.handleError).toHaveBeenCalledWith(
      mockError,
      ErrorType.DATABASE_ERROR,
      expect.objectContaining({
        operation: 'logActivity',
        details: { action: 'test_action', category: 'blog' }
      })
    );
    
    expect(console.error).toHaveBeenCalledWith('Failed to log activity to database:', mockError);
    expect(console.log).toHaveBeenCalledWith(
      'Activity: test_action, Category: blog, Details:',
      { test: 'data' }
    );
  });
  
  test('should log blog created activity', async () => {
    // Mock logActivity method
    const logActivitySpy = jest.spyOn(activityLogger, 'logActivity');
    logActivitySpy.mockResolvedValue();
    
    // Act
    await activityLogger.logBlogCreated('blog-id', 'Test Blog', 3);
    
    // Assert
    expect(logActivitySpy).toHaveBeenCalledWith('blog_created', {
      blogPostId: 'blog-id',
      title: 'Test Blog',
      tweetCount: 3
    });
  });
  
  test('should log blog updated activity', async () => {
    // Mock logActivity method
    const logActivitySpy = jest.spyOn(activityLogger, 'logActivity');
    logActivitySpy.mockResolvedValue();
    
    // Act
    await activityLogger.logBlogUpdated('blog-id', 'Test Blog', 2);
    
    // Assert
    expect(logActivitySpy).toHaveBeenCalledWith('blog_updated', {
      blogPostId: 'blog-id',
      title: 'Test Blog',
      version: 2
    });
  });
  
  test('should log blog published activity', async () => {
    // Mock logActivity method
    const logActivitySpy = jest.spyOn(activityLogger, 'logActivity');
    logActivitySpy.mockResolvedValue();
    
    // Act
    await activityLogger.logBlogPublished('blog-id', 'Test Blog', 'https://example.com/blog');
    
    // Assert
    expect(logActivitySpy).toHaveBeenCalledWith('blog_published', {
      blogPostId: 'blog-id',
      title: 'Test Blog',
      postUrl: 'https://example.com/blog'
    });
  });
  
  test('should log tweets generated activity', async () => {
    // Mock logActivity method
    const logActivitySpy = jest.spyOn(activityLogger, 'logActivity');
    logActivitySpy.mockResolvedValue();
    
    // Act
    await activityLogger.logTweetsGenerated('blog-id', 3);
    
    // Assert
    expect(logActivitySpy).toHaveBeenCalledWith('tweets_generated', {
      blogPostId: 'blog-id',
      tweetCount: 3
    });
  });
  
  test('should log error activity', async () => {
    // Mock logActivity method
    const logActivitySpy = jest.spyOn(activityLogger, 'logActivity');
    logActivitySpy.mockResolvedValue();
    
    // Act
    await activityLogger.logError(ErrorType.API_FAILURE, 'API error', 'test_operation');
    
    // Assert
    expect(logActivitySpy).toHaveBeenCalledWith('error', {
      errorType: ErrorType.API_FAILURE,
      message: 'API error',
      operation: 'test_operation'
    }, 'error');
  });
});
