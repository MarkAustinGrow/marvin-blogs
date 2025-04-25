/**
 * ErrorHandler - Centralized error handling for the Blogger Agent
 * 
 * This class provides centralized error handling, logging, and retry logic
 * for various types of errors that may occur during the blog generation process.
 */

export enum ErrorType {
  API_FAILURE = 'api_failure',
  DATABASE_ERROR = 'database_error',
  CONTENT_GENERATION = 'content_generation',
  NETWORK_ERROR = 'network_error',
  CONFIGURATION_ERROR = 'configuration_error',
  MEMORY_ERROR = 'memory_error',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  operation: string;
  details?: Record<string, any>;
  attempt?: number;
  maxAttempts?: number;
}

export class ErrorHandler {
  private supabaseService: any; // Will be properly typed once SupabaseService is implemented
  
  /**
   * Create a new ErrorHandler instance
   * 
   * @param supabaseService The Supabase service for logging errors
   */
  constructor(supabaseService: any) {
    this.supabaseService = supabaseService;
  }

  /**
   * Handle an error
   * 
   * Logs the error to the console and database, and implements retry logic
   * for transient failures.
   * 
   * @param error The error that occurred
   * @param type The type of error
   * @param context Additional context about the error
   * @returns A promise that resolves when the error has been handled
   */
  async handleError(error: Error, type: ErrorType, context?: ErrorContext): Promise<void> {
    console.error(`[ERROR] ${type}: ${error.message}`);
    
    try {
      // Log to error_logs table
      await this.supabaseService.insert('error_logs', {
        agent_name: 'blogger',
        error_type: type,
        message: error.message,
        stack: error.stack,
        context: context || {},
      });
    } catch (logError) {
      // Fallback if we can't log to database
      console.error('Failed to log error to database:', logError);
    }
    
    // Implement retry logic for transient failures
    if (this.isTransientError(type, error) && context && this.canRetry(context)) {
      return this.scheduleRetry(context);
    }
  }
  
  /**
   * Determine if an error is transient and can be retried
   * 
   * @param type The type of error
   * @param error The error that occurred
   * @returns True if the error is transient, false otherwise
   */
  private isTransientError(type: ErrorType, error: Error): boolean {
    // Determine if error is transient and can be retried
    if (type === ErrorType.NETWORK_ERROR) {
      return true;
    }
    
    if (type === ErrorType.API_FAILURE && error.message.toLowerCase().includes('rate limit')) {
      return true;
    }
    
    if (type === ErrorType.DATABASE_ERROR && error.message.toLowerCase().includes('connection')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Determine if an operation can be retried
   * 
   * @param context The error context
   * @returns True if the operation can be retried, false otherwise
   */
  private canRetry(context: ErrorContext): boolean {
    const attempt = context.attempt || 1;
    const maxAttempts = context.maxAttempts || 3;
    return attempt < maxAttempts;
  }
  
  /**
   * Schedule a retry for a failed operation
   * 
   * @param context The error context
   * @returns A promise that resolves when the retry has been scheduled
   */
  private async scheduleRetry(context: ErrorContext): Promise<void> {
    const attempt = context.attempt || 1;
    const nextAttempt = attempt + 1;
    
    // Implement exponential backoff
    const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
    
    console.log(`Scheduling retry ${nextAttempt} for operation: ${context.operation} in ${delayMs}ms`);
    
    // In a real implementation, we would use a proper task scheduler
    // For now, we'll just use setTimeout
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    // Here we would trigger the retry
    // This is just a placeholder
    console.log(`Retrying operation: ${context.operation} (attempt ${nextAttempt})`);
  }
}
