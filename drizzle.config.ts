import { defineConfig } from 'drizzle-kit';

// Get the current platform environment
const getPlatformEnvironment = () => process.env.NODE_ENV || 'development';

// Get the current Netlify context
const getNetlifyContext = () => process.env.NETLIFY_CONTEXT || 'development';

// Determine the effective environment by combining NETLIFY_CONTEXT and NODE_ENV
const getEffectiveEnvironment = () => {
  const netlifyContext = getNetlifyContext();
  const platformEnv = getPlatformEnvironment();
  
  // If NODE_ENV is explicitly set to 'prod', treat as production
  if (platformEnv === 'prod') {
    return 'production';
  }
  
  // If NODE_ENV is explicitly set to 'dev', treat as development
  if (platformEnv === 'dev') {
    return 'development';
  }
  
  // Otherwise, use NETLIFY_CONTEXT
  return netlifyContext;
};

// Get the appropriate database URL based on the current context
const getDatabaseUrl = () => {
  const context = getEffectiveEnvironment();
  
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