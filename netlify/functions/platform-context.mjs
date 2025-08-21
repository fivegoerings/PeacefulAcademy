export default async function handler(event, context) {
  // Set CORS headers for cross-origin requests
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers
    };
  }

  // Get the Netlify context
  const netlifyContext = process.env.NETLIFY_CONTEXT || 'unknown';
  
  // Determine platform based on context
  let platform = 'unknown';
  let isProduction = false;
  let isPreview = false;
  let isBranchDeploy = false;
  
  switch (netlifyContext) {
    case 'production':
      platform = 'production';
      isProduction = true;
      break;
    case 'deploy-preview':
      platform = 'preview';
      isPreview = true;
      break;
    case 'branch-deploy':
      platform = 'branch';
      isBranchDeploy = true;
      break;
    default:
      platform = 'development';
      break;
  }

  const platformInfo = {
    context: netlifyContext,
    platform,
    isProduction,
    isPreview,
    isBranchDeploy,
    timestamp: new Date().toISOString()
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(platformInfo)
  };
}