/**
 * Container entry point for Konoha Bot
 * This file is used when running in a containerized environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Display startup banner
console.log('=============================================');
console.log('🚀 Konoha Bot - Pterodactyl Startup Script');
console.log('=============================================');

try {
  // Fix sharp module
  console.log('🔧 Creating minimal Sharp module implementation...');
  
  // Ensure node_modules directory exists
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    fs.mkdirSync(nodeModulesPath, { recursive: true });
  }
  
  // Create sharp directory if it doesn't exist
  const sharpPath = path.join(nodeModulesPath, 'sharp');
  if (!fs.existsSync(sharpPath)) {
    fs.mkdirSync(sharpPath, { recursive: true });
  }
  
  // Create a full featured minimal sharp implementation
  console.log('📝 Writing minimal Sharp implementation files...');
  
  // Create the main index.js file
  const sharpIndexContent = `
/**
 * Minimal Sharp Implementation
 * For Pterodactyl environments without Git
 */

function sharp(input) {
  console.warn('⚠️ Using minimal Sharp implementation - image processing will be limited');
  
  const instance = {
    // Basic resize operation
    resize: (width, height, options = {}) => {
      console.warn('⚠️ Using minimal Sharp resize() implementation');
      return instance;
    },
    
    // Basic format conversion
    jpeg: (options = {}) => {
      console.warn('⚠️ Using minimal Sharp jpeg() implementation');
      return instance;
    },
    png: (options = {}) => {
      console.warn('⚠️ Using minimal Sharp png() implementation');
      return instance;
    },
    webp: (options = {}) => {
      console.warn('⚠️ Using minimal Sharp webp() implementation');
      return instance;
    },
    
    // Output operations
    toBuffer: async () => {
      console.warn('⚠️ Using minimal Sharp toBuffer() implementation');
      // Return an empty image buffer
      return Buffer.from([]);
    },
    toFile: async (file) => {
      console.warn('⚠️ Using minimal Sharp toFile() implementation');
      // Write an empty file
      fs.writeFileSync(file, Buffer.from([]), 'binary');
      return { size: 0, format: 'unknown' };
    },
    
    // Metadata operation
    metadata: async () => {
      console.warn('⚠️ Using minimal Sharp metadata() implementation');
      return { width: 512, height: 512, format: 'jpeg' };
    },
    
    // Composite operation
    composite: (images) => {
      console.warn('⚠️ Using minimal Sharp composite() implementation');
      return instance;
    }
  };
  
  return instance;
}

// Static methods and properties
sharp.cache = function(isPrecached) {
  return sharp;
};

sharp.concurrency = function(concurrency) {
  return sharp;
};

sharp.counters = function() {
  return {};
};

sharp.format = {
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  gif: 'gif'
};

// Export the module
module.exports = sharp;
`;

  fs.writeFileSync(path.join(sharpPath, 'index.js'), sharpIndexContent, 'utf8');
  
  // Create a package.json
  const packageJsonContent = JSON.stringify({
    name: 'sharp',
    version: '0.32.6',
    description: 'Minimal Sharp implementation for environments without Git',
    main: 'index.js',
    author: 'Konoha Bot'
  }, null, 2);
  
  fs.writeFileSync(path.join(sharpPath, 'package.json'), packageJsonContent, 'utf8');
  
  // Create lib directory and add a placeholder sharp.js file
  const sharpLibPath = path.join(sharpPath, 'lib');
  if (!fs.existsSync(sharpLibPath)) {
    fs.mkdirSync(sharpLibPath, { recursive: true });
  }
  
  const sharpLibContent = 'module.exports = require("../index.js");';
  fs.writeFileSync(path.join(sharpLibPath, 'sharp.js'), sharpLibContent, 'utf8');
  fs.writeFileSync(path.join(sharpLibPath, 'constructor.js'), sharpLibContent, 'utf8');

  console.log('✅ Minimal Sharp module implementation created successfully');
  
  // Verify the implementation works
  console.log('📋 Testing minimal Sharp implementation...');
  try {
    const sharp = require('sharp');
    const instance = sharp(Buffer.from([]));
    console.log('✅ Minimal Sharp module loaded successfully');
  } catch (err) {
    console.error('❌ Failed to load minimal Sharp module:', err.message);
    process.exit(1);
  }

  // Start the main application
  console.log('🚀 Starting main application...');
  console.log('=============================================');
  
  console.log('ℹ️ Note: Image processing features that use Sharp will have limited functionality');
  console.log('ℹ️ To fully fix this issue, configure Git in your Pterodactyl container');
  
  // Load the main application
  require('./index.js');
  
} catch (error) {
  console.error('❌ Error during startup:', error.message);
  process.exit(1);
}