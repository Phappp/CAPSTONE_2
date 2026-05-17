import { LanguageProvider, Locale } from './base';
import { vietnameseProvider } from './vietnamese';
import { englishProvider } from './english';

// Vietnamese-specific characters and patterns
const VI_CHARS_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const VI_WORDS_REGEX = /\b(tôi|bạn|mình|khóa|học|tìm|kiếm|đăng|ký|thanh|toán|chào|cảm ơn|muốn|cần|nào|ở đâu|vì sao|như thế nào)\b/gi;

// English word patterns (to boost English score)
const EN_WORDS_REGEX = /\b(how|what|which|can|could|would|should|where|when|who|why|do|does|did|i want|i need|i like|course|learn|study|class|enroll|register)\b/gi;

/**
 * Detect the language of a message
 * Priority:
 * 1. If message contains Vietnamese diacritics → Vietnamese (100% confident)
 * 2. If message has ONLY English words (no Vietnamese words at all) → English
 * 3. If message has Vietnamese words → Vietnamese
 * 4. Use provider detection patterns with balanced thresholds
 * 5. Default to Vietnamese (current system language)
 */
export function detectLanguage(message: string): Locale {
    const lowerMessage = String(message || '').toLowerCase();
    
    // Priority 1: Check for Vietnamese diacritics (most reliable indicator)
    const hasViChars = VI_CHARS_REGEX.test(lowerMessage);
    if (hasViChars) {
        return 'vi';
    }
    
    // Priority 2: Count word pattern matches
    const viWordMatches = lowerMessage.match(VI_WORDS_REGEX) || [];
    const enWordMatches = lowerMessage.match(EN_WORDS_REGEX) || [];
    
    // If message has Vietnamese words → Vietnamese (high confidence)
    if (viWordMatches.length > 0) {
        return 'vi';
    }
    
    // If message has English words and NO Vietnamese words → English
    // This handles pure English messages like "how to learn Python"
    if (enWordMatches.length > 0) {
        return 'en';
    }
    
    // Priority 3: Use provider detection patterns as fallback
    const viScore = vietnameseProvider.detectionPatterns.filter(p => p.test(lowerMessage)).length;
    const enScore = englishProvider.detectionPatterns.filter(p => p.test(lowerMessage)).length;
    
    // Balanced comparison: use same threshold for both languages
    if (enScore > viScore) {
        return 'en';
    }
    
    // Default to Vietnamese (current system language)
    return 'vi';
}

/**
 * Get the appropriate language provider based on message
 */
export function getLanguageProvider(message: string): LanguageProvider {
    const locale = detectLanguage(message);
    return locale === 'en' ? englishProvider : vietnameseProvider;
}

/**
 * Get all available providers
 */
export function getAllProviders(): LanguageProvider[] {
    return [vietnameseProvider, englishProvider];
}
