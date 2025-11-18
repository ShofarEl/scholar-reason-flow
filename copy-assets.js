#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied: ${path.relative(__dirname, src)}`);
  }
}

try {
  // Copy all files from public to dist
  const files = fs.readdirSync(publicDir);

  files.forEach(file => {
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(distDir, file);
    copyRecursive(srcPath, destPath);
  });

  console.log('✅ All public assets copied to dist directory');
} catch (error) {
  console.log('⚠️  Asset copy failed:', error.message);
  console.log('Continuing build without asset copy...');
}
