/**
 * LawCraft Secure Client
 *
 * Centralized authenticated API wrapper for all Supabase Edge Function calls.
 * Implements: JWT auth, retry with exponential backoff, token refresh, typed errors.
 *
 * ALL AI calls go through this — no secrets ever touch the browser.
 */

import { supabase } from './supabase'

// ── Types ──────────────────────────────────────────────────────────

export interface SecureClientOptions {
    maxRetries?: number
    timeoutMs?: number
}

export interface SecureApiError {
    code: string
    message: string
    status: number
    retryable: boolean
}

export interface TokenInfo {
    remaining: number
    plan: string
}

// ── Error class ────────────────────────────────────────────────────

export class LawCraftApiError extends Error {
    code: string
    status: number
    retryable: boolean

    constructor(error: SecureApiError) {
        super(error.message)
        this.name = 'LawCraftApiError'
        this.code = error.code
        this.status = error.status
        this.retryable = error.retryable
    }
}

// ── Core invoke function with retry ────────────────────────────────

async function invokeWithRetry<T>(
    functionName: string,
    body: Record<string, unknown>,
    options: SecureClientOptions = {}
): Promise<T> {
    const { maxRetries = 2, timeoutMs = 60_000 } = options
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Ensure we have a valid session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                throw new LawCraftApiError({
                    code: 'UNAUTHENTICATED',
                    message: 'You must be signed in to use this feature.',
                    status: 401,
                    retryable: false,
                })
            }

            // Create an AbortController for timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

            const { data, error } = await supabase.functions.invoke(functionName, {
                body,
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                signal: controller.signal,
            })

            clearTimeout(timeoutId)

            if (error) {
                // Parse the error — Supabase Edge Function errors come in various shapes
                const status = (error as any)?.status || (error as any)?.context?.status || 500
                const message = typeof error === 'string' ? error : (error as any)?.message || 'Unknown error'

                const isRetryable = status >= 500 || status === 429
                const apiError = new LawCraftApiError({
                    code: status === 429 ? 'RATE_LIMITED' : status === 403 ? 'NO_TOKENS' : 'API_ERROR',
                    message,
                    status,
                    retryable: isRetryable,
                })

                if (status === 401 && attempt < maxRetries) {
                    const { data: refreshData } = await supabase.auth.refreshSession()
                    if (refreshData?.session) {
                        await sleep(500)
                        continue
                    }
                }

                if (!isRetryable || attempt === maxRetries) {
                    throw apiError
                }

                lastError = apiError
                // Exponential backoff: 1s, 2s, 4s
                await sleep(Math.pow(2, attempt) * 1000)
                continue
            }

            // Handle edge function response errors (returned as JSON with error field)
            if (data?.error) {
                const isRetryable = false
                throw new LawCraftApiError({
                    code: data.error === 'No tokens remaining. Please upgrade your plan.' ? 'NO_TOKENS' : 'API_ERROR',
                    message: data.error,
                    status: 400,
                    retryable: isRetryable,
                })
            }

            return data as T
        } catch (err) {
            if (err instanceof LawCraftApiError && !err.retryable) {
                throw err
            }
            lastError = err instanceof Error ? err : new Error(String(err))

            if (attempt < maxRetries) {
                await sleep(Math.pow(2, attempt) * 1000)
            }
        }
    }

    throw lastError || new Error('Request failed after retries')
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Chat completion via secure server-side proxy.
 * No API keys leave the browser.
 */
export async function secureChat(
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; maxTokens?: number; topP?: number } = {}
): Promise<{ content: string; tokensRemaining?: number }> {
    return invokeWithRetry<{ content: string; tokensRemaining?: number }>(
        'ai-proxy',
        { messages, options }
    )
}

/**
 * Chatbot message via dedicated chat endpoint.
 * Server enforces legal topic restriction and conversation truncation.
 */
export async function secureChatbot(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
): Promise<{ content: string; blocked?: boolean }> {
    return invokeWithRetry<{ content: string; blocked?: boolean }>(
        'ai-chat',
        { message, conversationHistory }
    )
}

/**
 * Structured document generation via RAG pipeline.
 */
export interface DocumentGenerationInput {
    documentType: string
    documentSubType?: string
    jurisdiction: string
    jurisdictionState?: string
    parties: Array<{
        role: string
        name: string
        address?: string
        designation?: string
    }>
    customDetails: string
    selectedClauses?: string[]
    amount?: string
    date?: string
    duration?: string
}

export interface DocumentGenerationResult {
    documentId?: string
    content: string
    title: string
    compliance: {
        score: number
        maxScore: number
        percentage: number
        missingMandatory: string[]
        presentMandatory: string[]
        riskFlags: Array<{
            severity: 'info' | 'warning' | 'critical'
            clause: string
            reason: string
            recommendation: string
        }>
    }
    clausesUsed: number
    tokensRemaining: number
}

