#!/bin/bash

# ScribeAI Vercel Deployment Script
echo "🚀 Starting ScribeAI deployment to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project locally to check for errors
echo "🔨 Building project..."
npm run build

# Copy assets to ensure they're included
echo "📁 Copying assets..."
npm run copy-assets

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "🌐 Your app should be live at the URL provided above."
echo ""
echo "📋 Next steps:"
echo "1. Set up environment variables in Vercel dashboard"
echo "2. Deploy Supabase functions if needed"
echo "3. Configure custom domain if desired"
echo "4. Enable analytics and monitoring"
