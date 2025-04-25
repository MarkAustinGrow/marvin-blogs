export interface BlogContext {
  tweets: Tweet[];
  image?: {
    url: string;
    prompt: string;
  };
  memoryInsights: MemoryInsight[];
  tone: string;
  category: string;
  character?: any; // Character information from character_files table
}

export interface Tweet {
  id: string;
  text: string;
  url: string;
  created_at: string;
  vibe_tags: string[];
}

export interface MemoryInsight {
  content: string;
  tags: string[];
  timestamp: string;
}
