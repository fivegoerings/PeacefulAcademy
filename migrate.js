import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as schema from './db/schema.js';

// Use Netlify's automatic database URL handling
const sql = neon();
const db = drizzle(sql, { schema });

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Run migrations
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
