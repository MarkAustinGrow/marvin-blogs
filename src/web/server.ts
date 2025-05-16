import express from 'express';
import path from 'path';
import morgan from 'morgan';
import { config } from 'dotenv';
import { BloggerAgent } from '../../agents/blogger/BloggerAgent';
import { BlogPost } from '../../agents/blogger/types/BlogPost';
import { ServiceContainer } from '../../agents/blogger/ServiceContainer';
import { SupabaseService } from '../../agents/blogger/SupabaseService';
import { ActivityLogger } from '../../agents/blogger/ActivityLogger';

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
// Point to the original views directory since the compiled JS is in dist/src/web
app.set('views', path.join(__dirname, '../../../src/web/views'));
app.set('view engine', 'ejs');

// Create blogger agent
const bloggerAgent = new BloggerAgent();
// Get the SupabaseService from the container that BloggerAgent created
const supabaseService = bloggerAgent['container'].resolve<SupabaseService>('supabaseService');

// Routes
app.get('/', async (req, res) => {
  try {
    // Get blog posts from database
    const blogPosts = await supabaseService.select('blog_posts', '*');
    
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
    const blogPosts = await supabaseService.select('blog_posts', '*', { match: { id } });
    
    if (blogPosts.length === 0) {
      return res.status(404).render('error', { 
        title: 'Not Found',
        message: 'Blog post not found'
      });
    }
    
    const blogPost = blogPosts[0];
    
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

// Endpoint to mark a blog post for tweeting
app.post('/mark-for-tweet/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get blog post from database to verify it exists and is in the right state
    const blogPosts = await supabaseService.select('blog_posts', '*', { match: { id } });
    
    if (blogPosts.length === 0) {
      return res.status(404).render('error', { 
        title: 'Not Found',
        message: 'Blog post not found'
      });
    }
    
    const blogPost = blogPosts[0];
    
    // Only published posts can be marked for tweeting
    if (blogPost.status !== 'published') {
      return res.status(400).render('error', { 
        title: 'Invalid Operation',
        message: 'Only published blog posts can be marked for tweeting'
      });
    }
    
    // Update blog post status to 'ready_to_tweet'
    await supabaseService.update(
      'blog_posts',
      { status: 'ready_to_tweet' },
      { id }
    );
    
    // Log the activity
    const activityLogger = bloggerAgent['container'].resolve<ActivityLogger>('activityLogger');
    await activityLogger.logActivity('mark_for_tweet', { blogPostId: id, title: blogPost.title }, 'blog_post');
    
    // Redirect back to the blog post
    res.redirect(`/view/${id}`);
  } catch (error) {
    console.error('Error marking blog post for tweet:', error);
    res.status(500).render('error', { 
      title: 'Error',
      message: 'Error marking blog post for tweet'
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Marvin Blogger Agent web interface running at http://localhost:${port}`);
});
