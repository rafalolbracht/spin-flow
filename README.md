# Spin Flow

## Project Description

Spin Flow is a web application designed for table tennis coaches to record match progress in real-time and generate AI-powered summaries and training recommendations. The MVP version operates exclusively online, is optimized for smartphones in portrait mode (with support for tablets and laptops), and supports single coach accounts. Key features include live point and set recording, automatic AI-generated match reports and recommendations, and secure public sharing of completed matches via links.

The application addresses challenges in remembering match details during tournaments, enabling coaches to track points, sets, and tags (e.g., service errors, footwork issues) accurately. It ensures proper serving rules compliance and provides durable match state persistence. The interface and reports are in Polish, with no multilingual support in MVP.

## Tech Stack

- **Frontend Framework:**
  - Angular 20.3.13
  - PrimeNG 20.3.0 (UI components)
  - TailwindCSS 4.1.17 (integrated with PrimeNG)
  - @analogjs/astro-angular 2.1.0 (Angular-Astro integration)

- **Backend Framework:**
  - Astro 5.16.0 (server-side rendering, API routes, and middleware)
  - TypeScript (latest)

- **Data and Authentication:**
  - Supabase (PostgreSQL database)
  - Supabase Auth (Google OAuth login)
  - Row-Level Security (RLS) for data access control

- **AI Integration:**
  - OpenRouter API (AI model access)
  - Primary model: xAI Grok-4.1-fast
  - Fallback model: OpenAI GPT-4o-mini

- **Hosting and Infrastructure:**
  - Cloudflare Pages (hosting and serverless functions)
  - GitHub Actions (automated CI/CD pipeline)

- **Development Tools:**
  - ESLint + Prettier (code linting and formatting)
  - Husky + lint-staged (pre-commit hooks)
  - Node.js 22.21.1

This stack enables rapid development, scalability, and cost efficiency while maintaining security through managed services.

## Getting Started Locally

To set up and run the project locally:

