#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Setting up local development environment...\n');

// Check if .env file already exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists. Skipping creation.');
  console.log('   If you need to update it, please edit it manually.\n');
} else {
  console.log('📝 Creating .env file for local development...');
  
  const envContent = `# Local development environment variables
# Replace 'your_database_url_here' with your actual non-production database URL
NONPROD_DATABASE_URL=your_database_url_here
CONTEXT=unknown

# Example database URL format:
# NONPROD_DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('📋 Please edit the .env file and replace "your_database_url_here" with your actual database URL.\n');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
    console.log('📋 Please create a .env file manually with the following content:');
    console.log(envContent);
  }
}

console.log('🚀 Next steps:');
console.log('1. Edit the .env file and set your NONPROD_DATABASE_URL');
console.log('2. Run "npx netlify dev" to start the development server');
console.log('3. Open http://localhost:8888 to test the application');
console.log('4. Check the admin panel at http://localhost:8888/admin for environment info\n');

console.log('📚 For more information, see ENVIRONMENT_SETUP.md');
