@echo off
REM ScribeAI Vercel Deployment Script for Windows

echo 🚀 Starting ScribeAI deployment to Vercel...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if errorlevel 1 (
    echo 🔐 Please login to Vercel...
    vercel login
)

REM Install dependencies
echo 📦 Installing dependencies...
npm ci

REM Build the project locally to check for errors
echo 🔨 Building project...
npm run build

echo 📁 Copying assets...
npm run copy-assets

if errorlevel 1 (
    echo ❌ Build failed. Please fix errors before deploying.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod

echo ✅ Deployment complete!
echo 🌐 Your app should be live at the URL provided above.
echo.
echo 📋 Next steps:
echo 1. Set up environment variables in Vercel dashboard
echo 2. Deploy Supabase functions if needed
echo 3. Configure custom domain if desired
echo 4. Enable analytics and monitoring

pause
