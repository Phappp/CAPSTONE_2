export type ChatMessageInput = {
    role: 'user' | 'assistant';
    content: string;
};

export class ChatbotMessageBody {
    message: string;
    conversationHistory?: ChatMessageInput[];
    enrolledCourseIds?: number[];

    constructor(body: any) {
        this.message = String(body?.message || '').trim();
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
