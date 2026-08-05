// supabase/functions/ai-proxy/index.ts
// Secure AI API proxy — runs on Supabase Edge Functions (Deno)
//
// Responsibilities:
//   1. Validate Supabase JWT (user must be authenticated)
//   2. Check user's token quota from the profiles table
//   3. Rate-limit by user ID (10 req / min)
//   4. Forward to aicredits.in with server-side secret key
//   5. Decrement user tokens on success
//   6. Return AI response to authenticated client

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// ── Rate limiter (in-memory, per-isolate) ──────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute

function checkRateLimit(userId: string): boolean {
    const now = Date.now()
    const entry = rateLimitMap.get(userId)

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
        return true
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        return false
    }

    entry.count++
    return true
}

// ── CORS headers ───────────────────────────────────────────────────
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── 1. Authenticate ────────────────────────────────────────
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

        // Verify the user's JWT
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── 2. Rate limit ──────────────────────────────────────────
        if (!checkRateLimit(user.id)) {
            return new Response(
                JSON.stringify({ error: 'Rate limit exceeded. Max 10 requests per minute.' }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── 3. Check token quota ───────────────────────────────────
        const { data: profile } = await supabase
            .from('profiles')
            .select('tokens, plan_name')
            .eq('id', user.id)
            .single()

        let availableTokens = 2
        if (profile) {
            availableTokens = profile.tokens
        } else {
            availableTokens = user.user_metadata?.tokens ?? 2
            // Auto-create profile for Google OAuth / new users if missing
            await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                fullname: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.fullname || 'User',
                tokens: 2,
                plan_name: 'Free'
            })
        }

        if (availableTokens <= 0) {
            return new Response(
                JSON.stringify({ error: 'No tokens remaining. Please upgrade your plan.' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── 4. Parse request body ──────────────────────────────────
        const body = await req.json()
        const { messages, options = {} } = body

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Invalid request: messages array required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ── 5. Forward to AI API with server-side secret ───────────
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
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096,
                top_p: options.topP ?? 0.9,
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

        // ── 6. Decrement tokens ────────────────────────────────────
        if (profile) {
            await supabase
                .from('profiles')
                .update({
                    tokens: Math.max(0, profile.tokens - 1),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
        } else {
            // Fallback: update user_metadata tokens
            const currentTokens = user.user_metadata?.tokens ?? 0
            await supabase.auth.admin.updateUserById(user.id, {
                user_metadata: { ...user.user_metadata, tokens: Math.max(0, currentTokens - 1) },
            })
        }

        // ── 7. Return response ─────────────────────────────────────
        return new Response(
            JSON.stringify({
                content,
                usage: aiData.usage,
                model: aiModel,
                tokensRemaining: profile ? Math.max(0, profile.tokens - 1) : undefined,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('ai-proxy error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error', message: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
