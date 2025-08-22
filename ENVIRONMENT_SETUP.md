# Environment-Specific Database Setup

This document explains how to configure environment-specific database URLs for the Peaceful Academy application.

## Overview

The application now supports environment-specific database connections across all functions:

- **Production**: Uses `PROD_DATABASE_URL` environment variable
- **Non-Production**: Uses `NONPROD_DATABASE_URL` environment variable (for dev, deploy-preview, branch-deploy contexts)
- **Fallback**: Uses `NETLIFY_DATABASE_URL` if environment-specific URLs are not set

## Consistent Database Connection Pattern

All database connections now use the same environment-specific logic:

### Shared Database Utility (`netlify/functions/db-utils.mjs`)
- `getDatabaseUrl()`: Determines the appropriate database URL based on `CONTEXT`
- `createDatabaseConnection()`: Creates consistent database connections
- `getEnvironmentInfo()`: Provides environment debugging information

### Files Using Consistent Database Connections
1. **`db/index.ts`**: Main database module
2. **`migrate.js`**: Database migration script
3. **`netlify/functions/db.mjs`**: Main database API
4. **`netlify/functions/api.mjs`**: Additional API functions
5. **`admin/netlify/functions/api.ts`**: Admin API functions

## Setting Up Environment Variables in Netlify

### 1. Production Environment Variables

1. Go to your Netlify dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add the following environment variable:
   - **Key**: `PROD_DATABASE_URL`
   - **Value**: Your production database URL
   - **Scopes**: Production

### 2. Non-Production Environment Variables

1. In the same Environment variables section
2. Add another environment variable:
   - **Key**: `NONPROD_DATABASE_URL`
   - **Value**: Your non-production database URL
   - **Scopes**: All contexts (Deploy previews, Branch deploys, Development)

### 3. Example Environment Variables

```bash
# Production database (used when CONTEXT=production)
PROD_DATABASE_URL=postgresql://user:password@prod-db.example.com/proddb?sslmode=require

# Non-production database (used for dev, deploy-preview, branch-deploy)
NONPROD_DATABASE_URL=postgresql://******@ep-solitary-mouse-aeuwmhfm-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Database URL Selection Logic

The application uses the following logic to select the database URL:

```javascript
function getDatabaseUrl() {
  const context = process.env.CONTEXT || 'unknown';
  
  // For production, use the production database URL
  if (context === 'production') {
    return process.env.PROD_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  }
  
  // For non-production environments, use the non-prod database URL
  if (context !== 'production') {
    return process.env.NONPROD_DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  }
  
  // Fallback to Netlify's automatic database URL
  return process.env.NETLIFY_DATABASE_URL;
}
```

## Context Values

Netlify provides the following `CONTEXT` values:
- `production`: Production deployments
- `deploy-preview`: Pull request previews
- `branch-deploy`: Branch deployments
- `dev`: Local development (when not set)

## Verification

You can verify the database connection is working correctly by:

1. **Admin Panel**: Check the Environment tab to see which database URL is being used
2. **Health Check**: Use the health check endpoint to verify connectivity
3. **Environment Info**: The system.environment action shows detailed connection information

## Benefits

- **Consistent Behavior**: All functions use the same database selection logic
- **Environment Isolation**: Production and non-production data are completely separated
- **Easy Debugging**: Clear visibility into which database is being used
- **Fallback Support**: Graceful degradation if environment variables are not set
