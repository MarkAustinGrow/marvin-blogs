import { ErrorHandler, ErrorType, ErrorContext } from '../agents/blogger/ErrorHandler';
import { ConfigManager, SupabaseService } from '../agents/blogger';

// Mock console methods
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

describe('ErrorHandler', () => {
  // Determine whether to use real Supabase or mock
  const useRealSupabase = process.env.USE_REAL_SUPABASE === 'true';
  
  // Create Supabase service or mock
  let supabaseService: any;
  let errorHandler: ErrorHandler;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    if (useRealSupabase) {
      // Use real Supabase service
      const configManager = new ConfigManager();
      supabaseService = new SupabaseService(configManager);
    } else {
      // Use mock Supabase service
      supabaseService = {
        insert: jest.fn().mockResolvedValue({ id: 'mock-error-id' })
      };
    }
    
    // Create error handler with Supabase service
    errorHandler = new ErrorHandler(supabaseService);
    
    // Mock the scheduleRetry method to avoid timeouts
    jest.spyOn(errorHandler as any, 'scheduleRetry').mockImplementation(() => Promise.resolve());
  });
  
  test('should log errors to console and database', async () => {
    // Arrange
    const error = new Error('Test error');
    const errorType = ErrorType.API_FAILURE;
    const context: ErrorContext = { operation: 'test-operation' };
    
    // Act
    await errorHandler.handleError(error, errorType, context);
    
    // Assert
    expect(console.error).toHaveBeenCalledWith('[ERROR] api_failure: Test error');
    
    if (useRealSupabase) {
      // For real Supabase, we can't easily check the insert, so we'll skip that assertion
    } else {
      // For mock Supabase, we can check the insert
      expect(supabaseService.insert).toHaveBeenCalledWith('error_logs', {
        agent_name: 'blogger',
        error_type: errorType,
        message: error.message,
        stack: error.stack,
        context: context,
      });
    }
  });
  
  test('should handle database logging failures gracefully', async () => {
    // Skip this test for real Supabase
    if (useRealSupabase) {
      return;
    }
    
    // Arrange
    const error = new Error('Test error');
    const dbError = new Error('Database error');
    supabaseService.insert.mockRejectedValueOnce(dbError);
    
    // Act
    await errorHandler.handleError(error, ErrorType.CONTENT_GENERATION, { operation: 'test-operation' });
    
    // Assert
    expect(console.error).toHaveBeenCalledWith('[ERROR] content_generation: Test error');
    expect(console.error).toHaveBeenCalledWith('Failed to log error to database:', dbError);
  });
  
  test('should call scheduleRetry for network errors', async () => {
    // Arrange
    const error = new Error('Network error');
    const context: ErrorContext = { 
      operation: 'network-operation',
      attempt: 1,
      maxAttempts: 3
    };
    
    // Act
    await errorHandler.handleError(error, ErrorType.NETWORK_ERROR, context);
    
    // Assert
    expect((errorHandler as any).scheduleRetry).toHaveBeenCalledWith(context);
  });
  
  test('should call scheduleRetry for rate limit errors', async () => {
    // Arrange
    const error = new Error('Rate limit exceeded');
    const context: ErrorContext = { 
      operation: 'api-operation',
      attempt: 1,
      maxAttempts: 3
    };
    
    // Act
    await errorHandler.handleError(error, ErrorType.API_FAILURE, context);
    
    // Assert
    expect((errorHandler as any).scheduleRetry).toHaveBeenCalledWith(context);
  });
  
  test('should call scheduleRetry for database connection errors', async () => {
    // Arrange
    const error = new Error('Connection error');
    const context: ErrorContext = { 
      operation: 'db-operation',
      attempt: 1,
      maxAttempts: 3
    };
    
    // Act
    await errorHandler.handleError(error, ErrorType.DATABASE_ERROR, context);
    
    // Assert
    expect((errorHandler as any).scheduleRetry).toHaveBeenCalledWith(context);
  });
  
  test('should not call scheduleRetry for non-transient API errors', async () => {
    // Arrange
    const error = new Error('Not a rate limit error');
    const context: ErrorContext = { 
      operation: 'api-operation',
      attempt: 1,
      maxAttempts: 3
    };
    
    // Override the isTransientError method for this test only
    jest.spyOn(errorHandler as any, 'isTransientError').mockReturnValue(false);
    
    // Act
    await errorHandler.handleError(error, ErrorType.API_FAILURE, context);
    
    // Assert
    expect((errorHandler as any).scheduleRetry).not.toHaveBeenCalled();
  });
  
  test('should not call scheduleRetry for unknown errors', async () => {
    // Arrange
    const error = new Error('Unknown error');
    const context: ErrorContext = { 
      operation: 'unknown-operation',
      attempt: 1,
      maxAttempts: 3
    };
    
    // Act
    await errorHandler.handleError(error, ErrorType.UNKNOWN, context);
    
    // Assert
    expect((errorHandler as any).scheduleRetry).not.toHaveBeenCalled();
  });
  
  test('should not call scheduleRetry if max attempts reached', async () => {
    // Arrange
    const error = new Error('rate limit exceeded');
    const context: ErrorContext = { 
      operation: 'test-operation',
      attempt: 3,
      maxAttempts: 3
    };
    
    // Act
    await errorHandler.handleError(error, ErrorType.API_FAILURE, context);
    
    // Assert
    expect((errorHandler as any).scheduleRetry).not.toHaveBeenCalled();
  });
});