1. **Prerequisites:**
   - Node.js (version specified in `.nvmrc`: 22.21.1). Use [nvm](https://github.com/nvm-sh/nvm) to install and manage Node versions:
     ```
     nvm install
     nvm use
     ```
   - npm (included with Node.js)

2. **Clone the Repository:**

   ```
   git clone https://github.com/your-repo/spin-flow.git
   cd spin-flow
   ```

3. **Install Dependencies:**

   ```
   npm install
   ```

4. **Configure Environment Variables:**
   - Create a `.env` file in the root directory.
   - Add the following variables (required for authentication, database access, AI integration, and public sharing):

     ```
     # Supabase Configuration
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_KEY=your-anon-key-here
     SUPABASE_SERVICE_KEY=your-service-role-key-here

     # OpenRouter API (for AI features)
     OPENROUTER_API_KEY=your-openrouter-api-key-here

     # Site URL (for public share links)
     # Development: http://localhost:4300
     # Production: https://spin-flow.app
     SITE_URL=http://localhost:4300
     ```

   - **Supabase Setup**: Create a new project at [supabase.com](https://supabase.com), enable Google OAuth, and run the migrations from `supabase/migrations/`
   - **OpenRouter Setup**: Get an API key from [openrouter.ai](https://openrouter.ai) for AI functionality
   - **Google OAuth**: Configure Google OAuth in Supabase Auth settings

5. **Run the Development Server:**
   ```
   npm run dev
   ```
   The app will be available at `http://localhost:4300`.

Note: Ensure you have accounts set up with Supabase and OpenRouter for full functionality. The app requires an internet connection for backend services.

## Available Scripts

In the project directory, you can run:

- `npm run dev`: Starts the development server (opens in browser at port 4300).
- `npm run build`: Builds the app for production.
- `npm run preview`: Previews the built app locally.
- `npm run astro`: Runs Astro CLI commands.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run lint:fix`: Lints and auto-fixes issues.
- `npm run format`: Formats code using Prettier.
- `npm run prepare`: Installs Husky for git hooks.

Lint-staged is configured to run ESLint and Prettier on staged files before commits.

## Deployment & CI/CD

### Cloudflare Pages Deployment

The application is configured for deployment on Cloudflare Pages with the following setup:

- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Node.js Version**: 22.21.1 (matches `.nvmrc`)
- **Environment Variables**: Same as development (Supabase, OpenRouter, Site URL)

### GitHub Actions

Automated CI/CD pipeline includes:

- **Code Quality**: ESLint and Prettier checks
- **Type Checking**: TypeScript compilation verification
- **Build Verification**: Production build testing
- **Security**: Dependency vulnerability scanning

### Supabase Integration

Database migrations are managed through Supabase CLI. To apply migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Core Features

### Match Management

- **Live Match Recording**: Real-time point-by-point recording during matches
- **Set Management**: Automatic set progression with proper tennis rules
- **Point Tagging**: Mark specific issues (service errors, footwork problems, etc.)
- **Serving Rules Enforcement**: Automatic server determination and validation

### AI-Powered Analysis

- **Match Summaries**: AI-generated comprehensive match reports
- **Training Recommendations**: Personalized coaching suggestions based on match data
- **Performance Insights**: Automated analysis of player strengths and weaknesses

### Data Management

- **Match History**: Complete match archive with filtering and search
- **Coach Notes**: Ability to add personal observations and comments
- **Data Export**: Public sharing via secure tokenized links

### User Experience

- **Mobile-First Design**: Optimized for smartphones in portrait mode with dedicated responsive breakpoints
- **Dark Mode**: Complete dark/light theme support with system preference detection and localStorage persistence
- **Responsive Web Design**: Adaptive layouts for smartphones (≤375px), tablets, and desktop devices
- **Google Authentication**: Secure single-sign-on via Supabase Auth

#### UI/UX Features

**Dark Mode Implementation:**

- Automatic system preference detection
- Manual theme toggle with persistent storage
- Synchronized theming across PrimeNG components and Tailwind CSS
- Optimized color palettes for both light and dark modes

**Responsive Design Details:**

- **Smartphone (≤375px)**: Full-width dialogs, compact toast notifications, optimized touch targets
- **Mobile (≤640px)**: Responsive PrimeNG components, mobile-optimized spacing and typography
- **Tablet/Desktop (≥768px)**: Expanded layouts, multi-column displays, enhanced visual hierarchy
- **Container Constraints**: Max-width limits (28rem mobile, 42rem+ desktop) for optimal readability

### Analytics & Monitoring

- **Usage Analytics**: Track logins, match creation, and completion events
- **Performance Metrics**: Basic statistics on app usage and user engagement

## Project Architecture

### Directory Structure

```
├── src/
│   ├── components/           # Angular components (dynamic UI)
│   │   ├── create-match-wizard/
│   │   ├── error-page/
│   │   ├── landing-page/
│   │   ├── live-match/       # Real-time match recording components
│   │   │   ├── finish-match-dialog/
│   │   │   ├── finish-set-dialog/
│   │   │   ├── live-match-page/
│   │   │   ├── match-control-actions/
│   │   │   ├── point-scoring-buttons/
│   │   │   ├── score-display-card/
│   │   │   ├── tag-selection-panel/
│   │   │   └── services/
│   │   ├── match-summary/    # Match review and AI report components
│   │   │   ├── ai-report-section/
│   │   │   ├── coach-notes-accordion/
│   │   │   ├── dialogs/
│   │   │   └── match-summary-page/
│   │   ├── matches/          # Match list and management
│   │   ├── public-match/     # Public match sharing components
│   │   └── shared/           # Reusable UI components
│   ├── db/                   # Supabase client and database types
│   ├── layouts/              # Astro page layouts
│   ├── lib/
│   │   ├── config/           # Application configuration
│   │   ├── interceptors/     # HTTP interceptors
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── services/         # Business logic services
│   │   │   ├── ai.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── dictionary.service.ts
│   │   │   ├── match.service.ts
│   │   │   ├── openrouter/    # AI integration services
│   │   │   ├── point.service.ts
│   │   │   ├── public-match.service.ts
│   │   │   ├── set.service.ts
│   │   │   ├── share.service.ts
│   │   │   └── theme.service.ts
│   │   └── utils/            # Utility functions
│   ├── middleware/           # Astro middleware
│   ├── pages/                # Astro pages and API routes
│   │   ├── api/              # REST API endpoints
│   │   │   ├── analytics/
│   │   │   ├── dictionary/
│   │   │   ├── matches/
│   │   │   ├── public/
│   │   │   ├── sets/
│   │   │   └── tags/
│   │   └── matches/          # Match-related pages
│   ├── styles/               # Global styles
│   ├── theme/                # PrimeNG theme configuration
│   └── types.ts              # Shared TypeScript types and DTOs
├── supabase/                 # Database configuration and migrations
├── public/                   # Static assets
└── dist/                     # Build output
```

### API Architecture

The application uses a REST API built with Astro server functions:

- **Authentication**: Supabase session-based auth with RLS policies
- **Validation**: Zod schemas for request/response validation
- **Error Handling**: Structured error responses with proper HTTP status codes
- **Pagination**: Server-side pagination for list endpoints
- **Response Format**: Consistent `{ data: T }` envelope pattern

#### Key API Endpoints

- `GET/POST /api/matches` - Match CRUD operations
- `GET/POST /api/sets/{id}/points` - Point recording and management
- `POST /api/matches/{id}/ai-report` - AI analysis generation
- `POST /api/matches/{id}/share` - Public link generation
- `GET /api/public/matches/{token}` - Public match access

### Database Schema

The application uses PostgreSQL via Supabase with the following main tables:

- **matches**: Match metadata and configuration
- **sets**: Set progression within matches
- **points**: Individual points with timestamps
- **tags**: Categorized labels for point analysis
- **point_tags**: Many-to-many relationship between points and tags
- **matches_ai_reports**: AI-generated summaries and recommendations
- **matches_public_share**: Secure tokens for public match sharing
- **analytics_events**: Usage tracking and metrics

## Project Status

The project is currently in development as an MVP. Contributions and feedback are welcome. Check the issues tab for ongoing tasks and bugs.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
