import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as schema from './db/schema.js';

// Environment-specific database URL handling
function getDatabaseUrl() {
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
const databaseUrl = getDatabaseUrl();
const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    console.log('Using database URL:', databaseUrl ? 'Environment-specific URL' : 'Fallback URL');
    
    // Run migrations
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
