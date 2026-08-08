// supabase/functions/verify-payment/index.ts
// Server-side Razorpay payment verification Edge Function
//
// Responsibilities:
//   1. Authenticate Supabase JWT (user must be signed in)
//   2. Validate Razorpay payment payload and HMAC-SHA256 signature (if secret present)
//   3. Update user profile tokens & plan_name securely using Supabase Service Role Key
//   4. Return updated token balance & plan status

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PLAN_TOKENS: Record<string, { name: string; tokens: number }> = {
    free: { name: 'Free', tokens: 2 },
    professional: { name: 'Professional', tokens: 20 },
    premium: { name: 'Premium', tokens: 40 },
}

async function verifyHmacSha256(data: string, secret: string, expectedSignature: string): Promise<boolean> {
    try {
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
        const hashArray = Array.from(new Uint8Array(signatureBuffer))
        const hexSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        return hexSignature === expectedSignature
    } catch (err) {
        console.error('HMAC verification error:', err)
        return false
    }
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Authenticate user JWT
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Parse payload
        const body = await req.json()
        const { planId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = body

        if (!planId || !PLAN_TOKENS[planId.toLowerCase()]) {
            return new Response(
                JSON.stringify({ error: 'Invalid plan ID specified' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!razorpayPaymentId) {
            return new Response(
                JSON.stringify({ error: 'Missing Razorpay payment ID' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Optional HMAC signature verification if razorpay secret is configured
        const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
        if (razorpaySecret && razorpayOrderId && razorpaySignature) {
            const isValid = await verifyHmacSha256(
                `${razorpayOrderId}|${razorpayPaymentId}`,
                razorpaySecret,
                razorpaySignature
            )
            if (!isValid) {
                return new Response(
                    JSON.stringify({ error: 'Invalid payment signature. Verification failed.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // 4. Upgrade user profile in database
        const selectedPlan = PLAN_TOKENS[planId.toLowerCase()]
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('tokens, plan_name')
            .eq('id', user.id)
            .single()

        const currentTokens = existingProfile?.tokens ?? 0
        const newTokens = Math.max(currentTokens, selectedPlan.tokens)

        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
                fullname: user.user_metadata?.fullname || user.user_metadata?.name || user.email,
                plan_name: selectedPlan.name,
                tokens: newTokens,
                updated_at: new Date().toISOString(),
            })

        if (updateError) {
            console.error('Failed to update user profile after payment:', updateError)
            return new Response(
                JSON.stringify({ error: 'Failed to update profile token balance', details: updateError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Also sync auth metadata for compatibility
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...user.user_metadata,
                plan_name: selectedPlan.name,
                tokens: newTokens,
            }
        })

        return new Response(
            JSON.stringify({
                success: true,
                message: `Successfully upgraded to ${selectedPlan.name} plan!`,
                planName: selectedPlan.name,
                tokens: newTokens,
                paymentId: razorpayPaymentId,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error: any) {
        console.error('verify-payment error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error during verification', message: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
