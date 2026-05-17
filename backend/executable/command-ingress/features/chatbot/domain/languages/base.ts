// Language Provider Types for Multilingual Support

export type TopicDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type TopicKnowledge = {
    ease_of_learning: string;
    best_for: string;
    job_demand: string;
    ecosystem: string;
    difficulty: TopicDifficulty;
};

export type QuickReply = {
    text: string;
    value: string;
};

export type Locale = 'vi' | 'en';

export interface LanguageProvider {
    readonly locale: Locale;
    readonly name: string;
    
    // System prompts
    readonly systemPrompt: string;
    readonly comparisonPrompt: string;
    
    // Topic knowledge (programming language comparisons)
    readonly topicKnowledge: Record<string, TopicKnowledge>;
    
    // Quick replies for common intents
    readonly quickReplies: {
        readonly greeting: QuickReply[];
        readonly courseSearch: QuickReply[];
        readonly outOfDomain: QuickReply[];
        readonly fallback: QuickReply[];
    };
    
    // Language detection patterns (regex)
    readonly detectionPatterns: RegExp[];
    
    // Response templates
    readonly responses: {
        readonly outOfDomain: string;
        readonly fallback: string;
        readonly cancel: string;
        readonly clarification: string;
        readonly greeting: string;
    };
}
