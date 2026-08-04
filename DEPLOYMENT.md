# Production Deployment Guide

This guide provides step-by-step instructions for deploying LawCraft AI to production environments.

---

## 1. Supabase Backend Setup

### Edge Functions
Deploy serverless functions and configure server-side AI secrets:

```bash
# 1. Set AI Environment Variables
supabase secrets set AI_API_KEY="your-ai-api-key"
supabase secrets set AI_BASE_URL="https://your-ai-provider.com/v1"
supabase secrets set AI_MODEL="google/gemini-flash-latest"

# 2. Deploy Edge Functions
supabase functions deploy ai-proxy
supabase functions deploy ai-chat
supabase functions deploy ai-generate-document
supabase functions deploy law-sync
```

### Database Migration
Apply Row-Level Security policies and tables:
```bash
supabase db push
```

---

## 2. Frontend Deployment

### Vercel / Netlify
1. Connect your repository.
2. Set Environment Variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
3. Build Settings:
   - Build Command: npm run build
   - Output Directory: dist

### Docker / Nginx
```bash
docker build -t law-craft:latest .
docker run -d -p 80:80 --name law-craft-app law-craft:latest
```
