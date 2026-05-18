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

export type ChatMode = 'consult' | 'learning';

export interface ChatbotService {
    processMessage(
        userId: number,
        message: string,
        conversationHistory?: ChatMessage[],
        enrolledCourseIds?: number[],
        learningContext?: LearningContext,
        chatMode?: ChatMode,
        videoQuery?: { timestamp: number; rangeSeconds: number },
        specialCommand?: string
    ): Promise<ChatbotResponse>;
}

// ====== Learning Context Types ======
export type LessonType = 'video' | 'text' | 'quiz' | 'assignment';

export type DroppedNode = {
    type: 'module' | 'lesson' | 'quiz' | 'assignment' | 'video' | 'text';
    id: number;
    title: string;
    content?: DroppedNodeContent;
};

export type DroppedNodeContent = {
    // Video/Text transcript
    transcript?: string | null;
    segments?: Array<{ start_sec: number; end_sec: number; text: string }>;
    // Quiz questions
    questions?: Array<{
        id: number;
        question_text: string;
        options: Array<{ id: number; option_text: string; order_index: number }>;
    }>;
    // Assignment content
    description?: string;
    short_answer_questions?: Array<{ id: number; question_text: string; order_index: number }>;
    attachments?: Array<{ id: number; filename: string; url: string; mime_type: string | null }>;
};

export type AttachedContent = {
    type: 'file' | 'image' | 'code' | 'text';
    content: string;
    filename?: string;
    mimeType?: string;
};

export type ModuleInfo = {
    id: number;
    title: string;
    lessons: Array<{
        id: number;
        title: string;
        type: LessonType;
        completed: boolean;
    }>;
};

export type LearningContext = {
    courseId: number;
    courseTitle: string;
    courseSlug: string;
    progressPercent: number;
    totalLessons: number;
    completedLessons: number;
    currentLessonId?: number;
    currentLessonTitle?: string;
    currentLessonType?: LessonType;
    currentModuleId?: number;
    currentModuleTitle?: string;
    modules?: ModuleInfo[];
    droppedNode?: DroppedNode;
    attachedContent?: AttachedContent;
};
