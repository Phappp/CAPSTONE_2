export type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
};

export type ChatbotReference = {
    type: 'course' | 'lesson' | 'roadmap-step';
    id: number;
    slug?: string;
    title?: string;
    level?: string;
    price?: number;
    has_certificate?: boolean;
    progress_percent?: number;
    // For roadmap-step type
    description?: string;
    skills?: string[];
    estimatedWeeks?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    order?: number;
};

export type ChatbotQuickReply = {
    text: string;
    value: string;
};

export type ChatbotAction =
    | { type: 'enroll'; courseId: number; courseTitle: string }
    | { type: 'create_order'; courseId: number; orderId: number; paymentUrl: string; amount: number; courseTitle: string }
    | { type: 'enrollment_conflict'; courseId: number; courseTitle: string }
    | { type: 'faq'; category: 'policy' | 'payment' | 'technical' | 'certificate' | 'account' }
    | { type: 'roadmap'; roadmapId: string; topic: string }
    | { type: 'career'; careerId: string }
    | { type: 'comparison'; topic1: string; topic2: string }
    | { type: 'error'; message: string }
    | null;

export type RoadmapStep = {
    order: number;
    title: string;
    description: string;
    skills: string[];
    estimatedWeeks: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
};

export type RoadmapResponse = {
    id: string;
    title: string;
    description: string;
    targetCareer: string;
    totalDurationMonths: number;
    steps: RoadmapStep[];
};

export type ChatbotResponse = {
    reply: string;
    references: ChatbotReference[];
    quickReplies: ChatbotQuickReply[];
    action?: ChatbotAction;
    roadmap?: RoadmapResponse;
};

export interface ChatbotService {
    processMessage(
        userId: number,
        message: string,
        conversationHistory?: ChatMessage[],
        enrolledCourseIds?: number[]
    ): Promise<ChatbotResponse>;
}
