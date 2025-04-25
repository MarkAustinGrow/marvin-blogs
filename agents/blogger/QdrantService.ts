import { ConfigManager } from './ConfigManager';
import { ErrorHandler, ErrorType } from './ErrorHandler';
import { MemoryInsight } from './types/BlogContext';
import axios from 'axios';

/**
 * QdrantService - Handles interactions with Marvin's Memory via Qdrant
 * 
 * This class provides methods for retrieving memory insights via vector search
 * using Qdrant as the vector database.
 */
export class QdrantService {
  private host: string;
  private port: string;
  private collectionName: string = 'marvin_memories';
  private openaiApiKey: string;
  private errorHandler: ErrorHandler;
  
  /**
   * Create a new QdrantService instance
   * 
   * @param configManager The configuration manager to get Qdrant credentials from
   * @param errorHandler The error handler for handling errors
   */
  constructor(configManager: ConfigManager, errorHandler: ErrorHandler) {
    this.host = configManager.get('QDRANT_HOST');
    this.port = configManager.get('QDRANT_PORT');
    this.openaiApiKey = configManager.get('OPENAI_API_KEY');
    this.errorHandler = errorHandler;
  }
  
  /**
   * Get the base URL for Qdrant API requests
   * 
   * @returns The base URL for Qdrant API requests
   */
  private getBaseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }
  
  /**
   * Generate an embedding for a text using OpenAI's text-embedding-3-small model
   * 
   * @param text The text to generate an embedding for
   * @returns A promise that resolves to the embedding vector
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: 'text-embedding-3-small'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.data[0].embedding;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.API_FAILURE, {
        operation: 'generateEmbedding',
        details: { text: text.substring(0, 100) + '...' }
      });
      throw error;
    }
  }
  
  /**
   * Search for memories related to a query
   * 
   * @param query The query to search for
   * @param limit The maximum number of results to return
   * @returns A promise that resolves to an array of memory insights
   */
  async searchMemories(query: string, limit: number = 5): Promise<MemoryInsight[]> {
    try {
      // Generate embedding for the query
      const embedding = await this.generateEmbedding(query);
      
      // Search Qdrant for similar vectors
      const response = await axios.post(
        `${this.getBaseUrl()}/collections/${this.collectionName}/points/search`,
        {
          vector: embedding,
          limit: limit,
          with_payload: true
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Transform results into MemoryInsight objects
      return response.data.result.map((item: any) => ({
        content: item.payload.content,
        tags: item.payload.tags || [],
        timestamp: item.payload.timestamp || new Date().toISOString()
      }));
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.MEMORY_ERROR, {
        operation: 'searchMemories',
        details: { query: query }
      });
      
      // Return empty array as fallback
      return [];
    }
  }
  
  /**
   * Search for memories related to multiple queries
   * 
   * @param queries An array of queries to search for
   * @param limit The maximum number of results to return per query
   * @returns A promise that resolves to an array of memory insights
   */
  async searchMultipleQueries(queries: string[], limit: number = 3): Promise<MemoryInsight[]> {
    try {
      // Search for each query and combine results
      const resultsPromises = queries.map(query => this.searchMemories(query, limit));
      const results = await Promise.all(resultsPromises);
      
      // Flatten and deduplicate results
      const flatResults = results.flat();
      const uniqueResults = this.deduplicateMemories(flatResults);
      
      return uniqueResults;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.MEMORY_ERROR, {
        operation: 'searchMultipleQueries',
        details: { queries: queries }
      });
      
      // Return empty array as fallback
      return [];
    }
  }
  
  /**
   * Deduplicate memory insights based on content
   * 
   * @param memories The array of memory insights to deduplicate
   * @returns An array of deduplicated memory insights
   */
  private deduplicateMemories(memories: MemoryInsight[]): MemoryInsight[] {
    const seen = new Set<string>();
    return memories.filter(memory => {
      // Use first 100 chars of content as a unique identifier
      const key = memory.content.substring(0, 100);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
