import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';

// Environment-specific database URL handling
export function getDatabaseUrl() {
  const context = process.env.CONTEXT || 'unknown';
  
  // For production, use the production database URL
  if (context === 'production') {
    return process.env.PROD_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  }
  
  // For non-production environments (dev, deploy-preview, branch-deploy), use the non-prod database URL
  if (context !== 'production') {
    return process.env.NONPROD_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  }
  
  // Fallback to Netlify's automatic database URL
  return process.env.NETLIFY_DATABASE_URL;
}

// Initialize database connection with environment-specific URL
export function createDatabaseConnection() {
  const databaseUrl = getDatabaseUrl();
  const sqlClient = neon(databaseUrl);
  const db = drizzle(sqlClient);
  
  return {
    sql: sqlClient,
    db,
    databaseUrl,
    getDatabaseUrl: () => databaseUrl
  };
}

// Get environment information for debugging
export function getEnvironmentInfo() {
  const context = process.env.CONTEXT || 'unknown';
  const isNonProd = context !== 'production';
  const isProd = context === 'production';
  
  let environment = 'UNKNOWN';
  if (isNonProd) {
    environment = 'NON-PROD';
  } else if (isProd) {
    environment = 'PROD';
  }
  
  return {
    environment,
    context,
    contextType: isNonProd ? 'Non-Production' : 'Production',
    isNonProd,
    isProd,
    isDev: isNonProd, // Backward compatibility
    nodeEnv: process.env.NODE_ENV || 'unknown',
    databaseUrl: context === 'production' ? 'PROD_DATABASE_URL' : 'NONPROD_DATABASE_URL',
    prodDbUrlSet: !!process.env.PROD_DATABASE_URL,
    nonprodDbUrlSet: !!process.env.NONPROD_DATABASE_URL,
    netlifyDbUrlSet: !!process.env.NETLIFY_DATABASE_URL,
    netlifyEnv: process.env.NETLIFY ? 'Yes' : 'No',
    deployUrl: process.env.URL || 'Not set'
  };
}
