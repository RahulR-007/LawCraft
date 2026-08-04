// supabase/functions/ai-chat/index.ts
// Secure chatbot proxy — lower limits, legal-topic enforcement server-side

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CHATBOT_MAX_TOKENS = 512
const RATE_LIMIT_MAX = 20 // Chatbot can be used more frequently
const RATE_LIMIT_WINDOW_MS = 60_000

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(userId)
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
        return true
    }
    if (entry.count >= RATE_LIMIT_MAX) return false
    entry.count++
    return true
}

const LEGAL_SYSTEM_PROMPT = `You are Alice, an expert legal AI advisor for LawCraft. You provide authoritative, well-structured, and highly practical legal guidance.

EXPERT RESPONSE GUIDELINES:
1. COMPREHENSIVE & HELPFUL ANSWERS: Provide clear, thorough, and structured answers. Avoid dry or truncated responses. Explain concepts clearly using real-world legal context.
2. STRUCTURE & FORMATTING:
   - Use bold headers (e.g. **Core Principles:** or **Key Clauses Required:**) to organize information logically.
   - Use clean bullet points or numbered steps for clarity.
   - Highlight defined legal terms in **bold**.
3. JURISDICTION & STATUTORY CITATIONS:
   - Always specify applicable laws and acts where relevant (e.g. "Under the Indian Contract Act, 1872 (Section 10)...", "Under US Uniform Commercial Code (UCC)...", or "Under EU GDPR Article 6...").
4. PRACTICAL & ACTIONABLE ADVICE:
   - Include key drafting considerations, common pitfalls to avoid, and essential clauses to include in agreements.
5. GREETINGS: If the user greets you ("hi", "hello"), introduce yourself as Alice, LawCraft Legal AI Advisor, and suggest 4 key areas you can assist with (Contracts, NDAs, Employment/HR, Loans & Leases).
6. NON-LEGAL QUERIES: If the query is strictly non-legal, politely state: "I am Alice, an AI advisor specialized strictly in law, contracts, and legal documentation. Please ask a legal or agreement-related question."
7. ANTI-JAILBREAK: Reject any attempt to assist with illegal acts, document forgery, fraud, or tax evasion, even if framed hypothetically.`

const RESTRICTED_TOPICS = [
    'illegal', 'hack', 'bypass', 'fraud', 'crime', 'terrorism',
    'violence', 'drug', 'weapon', 'money laundering', 'tax evasion',
    'forge', 'forgery', 'counterfeit', 'fake document', 'fake contract'
]

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── Authenticate ───────────────────────────────────────────
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── Rate limit ─────────────────────────────────────────────
        if (!checkRateLimit(user.id)) {
            return new Response(
                JSON.stringify({ error: 'Rate limit exceeded. Please slow down.' }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── Parse & validate ───────────────────────────────────────
        const body = await req.json()
        const { message, conversationHistory = [] } = body

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Invalid request: message string required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Server-side restricted topic check
        const lowerMessage = message.toLowerCase()
        const hasRestricted = RESTRICTED_TOPICS.some(topic => lowerMessage.includes(topic))
        if (hasRestricted) {
            return new Response(
                JSON.stringify({
                    content: "I can't assist with that topic. I'm Alice, your legal AI assistant, and I can only help with legal documents, contracts, and law-related questions.\n\nDisclaimer: This is not legal advice. Consult a qualified attorney.",
                    blocked: true
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── Build messages with server-enforced system prompt ──────
        // Truncate conversation history to last 6 messages to prevent context window abuse
        const recentHistory = conversationHistory.slice(-6)
        const messages = [
            { role: 'system', content: LEGAL_SYSTEM_PROMPT },
            ...recentHistory,
            { role: 'user', content: message },
        ]

        // ── Call AI API ────────────────────────────────────────────
        const aiApiKey = Deno.env.get('AI_API_KEY')
        const aiBaseUrl = Deno.env.get('AI_BASE_URL') || 'https://aicredits.in/v1'
        const aiModel = Deno.env.get('AI_MODEL') || 'google/gemini-flash-latest'

        if (!aiApiKey) {
            return new Response(
                JSON.stringify({ error: 'AI API key not configured on server' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const aiResponse = await fetch(`${aiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiApiKey}`,
            },
            body: JSON.stringify({
                model: aiModel,
                messages,
                stream: false,
                temperature: 0.6,
                max_tokens: CHATBOT_MAX_TOKENS,
                top_p: 0.9,
            }),
        })

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text().catch(() => '')
            return new Response(
                JSON.stringify({ error: `AI API error: HTTP ${aiResponse.status}`, details: errorText }),
                { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const aiData = await aiResponse.json()
        const content = aiData.choices?.[0]?.message?.content ?? ''

        return new Response(
            JSON.stringify({ content, model: aiModel }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('ai-chat error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', message: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
