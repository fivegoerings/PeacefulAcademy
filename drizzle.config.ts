import { defineConfig } from 'drizzle-kit';

// Get the current Netlify context
const getNetlifyContext = () => process.env.NETLIFY_CONTEXT || 'development';

// Get the appropriate database URL based on the current context
const getDatabaseUrl = () => {
  const context = getNetlifyContext();
  
  switch (context) {
    case 'production':
      return process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    
    case 'deploy-preview':
      return process.env.NETLIFY_DATABASE_URL_PREVIEW || process.env.DATABASE_URL_PREVIEW || process.env.NETLIFY_DATABASE_URL;
    
    case 'branch-deploy':
      return process.env.NETLIFY_DATABASE_URL_BRANCH || process.env.DATABASE_URL_BRANCH || process.env.NETLIFY_DATABASE_URL;
    
    case 'development':
    default:
      return process.env.NETLIFY_DATABASE_URL_DEV || process.env.DATABASE_URL_DEV || process.env.NETLIFY_DATABASE_URL;
  }
};

export default defineConfig({
    dialect: 'postgresql',
    dbCredentials: {
        url: getDatabaseUrl()!
    },
    schema: './db/schema.ts',
    /**
     * Never edit the migrations directly, only use drizzle.
     * There are scripts in the package.json "db:generate" and "db:migrate" to handle this.
     */
    out: './migrations'
});