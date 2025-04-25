# Marvin Blogger System Architecture

The following diagram illustrates the architecture of the Marvin Blogger system, showing the key components and their interactions.

```mermaid
graph TD
    subgraph "Marvin Blogger Agent"
        BA[BloggerAgent] --> CB[ContextBuilder]
        BA --> NC[NarrativeComposer]
        BA --> MB[MetadataBuilder]
        BA --> PA[PublisherAdapter]
        BA --> AL[ActivityLogger]
        
        CB --> SS1[SupabaseService]
        CB --> QS[QdrantService]
        
        NC --> SS2[SupabaseService]
        NC --> OpenAI[OpenAI API]
        
        MB --> SS3[SupabaseService]
        MB --> OpenAI2[OpenAI API]
        
        PA --> SS4[SupabaseService]
        PA --> WP[WordPress API]
        
        AL --> SS5[SupabaseService]
        
        CM[ConfigManager] --> BA
        CM --> CB
        CM --> NC
        CM --> MB
        CM --> PA
        CM --> AL
        
        EH[ErrorHandler] --> SS6[SupabaseService]
    end
    
    subgraph "Data Sources"
        DB[(Supabase DB)] <--> SS1
        DB <--> SS2
        DB <--> SS3
        DB <--> SS4
        DB <--> SS5
        DB <--> SS6
        
        VDB[(Qdrant Vector DB)] <--> QS
        
        Tweets[Tweets Cache] --> CB
        Images[Images] --> CB
        Character[Character Files] --> CB
        Memory[Memory Insights] --> QS
    end
    
    subgraph "Web Interface"
        WS[Web Server] --> BA
        WS --> SS7[SupabaseService]
        UI[User Interface] <--> WS
        
        SS7 <--> DB
    end
    
    subgraph "Scheduler"
        Cron[Scheduler] --> BA
    end
    
    subgraph "External Services"
        OpenAI
        WP
    end
    
    classDef primary fill:#3498db,stroke:#2980b9,color:white;
    classDef secondary fill:#2ecc71,stroke:#27ae60,color:white;
    classDef data fill:#f1c40f,stroke:#f39c12,color:white;
    classDef external fill:#e74c3c,stroke:#c0392b,color:white;
    classDef ui fill:#9b59b6,stroke:#8e44ad,color:white;
    
    class BA,CB,NC,MB,PA,AL primary;
    class SS1,SS2,SS3,SS4,SS5,SS6,SS7,QS,CM,EH secondary;
    class DB,VDB,Tweets,Images,Character,Memory data;
    class OpenAI,OpenAI2,WP external;
    class WS,UI,Cron ui;
```

## Component Descriptions

### Core Components

- **BloggerAgent**: The main controller class that orchestrates the blog post generation process
- **ContextBuilder**: Gathers content from various sources to build context for blog generation
- **NarrativeComposer**: Transforms context into coherent narrative content using OpenAI
- **MetadataBuilder**: Creates tags, categories, and other metadata for the blog post
- **PublisherAdapter**: Handles saving content to the database and publishing to external platforms
- **ActivityLogger**: Tracks all system activities for monitoring and debugging
- **ConfigManager**: Manages configuration settings and environment variables
- **ErrorHandler**: Provides robust error management to ensure system stability
- **ServiceContainer**: Dependency injection container (not shown in diagram for clarity)

### Data Services

- **SupabaseService**: Interface to the Supabase database for data storage and retrieval
- **QdrantService**: Interface to the Qdrant vector database for semantic search and retrieval

### Data Sources

- **Supabase DB**: PostgreSQL database storing blog posts, tweets, images, character files, etc.
- **Qdrant Vector DB**: Vector database storing embeddings for memory insights
- **Tweets Cache**: Collection of recent tweets used as input for blog generation
- **Images**: Collection of images with associated metadata
- **Character Files**: Character information defining Marvin's voice and personality
- **Memory Insights**: Contextual information retrieved from the vector database

### Web Interface

- **Web Server**: Express.js server providing a web interface for viewing and creating blog posts
- **User Interface**: Browser-based UI for interacting with the system

### External Services

- **OpenAI API**: Used for generating blog content and metadata
- **WordPress API**: Optional integration for publishing blog posts to WordPress

## Data Flow

1. The process begins either through the scheduler (every 6 hours) or via the web interface
2. BloggerAgent orchestrates the entire process
3. ContextBuilder gathers tweets, images, character information, and memory insights
4. NarrativeComposer uses this context to generate blog content via OpenAI
5. MetadataBuilder creates appropriate metadata for the blog post
6. PublisherAdapter saves the blog post to the database and optionally publishes it
7. ActivityLogger records the activity for monitoring purposes

## Key Features

- **Multi-source Integration**: Combines tweets, images, character information, and memory insights
- **Sophisticated Content Generation**: Uses OpenAI with character-specific prompts
- **Robust Error Handling**: Comprehensive error management with logging
- **Flexible Configuration**: Configurable through environment variables
- **Web Interface**: User-friendly interface for viewing and creating blog posts
- **Scheduled Operation**: Automatic blog post generation on a schedule
