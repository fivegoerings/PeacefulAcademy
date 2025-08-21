/**
 * Database configuration utility that uses NETLIFY_CONTEXT and NODE_ENV to determine environment
 * and select the appropriate database URL.
 */

/**
 * Get the current platform environment
 * @returns {string} The current platform (prod, dev, or development)
 */
export function getPlatformEnvironment() {
  return process.env.NODE_ENV || 'development';
}

/**
 * Get the current Netlify context
 * @returns {string} The current context (production, deploy-preview, branch-deploy, etc.)
 */
export function getNetlifyContext() {
  return process.env.NETLIFY_CONTEXT || 'development';
}

/**
 * Determine the effective environment by combining NETLIFY_CONTEXT and NODE_ENV
 * @returns {string} The effective environment context
 */
export function getEffectiveEnvironment() {
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
}

/**
 * Get the appropriate database URL based on the current context
 * @returns {string} The database URL for the current environment
 */
export function getDatabaseUrl() {
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
}

/**
 * Get environment-specific configuration
 * @returns {Object} Configuration object with environment info
 */
export function getEnvironmentConfig() {
  const netlifyContext = getNetlifyContext();
  const platformEnv = getPlatformEnvironment();
  const effectiveContext = getEffectiveEnvironment();
  const dbUrl = getDatabaseUrl();
  
  return {
    netlifyContext,
    platformEnv,
    context: effectiveContext,
    databaseUrl: dbUrl,
    isProduction: effectiveContext === 'production',
    isPreview: effectiveContext === 'deploy-preview',
    isBranch: effectiveContext === 'branch-deploy',
    isDevelopment: effectiveContext === 'development',
    environment: effectiveContext
  };
}

/**
 * Create a Neon database connection with environment-specific configuration
 * @returns {Object} Neon SQL client
 */
export function createDatabaseConnection() {
  const { neon } = require('@netlify/neon');
  const config = getEnvironmentConfig();
  
  if (!config.databaseUrl) {
    throw new Error(`No database URL configured for context: ${config.context}`);
  }
  
  return neon();
}

/**
 * Validate database connection
 * @param {Object} sql - Neon SQL client
 * @returns {Promise<boolean>} True if connection is valid
 */
export async function validateDatabaseConnection(sql) {
  try {
    const [result] = await sql`SELECT version() AS version, now() AS now`;
    return result && result.version;
  } catch (error) {
    console.error('Database connection validation failed:', error);
    return false;
  }
}

/**
 * Log environment information for debugging
 */
export function logEnvironmentInfo() {
  const config = getEnvironmentConfig();
  console.log('🌍 Environment Configuration:', {
    netlifyContext: config.netlifyContext,
    platformEnv: config.platformEnv,
    effectiveContext: config.context,
    environment: config.environment,
    isProduction: config.isProduction,
    databaseUrl: config.databaseUrl ? `${config.databaseUrl.substring(0, 20)}...` : 'NOT SET'
  });
}

/**
 * Get environment-specific settings
 * @returns {Object} Environment-specific settings
 */
export function getEnvironmentSettings() {
  const config = getEnvironmentConfig();
  
  return {
    // Database settings
    maxConnections: config.isProduction ? 10 : 5,
    connectionTimeout: config.isProduction ? 30000 : 15000,
    
    // Logging settings
    enableDebugLogging: !config.isProduction,
    logQueries: config.isDevelopment,
    
    // Feature flags
    enableBackups: config.isProduction,
    enableMetrics: config.isProduction,
    
    // Security settings
    enableRowLevelSecurity: config.isProduction,
    enableAuditLogging: config.isProduction
  };
}