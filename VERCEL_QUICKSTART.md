# 🚀 Vercel Deployment - Quick Start

## One-Command Deployment

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
npm run deploy
```

## Alternative: Use Deployment Scripts

### Windows:
```bash
deploy.bat
```

### Linux/Mac:
```bash
chmod +x deploy.sh
./deploy.sh
```

## Environment Variables Setup

After deployment, set these in Vercel dashboard:

1. **Supabase**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **AI Services**:
   - `VITE_AI_SERVICE_URL`
   - `VITE_AI_SERVICE_KEY`

3. **Payments**:
   - `VITE_PAYSTACK_PUBLIC_KEY`
   - `VITE_PAYSTACK_SECRET_KEY`

4. **Email**:
   - `VITE_RESEND_API_KEY`
   - `VITE_FROM_EMAIL`

5. **App Config**:
   - `VITE_APP_NAME`
   - `VITE_APP_URL`

## Quick Commands

```bash
# Deploy to production
npm run deploy

# Deploy preview
npm run deploy:preview

# Check environment variables
npm run env:check

# Build locally
npm run build

# Preview build
npm run preview
```

## Project Structure

```
├── vercel.json          # Vercel configuration
├── .vercelignore        # Files to ignore
├── deploy.sh           # Linux/Mac deployment script
├── deploy.bat          # Windows deployment script
├── env.template        # Environment variables template
└── DEPLOYMENT.md       # Detailed deployment guide
```

## Troubleshooting

1. **Build fails**: Check `npm run build` locally first
2. **Environment issues**: Use `npm run env:check`
3. **Functions not working**: Deploy Supabase functions using Supabase CLI (not Vercel)
4. **Runtime errors**: Supabase functions deploy to Supabase infrastructure, not Vercel

## Support

- Check `DEPLOYMENT.md` for detailed instructions
- Review Vercel dashboard for logs and analytics
- Test locally with `npm run preview` before deploying
