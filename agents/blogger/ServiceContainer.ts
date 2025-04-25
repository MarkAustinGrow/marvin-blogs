/**
 * ServiceContainer - A simple dependency injection container
 * 
 * This class manages dependencies for the Blogger Agent, allowing for
 * easier testing and component replacement.
 */
export class ServiceContainer {
  private services: Map<string, any> = new Map();

  /**
   * Register a service instance with the container
   * @param name The name to register the service under
   * @param instance The service instance
   */
  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  /**
   * Resolve a service from the container
   * @param name The name of the service to resolve
   * @returns The service instance
   * @throws Error if the service is not registered
   */
  resolve<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not registered`);
    }
    return this.services.get(name) as T;
  }

  /**
   * Check if a service is registered
   * @param name The name of the service to check
   * @returns True if the service is registered, false otherwise
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all registered services
   */
  clear(): void {
    this.services.clear();
  }
}
