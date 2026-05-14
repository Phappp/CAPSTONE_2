export type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
};

export type ChatbotReference = {
    type: 'course' | 'lesson';
    id: number;
    slug?: string;
    title?: string;
};

export type ChatbotQuickReply = {
    text: string;
    value: string;
};

export type ChatbotResponse = {
    reply: string;
    references: ChatbotReference[];
    quickReplies: ChatbotQuickReply[];
};

export interface ChatbotService {
    processMessage(
        userId: number,
        message: string,
        conversationHistory?: ChatMessage[],
        enrolledCourseIds?: number[]
    ): Promise<ChatbotResponse>;
}
