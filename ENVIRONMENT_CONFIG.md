# Environment Configuration with NETLIFY_CONTEXT and NODE_ENV

This project uses both `NETLIFY_CONTEXT` and `NODE_ENV` environment variables to automatically determine which database environment to use based on the deployment context and platform configuration.

## How It Works

The system uses two environment variables to determine the effective environment:

### NETLIFY_CONTEXT
Automatically set by Netlify and contains one of the following values:
- `production` - Production deployments
- `deploy-preview` - Pull request preview deployments
- `branch-deploy` - Branch deployments
- `development` - Local development (default fallback)

### NODE_ENV
Platform environment variable that can override NETLIFY_CONTEXT:
- `prod` - Forces production environment (overrides NETLIFY_CONTEXT)
- `dev` - Forces development environment (overrides NETLIFY_CONTEXT)
- Any other value - Uses NETLIFY_CONTEXT as fallback

### Priority Order
1. If `NODE_ENV=prod` → Use production environment
2. If `NODE_ENV=dev` → Use development environment
3. Otherwise → Use `NETLIFY_CONTEXT` value

## Environment Variables Setup

### Required Environment Variables

Set these environment variables in your Netlify dashboard under **Site settings > Environment variables**:

#### Production Environment
```
NETLIFY_DATABASE_URL=postgresql://user:password@host:port/database
```

#### Preview Environment (Optional)
```
NETLIFY_DATABASE_URL_PREVIEW=postgresql://user:password@host:port/preview_database
```

#### Branch Environment (Optional)
```
NETLIFY_DATABASE_URL_BRANCH=postgresql://user:password@host:port/branch_database
```

#### Development Environment (Optional)
```
NETLIFY_DATABASE_URL_DEV=postgresql://user:password@host:port/dev_database
```

### Platform Environment Variables

#### NODE_ENV (Optional)
```
NODE_ENV=prod    # Force production environment
NODE_ENV=dev     # Force development environment
```

### Fallback Behavior

If environment-specific variables are not set, the system will fall back to `NETLIFY_DATABASE_URL` for all contexts.

## Environment Detection Priority

### 1. Environment Determination
1. If `NODE_ENV=prod` → Use production environment
2. If `NODE_ENV=dev` → Use development environment
3. Otherwise → Use `NETLIFY_CONTEXT` value

### 2. Database URL Priority

Once the environment is determined, the system uses the following priority order:

#### Production Context
1. `NETLIFY_DATABASE_URL`
2. `DATABASE_URL`

#### Deploy Preview Context
1. `NETLIFY_DATABASE_URL_PREVIEW`
2. `DATABASE_URL_PREVIEW`
3. `NETLIFY_DATABASE_URL` (fallback)

#### Branch Deploy Context
1. `NETLIFY_DATABASE_URL_BRANCH`
2. `DATABASE_URL_BRANCH`
3. `NETLIFY_DATABASE_URL` (fallback)

#### Development Context
1. `NETLIFY_DATABASE_URL_DEV`
2. `DATABASE_URL_DEV`
3. `NETLIFY_DATABASE_URL` (fallback)

## Configuration Files

### Database Configuration (`netlify/functions/db-config.mjs`)

This utility provides:
- Environment detection via `NETLIFY_CONTEXT` and `NODE_ENV`
- Database URL selection based on effective context
- Connection validation
- Environment-specific settings

### Drizzle Configuration (`drizzle.config.ts`)

Updated to use environment-specific database URLs for migrations and schema management.

## Environment-Specific Settings

The system automatically applies different settings based on the environment:

### Production
- Maximum connections: 10
- Connection timeout: 30 seconds
- Debug logging: Disabled
- Query logging: Disabled
- Backups: Enabled
- Metrics: Enabled
- Row-level security: Enabled
- Audit logging: Enabled

### Development/Preview
- Maximum connections: 5
- Connection timeout: 15 seconds
- Debug logging: Enabled
- Query logging: Enabled (development only)
- Backups: Disabled
- Metrics: Disabled
- Row-level security: Disabled
- Audit logging: Disabled

## Usage Examples

### In Netlify Functions

```javascript
import { getEnvironmentConfig, logEnvironmentInfo } from './db-config.mjs';

// Log current environment
logEnvironmentInfo();

// Get environment configuration
const config = getEnvironmentConfig();
console.log(`Running in ${config.context} environment`);
console.log(`NETLIFY_CONTEXT: ${config.netlifyContext}`);
console.log(`NODE_ENV: ${config.platformEnv}`);

// Use environment-specific settings
if (config.isProduction) {
  // Production-specific logic
}
```

### Database Connection

```javascript
import { createDatabaseConnection, validateDatabaseConnection } from './db-config.mjs';

// Create environment-specific connection
const sql = createDatabaseConnection();

// Validate connection
const isValid = await validateDatabaseConnection(sql);
if (!isValid) {
  throw new Error('Database connection failed');
}
```

## Testing Different Environments

### Local Development
```bash
# Set development environment
export NETLIFY_CONTEXT=development
export NETLIFY_DATABASE_URL_DEV=your_dev_db_url

# Or use NODE_ENV to force development
export NODE_ENV=dev
export NETLIFY_DATABASE_URL_DEV=your_dev_db_url

# Run development server
npm run dev
```

### Preview Deployment
Create a pull request to trigger a deploy-preview environment.

### Production Deployment
Deploy to the main branch to trigger production environment.

## Troubleshooting

### Check Environment Variables
```bash
# In Netlify function logs
console.log('NETLIFY_CONTEXT:', process.env.NETLIFY_CONTEXT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Database URL:', process.env.NETLIFY_DATABASE_URL);
```

### Validate Database Connection
The system automatically validates database connections and logs any issues.

### Common Issues

1. **Missing Environment Variables**: Ensure all required environment variables are set in Netlify
2. **Database URL Format**: Ensure database URLs follow the correct PostgreSQL format
3. **Network Access**: Ensure your database allows connections from Netlify's IP ranges
4. **SSL Requirements**: Some databases require SSL connections

## Security Considerations

- Never commit database URLs to version control
- Use environment variables for all sensitive configuration
- Consider using different databases for different environments
- Enable SSL connections in production
- Use connection pooling for production environments