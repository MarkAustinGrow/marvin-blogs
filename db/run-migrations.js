require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY environment variables are required');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Get migration files
const migrationsDir = path.join(__dirname, 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Sort to ensure migrations run in order

// Run migrations
async function runMigrations() {
  console.log('Running migrations...');
  
  for (const file of migrationFiles) {
    console.log(`Running migration: ${file}`);
    
    // Read migration file
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      // Execute SQL
      const { error } = await supabase.rpc('execute_sql', { query_text: sql });
      
      if (error) {
        console.error(`Error running migration ${file}:`, error);
        process.exit(1);
      }
      
      console.log(`Migration ${file} completed successfully`);
    } catch (error) {
      console.error(`Error running migration ${file}:`, error);
      process.exit(1);
    }
  }
  
  console.log('All migrations completed successfully');
}

// Run migrations
runMigrations().catch(console.error);
