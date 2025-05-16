export interface BlogPost {
  id?: string;
  title: string;
  markdown: string;
  html?: string;
  image_url?: string;
  category: string;
  tags: string[];
  tone: string;
  memory_refs?: string[];
  character_id: string;
  post_url?: string;
  created_at?: string;
  status: 'draft' | 'published' | 'ready_to_tweet' | 'tweeted' | 'archived';
  version: number;
}
