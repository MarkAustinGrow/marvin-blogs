import { BloggerAgent } from './agents/blogger';

/**
 * Marvin Blogger Agent Entry Point
 * 
 * This file serves as the entry point for the Marvin Blogger Agent.
 * It creates and runs the BloggerAgent, which generates blog posts
 * based on Marvin's tweets, art, memory, and cultural signals.
 */

async function main() {
  try {
    console.log('Starting Marvin Blogger Agent...');
    
    // Create and run the blogger agent
    const agent = new BloggerAgent();
    await agent.run();
    
    console.log('Marvin Blogger Agent completed successfully');
  } catch (error) {
    console.error('Error running Marvin Blogger Agent:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
