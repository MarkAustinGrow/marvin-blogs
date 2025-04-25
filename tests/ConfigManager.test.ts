import { ConfigManager } from '../agents/blogger/ConfigManager';

// Mock the dotenv module
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('ConfigManager', () => {
  // Save original process.env
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    
    // Set required environment variables for testing
    process.env.SUPABASE_URL = 'https://test-supabase-url.com';
    process.env.SUPABASE_KEY = 'test-supabase-key';
    process.env.OPENAI_API_KEY = 'test-openai-api-key';
    process.env.QDRANT_HOST = 'test-qdrant-host';
    process.env.QDRANT_PORT = '6333';
  });
  
  afterEach(() => {
    // Restore original process.env after each test
    process.env = originalEnv;
  });
  
  test('should load configuration from environment variables', () => {
    // Act
    const configManager = new ConfigManager();
    
    // Assert
    expect(configManager.get('SUPABASE_URL')).toBe('https://test-supabase-url.com');
    expect(configManager.get('SUPABASE_KEY')).toBe('test-supabase-key');
    expect(configManager.get('OPENAI_API_KEY')).toBe('test-openai-api-key');
    expect(configManager.get('QDRANT_HOST')).toBe('test-qdrant-host');
    expect(configManager.get('QDRANT_PORT')).toBe('6333');
  });
  
  test('should use default values for optional environment variables', () => {
    // Act
    const configManager = new ConfigManager();
    
    // Assert
    expect(configManager.get('LOG_LEVEL')).toBe('info');
  });
  
  test('should throw an error when a required environment variable is missing', () => {
    // Arrange
    delete process.env.SUPABASE_URL;
    
    // Act & Assert
    expect(() => {
      new ConfigManager();
    }).toThrow('Missing required environment variable: SUPABASE_URL');
  });
  
  test('should throw an error when getting a non-existent configuration key', () => {
    // Arrange
    const configManager = new ConfigManager();
    
    // Act & Assert
    expect(() => {
      configManager.get('NON_EXISTENT_KEY');
    }).toThrow('Configuration key not found: NON_EXISTENT_KEY');
  });
  
  test('should check if a configuration key exists', () => {
    // Arrange
    const configManager = new ConfigManager();
    
    // Act & Assert
    expect(configManager.has('SUPABASE_URL')).toBe(true);
    expect(configManager.has('NON_EXISTENT_KEY')).toBe(false);
  });
  
  test('should get all configuration values', () => {
    // Arrange
    const configManager = new ConfigManager();
    
    // Act
    const config = configManager.getAll();
    
    // Assert
    expect(config).toEqual({
      SUPABASE_URL: 'https://test-supabase-url.com',
      SUPABASE_KEY: 'test-supabase-key',
      OPENAI_API_KEY: 'test-openai-api-key',
      QDRANT_HOST: 'test-qdrant-host',
      QDRANT_PORT: '6333',
      LOG_LEVEL: 'info'
    });
  });
});
