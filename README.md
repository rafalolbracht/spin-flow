# Spin Flow

## Project Description

Spin Flow is a web application designed for table tennis coaches to record match progress in real-time and generate AI-powered summaries and training recommendations. The MVP version operates exclusively online, is optimized for smartphones in portrait mode (with support for tablets and laptops), and supports single coach accounts. Key features include live point and set recording, automatic AI-generated match reports and recommendations, and secure public sharing of completed matches via links.

The application addresses challenges in remembering match details during tournaments, enabling coaches to track points, sets, and tags (e.g., service errors, footwork issues) accurately. It ensures proper serving rules compliance and provides durable match state persistence. The interface and reports are in Polish, with no multilingual support in MVP.

## Tech Stack

- **Frontend:**
  - Angular 20
  - PrimeNG 20
  - TailwindCSS 4 (integrated with PrimeNG)

- **Backend:**
  - Astro (for API endpoints and server logic)

- **Data and Authentication:**
  - Supabase (Postgres database)
  - Supabase Auth (Google login)
  - Row-Level Security (RLS) for data access control

- **AI Integration:**
  - OpenRouter (for accessing AI models)

- **Hosting and CI/CD:**
  - Cloudflare Pages (for hosting and serverless functions)
  - GitHub Actions (for automated builds, testing, and deployment)

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
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

     # OpenRouter API (for AI features)
     OPENROUTER_API_KEY=your-openrouter-api-key-here

     # Site URL (for public share links)
     # Development: http://localhost:4300
     # Production: https://spin-flow.app
     SITE_URL=http://localhost:4300
     ```

   - Refer to Supabase and OpenRouter documentation for obtaining API keys.

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

## Project Scope

### In MVP Scope:

- Live match recording (points, sets, tags) with serving rules enforcement.
- Single coach accounts with Google login via Supabase.
- Match lists with filtering and deletion.
- AI-generated summaries and recommendations via OpenRouter.
- Public sharing of completed matches via secure links.
- Responsive design optimized for mobile (portrait), with tablet/desktop support.
- Basic analytics for logins and completed matches.

## Project Status

The project is currently in development as an MVP. Contributions and feedback are welcome. Check the issues tab for ongoing tasks and bugs.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
