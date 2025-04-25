-- Blog posts table with indexing
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  markdown TEXT,
  html TEXT,
  image_url TEXT,
  category TEXT,
  tags TEXT[],
  tone TEXT,
  memory_refs UUID[],
  character_id UUID REFERENCES character_files(id),
  post_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'draft',
  version INT DEFAULT 1
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);

-- Error logging table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT,
  error_type TEXT,
  message TEXT,
  stack TEXT,
  context JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Activity logging table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT,
  action TEXT,
  category TEXT,
  details JSONB,
  version INT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_agent_name ON activity_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
