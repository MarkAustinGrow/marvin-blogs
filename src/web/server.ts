import express from 'express';
import path from 'path';
import morgan from 'morgan';
import { config } from 'dotenv';
import { ServiceContainer } from '../agents/blogger/ServiceContainer';
import { SupabaseService } from '../agents/blogger/SupabaseService';
import { ConfigManager } from '../agents/blogger/ConfigManager';
import { ErrorHandler } from '../agents/blogger/ErrorHandler';
import { BloggerAgent } from '../agents/blogger/BloggerAgent';

// Load environment variables
config();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Set up middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Create service container and register services
const container = new ServiceContainer();
const configManager = new ConfigManager();
container.register('configManager', configManager);

const errorHandler = new ErrorHandler(null);
container.register('errorHandler', errorHandler);

const supabaseService = new SupabaseService(configManager);
container.register('supabaseService', supabaseService);

// Update error handler with Supabase service
(errorHandler as any).supabaseService = supabaseService;

// Create blogger agent
const bloggerAgent = new BloggerAgent(container);

// Routes
app.get('/', async (req, res) => {
  try {
    // Get blog posts from database
    const blogPosts = await supabaseService.select('blog_posts', '*', {});
    
    res.render('index', { 
      title: 'Marvin Blogger Agent',
      blogPosts
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.render('index', { 
      title: 'Marvin Blogger Agent',
      blogPosts: [],
      error: 'Error fetching blog posts'
    });
  }
});

app.get('/create', (req, res) => {
  res.render('create', { title: 'Create Blog Post' });
});

app.post('/create', async (req, res) => {
  try {
    // Run the blogger agent
    console.log('Manually triggering blog post creation...');
    await bloggerAgent.run();
    
    res.redirect('/');
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.render('create', { 
      title: 'Create Blog Post',
      error: 'Error creating blog post'
    });
  }
});

app.get('/view/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get blog post from database
    const [blogPost] = await supabaseService.select('blog_posts', '*', { id });
    
    if (!blogPost) {
      return res.status(404).render('error', { 
        title: 'Not Found',
        message: 'Blog post not found'
      });
    }
    
    res.render('view', { 
      title: blogPost.title,
      blogPost
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Error fetching blog post'
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Marvin Blogger Agent web interface running at http://localhost:${port}`);
});
