// Language Module Exports
// This module provides multilingual support for the chatbot

// Types
export type { LanguageProvider, TopicKnowledge, QuickReply, Locale, TopicDifficulty } from './base';

// Language Providers
export { vietnameseProvider } from './vietnamese';
export { englishProvider } from './english';

// Language Detection
export { detectLanguage, getLanguageProvider, getAllProviders } from './detector';

// Re-export topic knowledge for convenience
export { TOPIC_KNOWLEDGE_VI } from './vietnamese';
export { TOPIC_KNOWLEDGE_EN } from './english';
