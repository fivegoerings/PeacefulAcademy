# Environment Setup for Peaceful Academy

This document explains how the application handles different environments (development vs. production) and database connections.

## Overview

The application uses Netlify's automatic database URL provisioning and the `@netlify/neon` package to handle database connections seamlessly across different deployment contexts.

## Environment Variables

### Required Environment Variables

- **`NETLIFY_DATABASE_URL`**: Automatically set by Netlify when you connect a Neon database to your site. This is the primary database URL that the application uses.

### Optional Environment Variables

- **`CONTEXT`**: Automatically set by Netlify to indicate the deployment context:
  - `production`: Production deployment
  - `deploy-preview`: Preview deployments for pull requests
  - `branch-deploy`: Branch deployments
  - `dev`: Local development

## Database Connection

The application uses the `@netlify/neon` package which automatically handles database connections:

```javascript
import { neon } from '@netlify/neon';

// Automatically uses NETLIFY_DATABASE_URL
const sql = neon();
```

This approach is used in:
- `netlify/functions/db.mjs`
- `netlify/functions/api.mjs`
- `db/index.ts`

## Environment Detection

The application determines the current environment based on the `CONTEXT` environment variable:

```javascript
const context = process.env.CONTEXT || 'unknown';
const isDev = ['dev', 'develop', 'development', 'deploy-preview', 'branch-deploy'].includes(context.toLowerCase());
const isProd = context === 'production';
```

## Dashboard Display

The dashboard displays the current environment and version information in the bottom-right corner:

- **DEV**: Yellow background (development, preview, or branch deployments)
- **PROD**: Green background (production deployment)
- **UNKNOWN**: Default styling (fallback)

The display includes:
- App version
- Environment (DEV/PROD/UNKNOWN)
- Context information
- Hostname
- Build date

## Benefits of This Approach

1. **Simplified Configuration**: No need to manually manage separate database URLs for different environments
2. **Automatic Provisioning**: Netlify automatically sets up the database URL when you connect a Neon database
3. **Consistent Behavior**: Same database connection logic across all environments
4. **Reduced Complexity**: Eliminates the need for `NETLIFY_DATABASE_URL_DEV` and `NETLIFY_DATABASE_URL_PROD` variables

## Setup Instructions

1. **Connect Neon Database to Netlify Site**:
   - In your Netlify dashboard, go to your site settings
   - Navigate to "Environment variables"
   - Connect your Neon database (Netlify will automatically set `NETLIFY_DATABASE_URL`)

2. **Deploy Your Application**:
   - The application will automatically use the correct database URL
   - Environment detection will work based on the deployment context

3. **Verify Setup**:
   - Check the dashboard for the environment indicator
   - Test database operations in different deployment contexts

## Troubleshooting

If you encounter database connection issues:

1. **Verify Environment Variables**: Ensure `NETLIFY_DATABASE_URL` is set in your Netlify environment
2. **Check Database Connection**: Use the health check endpoint to verify connectivity
3. **Review Logs**: Check the application console for detailed error messages
4. **Environment Display**: The dashboard will show the detected environment and context

## Migration from Manual URL Management

If you previously used `NETLIFY_DATABASE_URL_DEV` and `NETLIFY_DATABASE_URL_PROD`:

1. **Remove Custom Variables**: These are no longer needed
2. **Use Single Database**: Connect one Neon database to your Netlify site
3. **Update Code**: The code has been updated to use `neon()` without parameters
4. **Test Deployments**: Verify that both development and production contexts work correctly
