import express from 'express';
import path from 'path';
import morgan from 'morgan';
import { config } from 'dotenv';
import { BloggerAgent } from '../../agents/blogger/BloggerAgent';
import { BlogPost } from '../../agents/blogger/types/BlogPost';

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

// Create blogger agent
const bloggerAgent = new BloggerAgent();

// Routes
app.get('/', async (req, res) => {
  try {
    // Get blog posts from database
    // We'll need to access the supabaseService through the blogger agent
    // For now, we'll just render an empty array
    const blogPosts: BlogPost[] = [];
    
    res.render('index', { 
      title: 'Marvin Blogger Agent',
      blogPosts
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.render('index', { 
      title: 'Marvin Blogger Agent',
      blogPosts: [] as BlogPost[],
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
    // For now, we'll just render a not found error
    return res.status(404).render('error', { 
      title: 'Not Found',
      message: 'Blog post not found'
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
