#!/usr/bin/env node

/**
 * Icon Generator for Peaceful Academy
 * 
 * This script generates PNG icons from the SVG file for different sizes.
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [192, 256, 384, 512];
const inputSvg = path.join(__dirname, 'assets', 'icon.svg');
const outputDir = path.join(__dirname, 'assets');

async function generateIcons() {
  try {
    // Read the SVG file
    const svgBuffer = fs.readFileSync(inputSvg);
    
    console.log('Generating PNG icons...');
    
    // Generate icons for each size
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon-${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputFile);
      
      console.log(`✓ Generated icon-${size}.png`);
    }
    
    // Generate favicon.ico (32x32)
    const faviconFile = path.join(__dirname, 'favicon.ico');
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(faviconFile.replace('.ico', '.png'));
    
    console.log('✓ Generated favicon.png (rename to favicon.ico if needed)');
    
    // Generate apple-touch-icon (180x180)
    const appleIconFile = path.join(__dirname, 'apple-touch-icon.png');
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(appleIconFile);
    
    console.log('✓ Generated apple-touch-icon.png');
    
    console.log('\n🎉 All icons generated successfully!');
    console.log('\nNote: For favicon.ico, you may need to convert the PNG to ICO format using an online converter or tool.');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

// Check if sharp is installed
try {
  require('sharp');
  generateIcons();
} catch (error) {
  console.log('Sharp not found. Installing...');
  console.log('Run: npm install sharp');
  console.log('Then run: node generate-icons.js');
}
