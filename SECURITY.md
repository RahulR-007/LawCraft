# Security Policy & Configuration

## Environment Variables Configuration

Before running this application, create a `.env.local` or configure your hosting platform (Vercel, Netlify, Cloudflare Pages) with the following production environment variables:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Security Best Practices

1. Secret Isolation:
   - Client-side environment variables prefixed with VITE_ are exposed to browser bundles. Never put backend API keys (such as AI_API_KEY or SUPABASE_SERVICE_ROLE_KEY) in client .env files.
   - All AI completion requests and LLM proxy calls are handled server-side via Supabase Edge Functions (ai-proxy, ai-chat, ai-generate-document).

2. Content Security & Headers:
   - Production Nginx server (nginx.conf) includes security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, and Referrer-Policy.
   - Sourcemaps are disabled (sourcemap: false in vite.config.ts) for production builds.

3. Reporting Vulnerabilities:
   - If you discover a security vulnerability within this repository, please disclose it responsibly via security advisory or maintainer contact.
