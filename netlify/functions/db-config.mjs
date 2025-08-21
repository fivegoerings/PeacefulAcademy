/**
 * Database configuration utility that uses NETLIFY_CONTEXT to determine environment
 * and select the appropriate database URL.
 */

/**
 * Get the current Netlify context
 * @returns {string} The current context (production, deploy-preview, branch-deploy, etc.)
 */
export function getNetlifyContext() {
  return process.env.NETLIFY_CONTEXT || 'development';
}

/**
 * Get the appropriate database URL based on the current context
 * @returns {string} The database URL for the current environment
 */
export function getDatabaseUrl() {
  const context = getNetlifyContext();
  
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
  const context = getNetlifyContext();
  const dbUrl = getDatabaseUrl();
  
  return {
    context,
    databaseUrl: dbUrl,
    isProduction: context === 'production',
    isPreview: context === 'deploy-preview',
    isBranch: context === 'branch-deploy',
    isDevelopment: context === 'development',
    environment: context
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
    context: config.context,
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