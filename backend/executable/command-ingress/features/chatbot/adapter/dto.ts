export type ChatMessageInput = {
    role: 'user' | 'assistant';
    content: string;
};

export type ChatMode = 'consult' | 'learning';

export type LessonType = 'video' | 'text' | 'quiz' | 'assignment';

export type DroppedNode = {
    type: 'module' | 'lesson' | 'quiz' | 'assignment';
    id: number;
    title: string;
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

export type LearningContextInput = {
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

export class ChatbotMessageBody {
    message: string;
    chatMode?: ChatMode;
    conversationHistory?: ChatMessageInput[];
    enrolledCourseIds?: number[];
    learningContext?: LearningContextInput;

    constructor(body: any) {
        this.message = String(body?.message || '').trim();
        this.chatMode = ['consult', 'learning'].includes(body?.chatMode)
            ? body.chatMode
            : 'consult';
        this.conversationHistory = Array.isArray(body?.conversationHistory)
            ? body.conversationHistory.filter(
                  (m: any) =>
                      m &&
                      typeof m.role === 'string' &&
                      ['user', 'assistant'].includes(m.role) &&
                      typeof m.content === 'string'
              )
            : undefined;
        this.enrolledCourseIds = Array.isArray(body?.enrolledCourseIds)
            ? body.enrolledCourseIds.filter((id: any) => Number.isFinite(Number(id)))
            : undefined;
        this.learningContext = this.parseLearningContext(body?.learningContext);
    }

    private parseLearningContext(ctx: any): LearningContextInput | undefined {
        if (!ctx || typeof ctx !== 'object') return undefined;
        return {
            courseId: Number(ctx.courseId) || 0,
            courseTitle: String(ctx.courseTitle || ''),
            courseSlug: String(ctx.courseSlug || ''),
            progressPercent: Number(ctx.progressPercent) || 0,
            totalLessons: Number(ctx.totalLessons) || 0,
            completedLessons: Number(ctx.completedLessons) || 0,
            currentLessonId: ctx.currentLessonId ? Number(ctx.currentLessonId) : undefined,
            currentLessonTitle: ctx.currentLessonTitle ? String(ctx.currentLessonTitle) : undefined,
            currentLessonType: ctx.currentLessonType,
            currentModuleId: ctx.currentModuleId ? Number(ctx.currentModuleId) : undefined,
            currentModuleTitle: ctx.currentModuleTitle ? String(ctx.currentModuleTitle) : undefined,
            modules: Array.isArray(ctx.modules) ? ctx.modules : undefined,
            droppedNode: ctx.droppedNode,
            attachedContent: ctx.attachedContent,
        };
    }

    async validate(): Promise<{ ok: boolean; errors: string[] }> {
        const errors: string[] = [];
        if (!this.message) {
            errors.push('Tin nhắn không được để trống.');
        }
        if (this.message.length > 2000) {
            errors.push('Tin nhắn không được vượt quá 2000 ký tự.');
        }
        return { ok: errors.length === 0, errors };
    }
}
