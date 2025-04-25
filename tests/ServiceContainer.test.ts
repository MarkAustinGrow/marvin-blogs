import { ServiceContainer } from '../agents/blogger/ServiceContainer';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  test('should register and resolve a service', () => {
    // Arrange
    const testService = { name: 'test-service' };
    
    // Act
    container.register('testService', testService);
    const resolved = container.resolve<{ name: string }>('testService');
    
    // Assert
    expect(resolved).toBe(testService);
    expect(resolved.name).toBe('test-service');
  });

  test('should throw an error when resolving an unregistered service', () => {
    // Act & Assert
    expect(() => {
      container.resolve('nonExistentService');
    }).toThrow('Service nonExistentService not registered');
  });

  test('should check if a service is registered', () => {
    // Arrange
    const testService = { name: 'test-service' };
    
    // Act
    container.register('testService', testService);
    
    // Assert
    expect(container.has('testService')).toBe(true);
    expect(container.has('nonExistentService')).toBe(false);
  });

  test('should clear all registered services', () => {
    // Arrange
    const testService1 = { name: 'test-service-1' };
    const testService2 = { name: 'test-service-2' };
    
    // Act
    container.register('testService1', testService1);
    container.register('testService2', testService2);
    container.clear();
    
    // Assert
    expect(container.has('testService1')).toBe(false);
    expect(container.has('testService2')).toBe(false);
  });
});
