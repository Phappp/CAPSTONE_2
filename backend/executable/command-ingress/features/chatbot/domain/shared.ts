/**
 * Shared utilities for chatbot
 */

/**
 * Validate and sanitize quick replies from LLM response
 */
export function validateQuickReplies(qrs: any): Array<{ text: string; value: string }> {
    if (!Array.isArray(qrs)) return [];
    
    return qrs
        .filter((qr: any) => 
            qr && 
            typeof qr === 'object' && 
            typeof qr.text === 'string' && 
            typeof qr.value === 'string'
        )
        .map((qr: any) => ({
            text: String(qr.text).slice(0, 50),
            value: String(qr.value).slice(0, 200)
        }))
        .slice(0, 10); // Max 10 quick replies
}
