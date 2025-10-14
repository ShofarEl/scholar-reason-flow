#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we're in Vercel environment
const isVercel = process.env.VERCEL === '1';

// Determine the correct paths based on environment
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

// Check if public directory exists
if (!fs.existsSync(publicDir)) {
  console.log('⚠️  Public directory not found, skipping asset copy');
  process.exit(0);
}

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

try {
  // Copy all files from public to dist
  const files = fs.readdirSync(publicDir);

  files.forEach(file => {
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(distDir, file);
    
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${file}`);
    }
  });

  console.log('✅ All public assets copied to dist directory');
} catch (error) {
  console.log('⚠️  Asset copy failed:', error.message);
  console.log('Continuing build without asset copy...');
}
