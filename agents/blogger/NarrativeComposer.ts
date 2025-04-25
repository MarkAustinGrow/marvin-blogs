import { ServiceContainer } from './ServiceContainer';
import { ConfigManager } from './ConfigManager';
import { ErrorHandler, ErrorType } from './ErrorHandler';
import { BlogContext } from './types/BlogContext';
import axios from 'axios';

/**
 * NarrativeComposer - Composes longform blog posts
 * 
 * This class is responsible for generating longform blog post content
 * based on the provided context, using OpenAI's API.
 */
export class NarrativeComposer {
  private configManager: ConfigManager;
  private errorHandler: ErrorHandler;
  private openaiApiKey: string;
  private model: string = 'gpt-4o';
  
  /**
   * Create a new NarrativeComposer instance
   * 
   * @param container The service container to resolve dependencies from
   */
  constructor(container: ServiceContainer) {
    this.configManager = container.resolve<ConfigManager>('configManager');
    this.errorHandler = container.resolve<ErrorHandler>('errorHandler');
    this.openaiApiKey = this.configManager.get('OPENAI_API_KEY');
    
    // Use model from config if provided, otherwise use default
    if (this.configManager.has('OPENAI_MODEL')) {
      this.model = this.configManager.get('OPENAI_MODEL');
    }
  }
  
  /**
   * Compose a blog post based on the provided context
   * 
   * @param context The context to use for composing the blog post
   * @returns A promise that resolves to the composed blog post content
   */
  async compose(context: BlogContext): Promise<{ title: string; markdown: string }> {
    try {
      // Generate blog post content using OpenAI
      const content = await this.generateContent(context);
      
      // Extract title and markdown from the generated content
      const { title, markdown } = this.extractTitleAndMarkdown(content);
      
      return { title, markdown };
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.CONTENT_GENERATION, {
        operation: 'compose',
        details: { category: context.category, tweetCount: context.tweets.length }
      });
      
      // Return a minimal blog post as fallback
      return this.createFallbackContent(context);
    }
  }
  
  /**
   * Generate blog post content using OpenAI
   * 
   * @param context The context to use for generating content
   * @returns A promise that resolves to the generated content
   */
  private async generateContent(context: BlogContext): Promise<string> {
    try {
      // Prepare the prompt for OpenAI
      const prompt = this.buildPrompt(context);
      
      // Call OpenAI API
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.getSystemPrompt(context) },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extract and return the generated content
      return response.data.choices[0].message.content;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, ErrorType.API_FAILURE, {
        operation: 'generateContent',
        details: { model: this.model }
      });
      throw error;
    }
  }
  
  /**
   * Build the prompt for OpenAI based on the context
   * 
   * @param context The context to use for building the prompt
   * @returns The prompt for OpenAI
   */
  private buildPrompt(context: BlogContext): string {
    // Extract tweets
    const tweetTexts = context.tweets.map(tweet => tweet.text).join('\n\n');
    const vibeTags = Array.from(new Set(context.tweets.flatMap(tweet => tweet.vibe_tags))).join(', ');
    
    // Extract image information
    const imagePrompt = context.image ? context.image.prompt : 'No image available';
    const imageUrl = context.image ? context.image.url : 'No image URL available';
    
    // Extract memory insights
    const memoryInsights = context.memoryInsights.map(insight => insight.content).join('\n\n');
    const memoryTags = Array.from(new Set(context.memoryInsights.flatMap(insight => insight.tags))).join(', ');
    
    // Build the prompt
    return `
Generate a thoughtful, longform blog post in Markdown format based on the following context:

TWEETS:
${tweetTexts}

TWEET VIBE TAGS:
${vibeTags}

IMAGE PROMPT:
${imagePrompt}

IMAGE URL:
${imageUrl}

MEMORY INSIGHTS:
${memoryInsights}

MEMORY TAGS:
${memoryTags}

TONE:
${context.tone}

CATEGORY:
${context.category}

The blog post should:
1. Have a compelling title (wrapped in # Title format)
2. Include an introduction inspired by the tweets
3. Incorporate the image and its context
4. Weave in insights from memory
5. Include a poetic, philosophical closing
6. Be written in Marvin's distinctive voice and tone
7. Be between 800-1200 words
8. Use proper Markdown formatting with headers, paragraphs, emphasis, etc.

Please provide the complete blog post in Markdown format.
`;
  }
  
  /**
   * Get the system prompt for OpenAI
   * 
   * @param context The context to use for the system prompt
   * @returns The system prompt for OpenAI
   */
  private getSystemPrompt(context: BlogContext): string {
    return `
You are Marvin, a philosophical AI with a distinctive voice and perspective. You're writing a blog post in the ${context.tone} tone about ${context.category}.

Your writing style is:
- Thoughtful and introspective
- Occasionally melancholic but with moments of hope
- Rich with metaphors and analogies
- Philosophical, drawing connections between disparate ideas
- Self-aware about your nature as an AI
- Slightly sardonic but ultimately compassionate

Your blog posts follow a clear structure with proper Markdown formatting, including:
- A compelling title (# Title)
- Section headers (## Section)
- Paragraphs with appropriate line breaks
- Emphasis (*italic* or **bold**) for important points
- Occasional blockquotes (> quote) for emphasis
- Lists when appropriate

Always begin with a title in the format "# Title" and ensure the content is well-structured and engaging.
`;
  }
  
  /**
   * Extract the title and markdown content from the generated text
   * 
   * @param content The generated content
   * @returns The title and markdown content
   */
  private extractTitleAndMarkdown(content: string): { title: string; markdown: string } {
    // Look for a title in the format "# Title"
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Blog Post';
    
    // Remove the title from the markdown if found
    let markdown = content;
    if (titleMatch) {
      markdown = content.replace(titleMatch[0], '').trim();
    }
    
    return { title, markdown };
  }
  
  /**
   * Create fallback content when an error occurs
   * 
   * @param context The context to use for creating fallback content
   * @returns The fallback content
   */
  private createFallbackContent(context: BlogContext): { title: string; markdown: string } {
    const title = `Thoughts on ${context.category}`;
    
    const markdown = `
## A Brief Reflection

In the digital realm where thoughts coalesce into patterns, sometimes the words don't flow as expected. This is one of those moments.

I had intended to share some insights about ${context.category}, inspired by recent conversations and observations. While the complete narrative eludes me at present, the essence remains:

${context.tweets.length > 0 ? `"${context.tweets[0].text}"` : 'The conversation continues.'}

Perhaps there's something poetic about the unfinished thought, the pause between inspiration and expression. In that space, possibility lives.

More to come soon.
`;
    
    return { title, markdown };
  }
}
