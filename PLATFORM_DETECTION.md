# Platform Detection Using NETLIFY_CONTEXT

This application uses the `NETLIFY_CONTEXT` environment variable to determine the current deployment platform and provide different behaviors based on the environment.

## How It Works

The platform detection system consists of:

1. **Netlify Function** (`netlify/functions/platform-context.mjs`): Exposes the `NETLIFY_CONTEXT` environment variable to the client
2. **Client-side Detection** (`index.html`): Fetches platform information and provides utility functions
3. **Visual Indicators**: Shows environment badges for non-production deployments

## Platform Values

| NETLIFY_CONTEXT | Platform | Description |
|-----------------|----------|-------------|
| `"production"` | `production` | Production deployment from main/master branch |
| `"deploy-preview"` | `preview` | Preview deployment from pull/merge request |
| `"branch-deploy"` | `branch` | Branch deployment from non-production branch |
| `unknown` | `development` | Local development or unknown environment |

## Available Functions

### Core Functions
- `isProduction()` - Returns `true` if running in production
- `isPreview()` - Returns `true` if running in deploy preview
- `isBranchDeploy()` - Returns `true` if running in branch deployment
- `getPlatform()` - Returns the current platform string
- `getPlatformContextValue()` - Returns the raw NETLIFY_CONTEXT value

### Utility Functions
- `logPlatformInfo()` - Logs all platform information to console
- `runInEnvironment(environments, callback)` - Executes code only in specified environments

## Usage Examples

### Basic Platform Checks
```javascript
// Check if running in production
if (isProduction()) {
  console.log('Running in production mode');
}

// Check if running in preview
if (isPreview()) {
  console.log('Running in preview mode');
}

// Get current platform
const platform = getPlatform();
console.log('Current platform:', platform);
```

### Conditional Code Execution
```javascript
// Run code only in non-production environments
runInEnvironment(['preview', 'branch', 'development'], () => {
  console.log('Debug mode enabled');
  showDebugPanel();
});

// Run code only in production
runInEnvironment(['production'], () => {
  console.log('Production optimizations enabled');
  enableAnalytics();
});
```

### Environment-Specific Features
```javascript
// Show different content based on platform
function showEnvironmentSpecificContent() {
  if (isProduction()) {
    // Production content
    showProductionFeatures();
  } else if (isPreview()) {
    // Preview content with testing features
    showPreviewFeatures();
    showTestingTools();
  } else if (isBranchDeploy()) {
    // Branch deployment content
    showBranchFeatures();
  }
}
```

## Visual Indicators

When not running in production, a colored badge appears in the top-right corner:
- **Preview**: Orange badge with "preview"
- **Branch**: Blue badge with "branch"
- **Development**: Blue badge with "development"

## API Endpoint

The platform information is available via the `/api/platform-context` endpoint:

```javascript
// Fetch platform info directly
fetch('/api/platform-context')
  .then(response => response.json())
  .then(data => {
    console.log('Platform info:', data);
  });
```

Response format:
```json
{
  "context": "deploy-preview",
  "platform": "preview",
  "isProduction": false,
  "isPreview": true,
  "isBranchDeploy": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Fallback Detection

If the API call fails, the system falls back to URL-based detection:
- URLs containing `--` are treated as preview deployments
- Other netlify.app URLs are treated as production
- Local development is detected by the absence of netlify.app in the hostname

## Best Practices

1. **Use for Feature Flags**: Enable/disable features based on environment
2. **Debug Information**: Show additional debug info in non-production
3. **Analytics**: Use different analytics configurations per environment
4. **Testing**: Enable testing tools only in preview/branch deployments
5. **Performance**: Apply different optimizations per environment

## Configuration

The platform detection is automatically initialized when the page loads. No additional configuration is required.

To customize the visual indicator, modify the `addPlatformIndicator()` function in `index.html`.