export function getDeploymentContext() {
  if (process.env.CONTEXT) return process.env.CONTEXT;
  if (process.env.NETLIFY_LOCAL === 'true') return 'dev';
  return 'production';
}

export function getSiteUrl() {
  const context = getDeploymentContext();
  if (context === 'production') {
    return process.env.URL || process.env.SITE_URL || '';
  }
  return process.env.DEPLOY_PRIME_URL || process.env.URL || process.env.SITE_URL || '';
}

export function getDatabaseUrl() {
  if (process.env.NETLIFY_DATABASE_URL) return process.env.NETLIFY_DATABASE_URL;

  const context = getDeploymentContext();
  if (context === 'dev') {
    return process.env.NETLIFY_DATABASE_URL_DEV || process.env.DATABASE_URL || '';
  }
  if (context === 'deploy-preview' || context === 'branch-deploy') {
    return process.env.NETLIFY_DATABASE_URL_PREVIEW || process.env.DATABASE_URL || '';
  }
  return process.env.DATABASE_URL || '';
}

