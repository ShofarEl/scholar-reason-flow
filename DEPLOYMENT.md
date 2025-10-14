# ScribeAI Vercel Deployment Guide

This guide will help you deploy the ScribeAI application to Vercel using the Vercel CLI.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Vercel CLI** installed globally
3. **Git** repository set up
4. **Supabase** project configured

## Installation Steps

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Initialize Project

```bash
# Navigate to your project directory
cd scholar-reason-flow-main

# Initialize Vercel project
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Choose your account/team
- **Link to existing project?** → No (for first deployment)
- **Project name** → `scribe-ai-app` (or your preferred name)
- **Directory** → `./` (current directory)
- **Override settings?** → No (uses vercel.json)

## Environment Variables

Set up the following environment variables in Vercel:

### Required Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Service Configuration
VITE_AI_SERVICE_URL=your_ai_service_url
VITE_AI_SERVICE_KEY=your_ai_service_key

# Payment Configuration (Paystack)
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
VITE_PAYSTACK_SECRET_KEY=your_paystack_secret_key

# Email Service (Resend)
VITE_RESEND_API_KEY=your_resend_api_key
VITE_FROM_EMAIL=your_from_email

# App Configuration
VITE_APP_NAME=ScribeAI
VITE_APP_URL=https://your-domain.vercel.app
```

### Setting Environment Variables

#### Via Vercel CLI:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_AI_SERVICE_URL
vercel env add VITE_AI_SERVICE_KEY
vercel env add VITE_PAYSTACK_PUBLIC_KEY
vercel env add VITE_PAYSTACK_SECRET_KEY
vercel env add VITE_RESEND_API_KEY
vercel env add VITE_FROM_EMAIL
vercel env add VITE_APP_NAME
vercel env add VITE_APP_URL
```

#### Via Vercel Dashboard:
1. Go to your project in Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with appropriate values

## Deployment Commands

### Deploy to Production
```bash
vercel --prod
```

### Deploy to Preview
```bash
vercel
```

### Build Locally
```bash
npm run build
npm run preview
```

## Supabase Functions

The project includes Supabase Edge Functions that need to be deployed separately using the Supabase CLI (NOT through Vercel):

### Deploy Supabase Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy scribe-ai-service
supabase functions deploy claude-batch-service
supabase functions deploy stealthgpt-proxy
```

**Note**: Supabase Edge Functions are deployed to Supabase's infrastructure, not Vercel. The `vercel.json` configuration does not include function deployment.

## Build Configuration

The project is configured with:

- **Framework**: Vite + React
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm ci`
- **Node Version**: 18.x

## Custom Domain Setup

### Add Custom Domain in Vercel:
1. Go to your project settings
2. Navigate to Domains
3. Add your custom domain
4. Configure DNS records as instructed

### Update Environment Variables:
```bash
vercel env add VITE_APP_URL
# Set value to your custom domain
```

## Monitoring and Logs

### View Deployment Logs:
```bash
vercel logs
```

### View Function Logs:
```bash
vercel logs --follow
```

### Monitor Performance:
- Use Vercel Analytics dashboard
- Check Supabase logs for function performance

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Environment Variables**:
   - Ensure all required variables are set
   - Check variable names match exactly
   - Verify no trailing spaces in values

3. **Supabase Functions**:
   - Ensure functions are deployed
   - Check function URLs are correct
   - Verify authentication keys

4. **Asset Loading**:
   - Check file paths in public directory
   - Verify asset optimization settings
   - Check CDN configuration

### Debug Commands:
```bash
# Check build locally
npm run build

# Test production build
npm run preview

# Check environment variables
vercel env ls

# View project settings
vercel project ls
```

## Performance Optimization

The project includes several optimizations:

- **Code Splitting**: Automatic chunk splitting
- **Asset Optimization**: Compressed assets with caching
- **CDN**: Global edge network via Vercel
- **Security Headers**: XSS protection, content type sniffing prevention

## Security Considerations

- All sensitive keys are environment variables
- Supabase RLS policies protect data
- CORS configured for production domains
- Security headers enabled in vercel.json

## Support

For deployment issues:
1. Check Vercel documentation
2. Review build logs
3. Verify environment configuration
4. Test locally before deploying

## Quick Deploy Checklist

- [ ] Vercel CLI installed and logged in
- [ ] Project initialized with `vercel`
- [ ] Environment variables configured
- [ ] Supabase functions deployed
- [ ] Build tested locally
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled (optional)
