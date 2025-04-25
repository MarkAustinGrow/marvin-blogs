import { ConfigManager, SupabaseService } from '../../agents/blogger';

/**
 * Integration tests for SupabaseService
 * 
 * These tests connect to the actual Supabase database and perform real operations.
 * They require valid Supabase credentials in the .env file.
 * 
 * To run these tests, use:
 * npm test -- tests/integration
 */

// Only run these tests if ENABLE_INTEGRATION_TESTS is set to 'true'
const runIntegrationTests = process.env.ENABLE_INTEGRATION_TESTS === 'true';
const testDescribe = runIntegrationTests ? describe : describe.skip;

testDescribe('SupabaseService Integration', () => {
  let configManager: ConfigManager;
  let supabaseService: SupabaseService;
  
  // Test table name with a unique suffix to avoid conflicts
  const testTable = `test_error_logs_${Date.now()}`;
  
  beforeAll(async () => {
    // Create config manager and Supabase service
    configManager = new ConfigManager();
    supabaseService = new SupabaseService(configManager);
    
    // Create test table
    await supabaseService.query(`
      CREATE TABLE IF NOT EXISTS ${testTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_name TEXT,
        error_type TEXT,
        message TEXT,
        stack TEXT,
        context JSONB,
        created_at TIMESTAMP DEFAULT now()
      )
    `);
  });
  
  afterAll(async () => {
    // Drop test table
    await supabaseService.query(`DROP TABLE IF EXISTS ${testTable}`);
  });
  
  beforeEach(async () => {
    // Clear test table before each test
    await supabaseService.query(`DELETE FROM ${testTable}`);
  });
  
  test('should insert data into a table', async () => {
    // Arrange
    const testData = {
      agent_name: 'test-agent',
      error_type: 'test-error',
      message: 'Test error message',
      context: { operation: 'test-operation' }
    };
    
    // Act
    const result = await supabaseService.insert(testTable, testData);
    
    // Assert
    expect(result).toBeTruthy();
    expect(result.id).toBeTruthy();
    expect(result.agent_name).toBe('test-agent');
    expect(result.error_type).toBe('test-error');
    expect(result.message).toBe('Test error message');
    expect(result.context).toEqual({ operation: 'test-operation' });
    expect(result.created_at).toBeTruthy();
  });
  
  test('should select data from a table', async () => {
    // Arrange
    const testData = {
      agent_name: 'test-agent',
      error_type: 'test-error',
      message: 'Test error message',
      context: { operation: 'test-operation' }
    };
    await supabaseService.insert(testTable, testData);
    
    // Act
    const results = await supabaseService.select(testTable);
    
    // Assert
    expect(results).toHaveLength(1);
    expect(results[0].agent_name).toBe('test-agent');
    expect(results[0].error_type).toBe('test-error');
    expect(results[0].message).toBe('Test error message');
    expect(results[0].context).toEqual({ operation: 'test-operation' });
  });
  
  test('should update data in a table', async () => {
    // Arrange
    const testData = {
      agent_name: 'test-agent',
      error_type: 'test-error',
      message: 'Test error message',
      context: { operation: 'test-operation' }
    };
    const inserted = await supabaseService.insert(testTable, testData);
    
    // Act
    const updateData = {
      message: 'Updated error message',
      context: { operation: 'updated-operation' }
    };
    const result = await supabaseService.update(testTable, updateData, { id: inserted.id });
    
    // Assert
    expect(result).toBeTruthy();
    expect(result[0].id).toBe(inserted.id);
    expect(result[0].agent_name).toBe('test-agent');
    expect(result[0].error_type).toBe('test-error');
    expect(result[0].message).toBe('Updated error message');
    expect(result[0].context).toEqual({ operation: 'updated-operation' });
  });
  
  test('should delete data from a table', async () => {
    // Arrange
    const testData = {
      agent_name: 'test-agent',
      error_type: 'test-error',
      message: 'Test error message',
      context: { operation: 'test-operation' }
    };
    const inserted = await supabaseService.insert(testTable, testData);
    
    // Act
    await supabaseService.delete(testTable, { id: inserted.id });
    const results = await supabaseService.select(testTable);
    
    // Assert
    expect(results).toHaveLength(0);
  });
  
  test('should execute a raw SQL query', async () => {
    // Arrange
    const testData = {
      agent_name: 'test-agent',
      error_type: 'test-error',
      message: 'Test error message',
      context: { operation: 'test-operation' }
    };
    await supabaseService.insert(testTable, testData);
    
    // Act
    const result = await supabaseService.query(`
      SELECT COUNT(*) as count FROM ${testTable}
      WHERE agent_name = 'test-agent'
    `);
    
    // Assert
    expect(result).toBeTruthy();
    expect(result[0].count).toBe(1);
  });
});
