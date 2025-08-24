import { defineConfig } from 'drizzle-kit';

const context = process.env.CONTEXT || (process.env.NETLIFY_LOCAL === 'true' ? 'dev' : 'production');
const databaseUrl =
	process.env.NETLIFY_DATABASE_URL ||
	(context === 'dev' ? process.env.NETLIFY_DATABASE_URL_DEV : undefined) ||
	(context === 'deploy-preview' || context === 'branch-deploy' ? process.env.NETLIFY_DATABASE_URL_PREVIEW : undefined) ||
	process.env.DATABASE_URL;

export default defineConfig({
    dialect: 'postgresql',
    dbCredentials: {
        url: databaseUrl!
    },
    schema: './db/schema.ts',
    /**
     * Never edit the migrations directly, only use drizzle.
     * There are scripts in the package.json "db:generate" and "db:migrate" to handle this.
     */
    out: './migrations'
});