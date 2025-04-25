import dotenv from 'dotenv';

/**
 * ConfigManager - Manages configuration from environment variables
 * 
 * This class loads and validates environment variables, providing
 * a centralized way to access configuration values.
 */
export class ConfigManager {
  private config: Record<string, string> = {};

  /**
   * Create a new ConfigManager instance
   * 
   * Loads environment variables from .env file and validates
   * required variables.
   */
  constructor() {
    // Load environment variables from .env file
    dotenv.config();
    this.loadConfig();
  }

  /**
   * Load configuration from environment variables
   * 
   * @throws Error if a required environment variable is missing
   */
  private loadConfig(): void {
    // Required environment variables
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'OPENAI_API_KEY',
      'QDRANT_HOST',
      'QDRANT_PORT'
    ];

    // Validate required variables
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
      this.config[varName] = value;
    }

    // Optional variables with defaults
    this.config['LOG_LEVEL'] = process.env.LOG_LEVEL || 'info';
  }

  /**
   * Get a configuration value
   * 
   * @param key The configuration key to get
   * @returns The configuration value
   * @throws Error if the configuration key is not found
   */
  get(key: string): string {
    if (!(key in this.config)) {
      throw new Error(`Configuration key not found: ${key}`);
    }
    return this.config[key];
  }

  /**
   * Check if a configuration key exists
   * 
   * @param key The configuration key to check
   * @returns True if the key exists, false otherwise
   */
  has(key: string): boolean {
    return key in this.config;
  }

  /**
   * Get all configuration values
   * 
   * @returns A copy of the configuration object
   */
  getAll(): Record<string, string> {
    return { ...this.config };
  }
}
