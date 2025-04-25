import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigManager } from './ConfigManager';

/**
 * SupabaseService - Handles interactions with the Supabase database
 * 
 * This class provides methods for interacting with the Supabase database,
 * including inserting, updating, and querying data.
 */
export class SupabaseService {
  private client: SupabaseClient;
  
  /**
   * Create a new SupabaseService instance
   * 
   * @param configManager The configuration manager to get Supabase credentials from
   */
  constructor(configManager: ConfigManager) {
    const supabaseUrl = configManager.get('SUPABASE_URL');
    const supabaseKey = configManager.get('SUPABASE_KEY');
    
    this.client = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Insert data into a table
   * 
   * @param table The table to insert data into
   * @param data The data to insert
   * @returns A promise that resolves to the inserted data
   */
  async insert(table: string, data: Record<string, any>): Promise<any> {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select();
    
    if (error) {
      throw new Error(`Failed to insert into ${table}: ${error.message}`);
    }
    
    return result?.[0] || null;
  }
  
  /**
   * Update data in a table
   * 
   * @param table The table to update data in
   * @param data The data to update
   * @param match The conditions to match for the update
   * @returns A promise that resolves to the updated data
   */
  async update(table: string, data: Record<string, any>, match: Record<string, any>): Promise<any> {
    const { data: result, error } = await this.client
      .from(table)
      .update(data)
      .match(match)
      .select();
    
    if (error) {
      throw new Error(`Failed to update ${table}: ${error.message}`);
    }
    
    return result || null;
  }
  
  /**
   * Select data from a table
   * 
   * @param table The table to select data from
   * @param columns The columns to select
   * @param match The conditions to match for the select
   * @returns A promise that resolves to the selected data
   */
  async select(table: string, columns: string = '*', match?: Record<string, any>): Promise<any[]> {
    let query = this.client
      .from(table)
      .select(columns);
    
    if (match) {
      query = query.match(match);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to select from ${table}: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Delete data from a table
   * 
   * @param table The table to delete data from
   * @param match The conditions to match for the delete
   * @returns A promise that resolves when the delete is complete
   */
  async delete(table: string, match: Record<string, any>): Promise<void> {
    const { error } = await this.client
      .from(table)
      .delete()
      .match(match);
    
    if (error) {
      throw new Error(`Failed to delete from ${table}: ${error.message}`);
    }
  }
  
  /**
   * Execute a raw SQL query
   * 
   * @param query The SQL query to execute
   * @param params The parameters for the query
   * @returns A promise that resolves to the query result
   */
  async query(query: string, params: any[] = []): Promise<any> {
    const { data, error } = await this.client.rpc('execute_sql', {
      query_text: query,
      query_params: params
    });
    
    if (error) {
      throw new Error(`Failed to execute query: ${error.message}`);
    }
    
    return data;
  }
  
  /**
   * Get the Supabase client
   * 
   * @returns The Supabase client
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}
