/**
 * LawCraft AI Client (Secure)
 *
 * All AI calls are now routed through authenticated Supabase Edge Functions.
 * NO API keys, NO direct external API calls from the browser.
 *
 * This file provides backward-compatible exports so existing components
 * (Chatbot, DocumentGenerator, AiSettings) continue to work while
 * being migrated to the new secureClient.ts API.
 */

import {
    secureChat,
    secureChatbot,
    secureHealthCheck,
    type DocumentGenerationInput,
    type DocumentGenerationResult,
    secureGenerateDocument,
} from './secureClient'

// ── Types (preserved for backward compatibility) ───────────────────
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface ChatCompletionOptions {
    temperature?: number
    maxTokens?: number
    topP?: number
}

// ── Chat completion (now goes through Edge Function) ───────────────
export async function chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
): Promise<string> {
    const result = await secureChat(messages, options)
    return result.content
}

// ── Streaming is not yet supported via Edge Functions ──────────────
// Fallback to non-streaming for now
export async function* chatCompletionStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
): AsyncGenerator<string, void, unknown> {
    const result = await chatCompletion(messages, options)
    // Simulate streaming by yielding chunks
    const words = result.split(' ')
    for (let i = 0; i < words.length; i++) {
        yield (i === 0 ? '' : ' ') + words[i]
    }
}

// ── Health check (tests if Edge Functions are reachable) ───────────
export async function healthCheck(): Promise<boolean> {
    return secureHealthCheck()
}

// ── Exported config for display (no secrets exposed) ───────────────
export const AI_CONFIG = {
    baseUrl: 'Supabase Edge Functions (Secure)',
    model: 'google/gemini-flash-latest',
    hasKey: true, // Key is stored server-side
    isSecure: true,
} as const

// ── Re-export new APIs ─────────────────────────────────────────────
export {
    secureChatbot,
    secureGenerateDocument,
    type DocumentGenerationInput,
    type DocumentGenerationResult,
}
