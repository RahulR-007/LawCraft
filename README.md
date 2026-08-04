# LawCraft AI - Legal Document Generation Platform

LawCraft AI is an enterprise-grade legal document generation platform built with React 18, TypeScript, Chakra UI, and Supabase Edge Functions. It empowers legal professionals to architect jurisdiction-aware contracts, NDAs, employment agreements, loan documents, and lease agreements with real-time statutory risk scoring and AI assistance.

---

## Features

- Autonomous Legal Architect: Step-by-step document creation wizard with customizable clauses, jurisdiction selection, and party metadata.
- Alice Legal AI Chatbot: Real-time legal advisory chatbot providing statutory definitions (Indian Contract Act, IT Act), clause analysis, and template suggestions.
- DOCX Export Engine: Generates professional, publication-ready .docx contracts formatted with proper legal margins, headings, and signature blocks.
- Google OAuth & Supabase Auth: Secure single sign-on via Google OAuth and email/password authentication with row-level security (RLS).
- Glassmorphism UI System: Modern dark-mode interface built on Chakra UI and Framer Motion micro-animations.

---

## Technology Stack

- Frontend: React 18, TypeScript, Vite 4
- UI Framework: Chakra UI, Framer Motion, Lucide Icons, React Icons
- Backend & Database: Supabase (PostgreSQL, Row-Level Security, Auth, Edge Functions)
- Document Export: docx JavaScript engine
- Testing: Vitest, React Testing Library

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RahulR-007/Law-Craft.git
   cd Law-Craft
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Run Development Server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

---

## Production Build & Deployment

### Build Command
```bash
npm run build
```

### Deploy Options

#### Option A: Vercel / Netlify
1. Connect your repository to Vercel or Netlify.
2. Set environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
3. Set build command `npm run build` and publish directory `dist`.

#### Option B: Docker Container
```bash
docker build -t law-craft .
docker run -p 80:80 law-craft
```

---

## Testing

Run unit tests via Vitest:
```bash
npm run test:run
```

---

## License & Copyright

Copyright (c) 2026 LawCraft AI. All Rights Reserved.
See LICENSE and COPYRIGHT for terms.
