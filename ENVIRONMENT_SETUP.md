# Environment-Specific Database Setup

This document explains how to configure environment-specific database URLs for the Peaceful Academy application.

## Overview

The application now supports environment-specific database connections:
- **Production**: Uses `PROD_DATABASE_URL` environment variable
- **Non-Production**: Uses `NONPROD_DATABASE_URL` environment variable (for dev, deploy-preview, branch-deploy contexts)
- **Fallback**: Uses `NETLIFY_DATABASE_URL` if environment-specific URLs are not set

## Setting Up Environment Variables in Netlify

### 1. Production Environment Variables

1. Go to your Netlify dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add the following environment variable:
   - **Key**: `PROD_DATABASE_URL`
   - **Value**: Your production database URL (e.g., `postgresql://user:pass@prod-db-host/dbname`)
   - **Scopes**: Production deploys only

### 2. Non-Production Environment Variables

1. In the same Environment variables section
2. Add the following environment variable:
   - **Key**: `NONPROD_DATABASE_URL`
   - **Value**: Your non-production database URL (e.g., `postgresql://******@ep-solitary-mouse-aeuwmhfm-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`)
   - **Scopes**: All deploys (or specific contexts as needed)

### 3. Optional: Netlify Automatic Database URL

If you're using Netlify's automatic database integration:
- **Key**: `NETLIFY_DATABASE_URL`
- **Value**: Automatically set by Netlify
- **Scopes**: All deploys

## Environment Variable Priority

The application uses the following priority order for database URLs:

1. **Production context**: `PROD_DATABASE_URL`
2. **Non-production contexts**: `NONPROD_DATABASE_URL`
3. **Fallback**: `NETLIFY_DATABASE_URL`

## Context Detection

The application automatically detects the environment using `process.env.CONTEXT`:

- `production` → Uses `PROD_DATABASE_URL`
- `dev`, `deploy-preview`, `branch-deploy`, `unknown` → Uses `NONPROD_DATABASE_URL`

## Verification

After setting up the environment variables:

1. Deploy your application
2. Check the admin panel at `/admin`
3. Go to the **Environment** tab
4. Verify that:
   - **Database URL Source** shows the correct environment variable name
   - **Database URL Info** shows the masked database URL
   - **PROD_DATABASE_URL Set** and **NONPROD_DATABASE_URL Set** show "Yes" if configured

## Example Configuration

```bash
# Production environment
PROD_DATABASE_URL=postgresql://prod-user:prod-pass@prod-host/prod-db

# Non-production environment  
NONPROD_DATABASE_URL=postgresql://******@ep-solitary-mouse-aeuwmhfm-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Troubleshooting

### Database URL Not Changing

1. Check that environment variables are set correctly in Netlify
2. Verify the variable names match exactly (case-sensitive)
3. Ensure the correct scopes are set for each environment
4. Check the admin panel to see which variables are detected as "Set"

### Connection Issues

1. Verify database URLs are valid and accessible
2. Check that the database server allows connections from Netlify's IP ranges
3. Ensure SSL settings are correct for your database provider

### Local Development

For local development, you can set environment variables in a `.env` file:

```bash
NONPROD_DATABASE_URL=postgresql://******@ep-solitary-mouse-aeuwmhfm-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
