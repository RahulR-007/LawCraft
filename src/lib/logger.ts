/**
 * LawCraft Production Logger
 *
 * Environment-aware logger that suppresses verbose debug traces
 * in production builds (import.meta.env.PROD) while preserving full
 * console outputs during local development (import.meta.env.DEV).
 */

export const logger = {
    log: (...args: any[]) => {
        if (import.meta.env.DEV) {
            console.log('[LawCraft]', ...args)
        }
    },
    warn: (...args: any[]) => {
        if (import.meta.env.DEV) {
            console.warn('[LawCraft Warning]', ...args)
        }
    },
    error: (message: string, ...args: any[]) => {
        // Errors must be logged in all environments for production diagnostic visibility
        console.error('[LawCraft Error]', message, ...args)
    },
}
