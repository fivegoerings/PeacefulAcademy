#!/usr/bin/env node

/**
 * Test script to verify environment configuration
 * Run with: node test-env-config.mjs
 */

import { 
  getNetlifyContext, 
  getPlatformEnvironment,
  getEffectiveEnvironment,
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
  console.log(`\n--- Testing NETLIFY_CONTEXT: ${context} ---`);
  
  // Set the context for testing
  process.env.NETLIFY_CONTEXT = context;
  delete process.env.NODE_ENV; // Clear NODE_ENV to test NETLIFY_CONTEXT only
  
  // Test all functions
  console.log('Netlify Context:', getNetlifyContext());
  console.log('Platform Env:', getPlatformEnvironment());
  console.log('Effective Context:', getEffectiveEnvironment());
  console.log('Database URL:', getDatabaseUrl() ? 'SET' : 'NOT SET');
  
  const config = getEnvironmentConfig();
  console.log('Environment Config:', {
    netlifyContext: config.netlifyContext,
    platformEnv: config.platformEnv,
    effectiveContext: config.context,
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

// Test NODE_ENV override scenarios
console.log('\n--- Testing NODE_ENV Override Scenarios ---');

// Test NODE_ENV=prod override
console.log('\n--- Testing NODE_ENV=prod override ---');
process.env.NETLIFY_CONTEXT = 'deploy-preview';
process.env.NODE_ENV = 'prod';
console.log('Netlify Context:', getNetlifyContext());
console.log('Platform Env:', getPlatformEnvironment());
console.log('Effective Context:', getEffectiveEnvironment());
console.log('Database URL:', getDatabaseUrl() ? 'SET' : 'NOT SET');

// Test NODE_ENV=dev override
console.log('\n--- Testing NODE_ENV=dev override ---');
process.env.NETLIFY_CONTEXT = 'production';
process.env.NODE_ENV = 'dev';
console.log('Netlify Context:', getNetlifyContext());
console.log('Platform Env:', getPlatformEnvironment());
console.log('Effective Context:', getEffectiveEnvironment());
console.log('Database URL:', getDatabaseUrl() ? 'SET' : 'NOT SET');

// Test with no context set
console.log('\n--- Testing with no NETLIFY_CONTEXT ---');
delete process.env.NETLIFY_CONTEXT;
logEnvironmentInfo();

console.log('\n✅ Environment configuration test completed!');