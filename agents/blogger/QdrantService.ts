import { ConfigManager } from './ConfigManager';
import { ErrorHandler, ErrorType } from './ErrorHandler';
import { MemoryInsight } from './types/BlogContext';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * QdrantService - Handles interactions with Marvin's Memory via Qdrant
 * 
 * This class provides methods for retrieving memory insights via vector search
 * using Qdrant as the vector database.
 */
export class QdrantService {
  private host: string;
  private port: string;
  private collectionName: string = 'marvin_memory';
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

  /**
   * Get random memories from Qdrant
   * 
   * @param count The number of random memories to retrieve
   * @returns A promise that resolves to an array of memory insights
   */
  async getRandomMemories(count: number = 5): Promise<MemoryInsight[]> {
    console.log(`[QdrantService] Getting ${count} random memories from Qdrant...`);
    try {
      // Get a random scroll using a random vector
      // This is a simple approach - in production, you might want to use a more sophisticated method
      const randomVector = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
      
      // Search Qdrant with a high limit to get a diverse set of results
      console.log(`[QdrantService] Searching Qdrant collection ${this.collectionName} at ${this.getBaseUrl()}...`);
      const response = await axios.post(
        `${this.getBaseUrl()}/collections/${this.collectionName}/points/search`,
        {
          vector: randomVector,
          limit: count * 5, // Get more results than needed to ensure diversity
          with_payload: true
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`[QdrantService] Received ${response.data.result.length} results from Qdrant`);
      
      // Shuffle the results to randomize them further
      const shuffledResults = this.shuffleArray(response.data.result);
      
      // Take the requested number of results
      const selectedResults = shuffledResults.slice(0, count);
      
      // Transform results into MemoryInsight objects
      const memories = selectedResults.map((item: any) => ({
        id: item.id || uuidv4(),
        content: item.payload.content,
        tags: item.payload.tags || [],
        timestamp: item.payload.timestamp || new Date().toISOString(),
        type: item.payload.type || 'unknown',
        alignment_score: item.payload.alignment_score || 0.7
      }));
      
      console.log(`[QdrantService] Returning ${memories.length} random memories`);
      console.log(`[QdrantService] Memory tags: ${memories.flatMap(m => m.tags).join(', ')}`);
      
      return memories;
    } catch (error) {
      console.error(`[QdrantService] Error getting random memories: ${(error as Error).message}`);
      await this.errorHandler.handleError(error as Error, ErrorType.MEMORY_ERROR, {
        operation: 'getRandomMemories'
      });
      
      // Return empty array as fallback
      console.log(`[QdrantService] Returning empty array as fallback`);
      return [];
    }
  }

  /**
   * Get recent memories from Qdrant
   * 
   * @param days The number of days to look back
   * @param limit The maximum number of memories to retrieve
   * @returns A promise that resolves to an array of memory insights
   */
  async getRecentMemories(days: number = 7, limit: number = 10): Promise<MemoryInsight[]> {
    try {
      // Calculate the date 'days' days ago
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      const daysAgoIso = daysAgo.toISOString();
      
      // Search Qdrant for memories with timestamp >= daysAgoIso
      // Note: This is a simplified approach. In a real implementation,
      // you would need to use Qdrant's filtering capabilities.
      const response = await axios.post(
        `${this.getBaseUrl()}/collections/${this.collectionName}/points/scroll`,
        {
          limit: limit * 2, // Get more results than needed to account for filtering
          with_payload: true
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Filter results by timestamp
      const filteredResults = response.data.result.filter((item: any) => {
        const timestamp = item.payload.timestamp;
        return timestamp && timestamp >= daysAgoIso;
      });
      
      // Sort by timestamp (newest first)
      filteredResults.sort((a: any, b: any) => {
        const aTime = a.payload.timestamp || '';
        const bTime = b.payload.timestamp || '';
        return bTime.localeCompare(aTime);
      });
      
      // Take the requested number of results
      const selectedResults = filteredResults.slice(0, limit);
      
      // Transform results into MemoryInsight objects
      return selectedResults.map((item: any) => ({
        id: item.id || uuidv4(),
        content: item.payload.content,
        tags: item.payload.tags || [],
        timestamp: item.payload.timestamp || new Date().toISOString(),
        type: item.payload.type || 'unknown',
        alignment_score: item.payload.alignment_score || 0.7
      }));
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.MEMORY_ERROR, {
        operation: 'getRecentMemories'
      });
      
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Get memories by tags from Qdrant
   * 
   * @param tags The tags to search for
   * @param limit The maximum number of memories to retrieve
   * @returns A promise that resolves to an array of memory insights
   */
  async getMemoriesByTags(tags: string[], limit: number = 10): Promise<MemoryInsight[]> {
    try {
      if (tags.length === 0) {
        return [];
      }
      
      // Join tags into a single query string
      const query = tags.join(', ');
      
      // Use the existing searchMemories method to find memories related to the tags
      const memories = await this.searchMemories(query, limit);
      
      // Add IDs and other fields to the memories
      return memories.map(memory => ({
        ...memory,
        id: memory.id || uuidv4(),
        type: memory.type || 'unknown',
        alignment_score: memory.alignment_score || 0.7
      }));
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.MEMORY_ERROR, {
        operation: 'getMemoriesByTags',
        details: { tags }
      });
      
      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Shuffle an array using the Fisher-Yates algorithm
   * 
   * @param array The array to shuffle
   * @returns The shuffled array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