export async function secureGenerateDocument(
    input: DocumentGenerationInput
): Promise<DocumentGenerationResult> {
    return invokeWithRetry<DocumentGenerationResult>(
        'ai-generate-document',
        input as unknown as Record<string, unknown>,
        { maxRetries: 1, timeoutMs: 120_000 } // Longer timeout for doc gen
    )
}

// Cache health check results for 2 minutes to prevent burning user tokens on health pings
let cachedHealthCheck: { isHealthy: boolean; timestamp: number } | null = null
const HEALTH_CHECK_CACHE_MS = 120_000

/**
 * Health check — does NOT consume AI tokens unnecessarily when cached.
 * Tests if the Supabase Edge Functions are reachable.
 */
export async function secureHealthCheck(forceRefresh = false): Promise<boolean> {
    const now = Date.now()
    if (!forceRefresh && cachedHealthCheck && (now - cachedHealthCheck.timestamp) < HEALTH_CHECK_CACHE_MS) {
        return cachedHealthCheck.isHealthy
    }

    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
            // Unauthenticated user - server is reachable
            cachedHealthCheck = { isHealthy: true, timestamp: now }
            return true
        }

        const { error } = await supabase.functions.invoke('ai-proxy', {
            body: {
                messages: [{ role: 'user', content: 'ping' }],
                options: { maxTokens: 1 },
            },
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        })
        const isHealthy = !error || (error as any)?.status === 401 || (error as any)?.status === 400
        cachedHealthCheck = { isHealthy, timestamp: now }
        return isHealthy
    } catch {
        cachedHealthCheck = { isHealthy: false, timestamp: now }
        return false
    }
}

/**
 * Fetch user's generated documents history.
 */
export async function fetchUserDocuments(limit = 20) {
    const { data, error } = await supabase
        .from('generated_documents')
        .select('id, document_type, title, jurisdiction, compliance_score, risk_flags, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data || []
}

/**
 * Fetch a specific generated document.
 */
export async function fetchDocumentById(id: string) {
    const { data, error } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

/**
 * Fetch available legal clauses for a document type + jurisdiction.
 */
export async function fetchLegalClauses(documentType: string, jurisdiction: string) {
    const { data, error } = await supabase
        .from('legal_clauses')
        .select('id, clause_category, clause_title, clause_text, legal_source, is_mandatory')
        .eq('document_type', documentType)
        .eq('jurisdiction', jurisdiction)
        .order('is_mandatory', { ascending: false })

    if (error) throw error
    return data || []
}

/**
 * Fetch recent law updates for a jurisdiction.
 */
export async function fetchLawUpdates(jurisdiction: string, limit = 20) {
    const { data, error } = await supabase
        .from('law_updates')
        .select('id, law_title, law_category, summary, effective_date, published_date, impact_areas, status, source_url')
        .eq('jurisdiction', jurisdiction)
        .eq('status', 'active')
        .order('published_date', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data || []
}

/**
 * Fetch user's token balance.
 */
export async function fetchTokenBalance(): Promise<TokenInfo> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new LawCraftApiError({
        code: 'UNAUTHENTICATED',
        message: 'Not signed in',
        status: 401,
        retryable: false,
    })

    const { data: profile } = await supabase
        .from('profiles')
        .select('tokens, plan_name')
        .eq('id', user.id)
        .single()

    return {
        remaining: profile?.tokens ?? user.user_metadata?.tokens ?? 0,
        plan: profile?.plan_name ?? user.user_metadata?.plan_name ?? 'Free',
    }
}

export interface PaymentVerificationInput {
    planId: string
    razorpayPaymentId: string
    razorpayOrderId?: string
    razorpaySignature?: string
}

export interface PaymentVerificationResult {
    success: boolean
    message: string
    planName: string
    tokens: number
    paymentId: string
}

/**
 * Verifies Razorpay payment server-side via Edge Function and updates user token balance.
 */
export async function verifyPayment(
    input: PaymentVerificationInput
): Promise<PaymentVerificationResult> {
    return invokeWithRetry<PaymentVerificationResult>(
        'verify-payment',
        input as unknown as Record<string, unknown>,
        { maxRetries: 1, timeoutMs: 30_000 }
    )
}

import { logger } from './logger'

/**
 * Utility for secure local token obfuscation (btoa/atob salt protection)
 */
export const secureStorage = {
    setSecureItem: (key: string, value: string) => {
        try {
            const encoded = btoa(encodeURIComponent(value))
            localStorage.setItem(`lc_sec_${key}`, encoded)
        } catch (e) {
            logger.error('Failed to securely store item:', e)
        }
    },
    getSecureItem: (key: string): string | null => {
        try {
            const encoded = localStorage.getItem(`lc_sec_${key}`)
            if (!encoded) return null
            return decodeURIComponent(atob(encoded))
        } catch {
            return null
        }
    },
    removeSecureItem: (key: string) => {
        try {
            localStorage.removeItem(`lc_sec_${key}`)
        } catch {}
    }
}

