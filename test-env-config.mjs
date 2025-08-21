#!/usr/bin/env node

/**
 * Test script to verify environment configuration
 * Run with: node test-env-config.mjs
 */

import { 
  getNetlifyContext, 
  getDatabaseUrl, 
  getEnvironmentConfig, 
  getEnvironmentSettings,
  logEnvironmentInfo 
} from './netlify/functions/db-config.mjs';

console.log('🧪 Testing Environment Configuration\n');

// Test different contexts
const testContexts = [
  'production',
  'deploy-preview', 
  'branch-deploy',
  'development',
  'unknown'
];

testContexts.forEach(context => {
  console.log(`\n--- Testing Context: ${context} ---`);
  
  // Set the context for testing
  process.env.NETLIFY_CONTEXT = context;
  
  // Test all functions
  console.log('Context:', getNetlifyContext());
  console.log('Database URL:', getDatabaseUrl() ? 'SET' : 'NOT SET');
  
  const config = getEnvironmentConfig();
  console.log('Environment Config:', {
    context: config.context,
    isProduction: config.isProduction,
    isPreview: config.isPreview,
    isBranch: config.isBranch,
    isDevelopment: config.isDevelopment
  });
  
  const settings = getEnvironmentSettings();
  console.log('Environment Settings:', {
    maxConnections: settings.maxConnections,
    connectionTimeout: settings.connectionTimeout,
    enableDebugLogging: settings.enableDebugLogging,
    enableBackups: settings.enableBackups
  });
});

// Test with no context set
console.log('\n--- Testing with no NETLIFY_CONTEXT ---');
delete process.env.NETLIFY_CONTEXT;
logEnvironmentInfo();

console.log('\n✅ Environment configuration test completed!');