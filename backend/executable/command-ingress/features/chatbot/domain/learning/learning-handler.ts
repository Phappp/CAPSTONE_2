/**
 * Learning Handler - handles all learning mode logic.
 * Pure copy of existing learning logic from service.ts.
 */
import { ChatMessage, LearningContext, ChatbotResponse, ChatbotQuickReply } from '../../types';
import { OpenRouterClient } from '../llm-client';
import { validateQuickReplies } from '../shared';

interface LearningDependencies {
    llmClient: OpenRouterClient;
}

export class LearningHandler {
    private readonly deps: LearningDependencies;

    constructor(deps: LearningDependencies) {
        this.deps = deps;
    }

    async process(
        _userId: number,
        message: string,
        conversationHistory?: ChatMessage[],
        learningContext?: LearningContext
    ): Promise<ChatbotResponse> {
        console.log('[Chatbot Debug] Processing learning message:', message);
        console.log('[Chatbot Debug] Learning context:', JSON.stringify(learningContext, null, 2));

        const intent = this.detectLearningIntent(message, learningContext);
        console.log('[Chatbot Debug] Detected learning intent:', intent);

        const contextInfo = this.buildLearningContextInfo(learningContext);
        const systemPrompt = this.buildLearningSystemPrompt(contextInfo);
        const userPrompt = this.buildLearningUserPrompt(message, learningContext, intent);

        const llmResponse = await this.deps.llmClient.chat([
            { role: 'system', content: systemPrompt },
            ...(conversationHistory || []).slice(-10).map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            { role: 'user', content: userPrompt }
        ]);

        let reply = llmResponse;
        let quickReplies: ChatbotQuickReply[] = [];

        try {
            const parsed = JSON.parse(llmResponse);
            if (typeof parsed === 'object') {
                reply = parsed.reply || llmResponse;
                quickReplies = validateQuickReplies(parsed.quickReplies);
            }
        } catch {
            reply = llmResponse;
            quickReplies = this.getLearningQuickReplies(learningContext, intent);
        }

        return {
            reply: reply,
            references: [],
            quickReplies: quickReplies.length > 0 ? quickReplies : this.getLearningQuickReplies(learningContext, intent),
            action: null
        };
    }

    private detectLearningIntent(message: string, ctx?: LearningContext): string {
        const lower = message.toLowerCase();

        if (ctx?.droppedNode) {
            const nodeType = ctx.droppedNode.type;
            if (lower.includes('hướng dẫn') || lower.includes('làm sao') || lower.includes('guide')) {
                return `guide_${nodeType}`;
            }
            if (lower.includes('giải thích') || lower.includes('nói gì') || lower.includes('explain')) {
                return `explain_${nodeType}`;
            }
            if (lower.includes('tóm tắt') || lower.includes('sum')) {
                return `summarize_${nodeType}`;
            }
            return `query_${nodeType}`;
        }

        if (lower.includes('tóm tắt') || lower.includes('tổng kết') || lower.includes('sum') || lower.includes('summary')) {
            return 'summary';
        }
        if (lower.includes('quiz') || lower.includes('kiểm tra') || lower.includes('thi')) {
            return 'quiz_help';
        }
        if (lower.includes('bài tập') || lower.includes('assignment') || lower.includes('nộp bài')) {
            return 'assignment_help';
        }
        if (lower.includes('tiến độ') || lower.includes('progress') || lower.includes('đã học')) {
            return 'progress';
        }
        if (lower.includes('cấu trúc') || lower.includes('chương') || lower.includes('module') || lower.includes('bài học')) {
            return 'structure';
        }
        if (lower.includes('giải thích') || lower.includes('nói gì') || lower.includes('là gì') || lower.includes('what')) {
            return 'explanation';
        }
        if (lower.includes('tiếp') || lower.includes('kế tiếp') || lower.includes('next')) {
            return 'next_lesson';
        }
        if (lower.includes('trước') || lower.includes('previous')) {
            return 'prev_lesson';
        }
        if (lower.includes('code') || lower.includes('lỗi') || lower.includes('bug')) {
            return 'code_help';
        }

        return 'general';
    }

    private buildLearningContextInfo(ctx?: LearningContext): string {
        if (!ctx) return 'Không có thông tin khóa học.';

        let info = `# THÔNG TIN KHÓA HỌC HIỆN TẠI\n\n`;
        info += `**Khóa học:** ${ctx.courseTitle}\n`;
        info += `**Tiến độ:** ${ctx.progressPercent}%\n`;
        info += `**Đã hoàn thành:** ${ctx.completedLessons}/${ctx.totalLessons} bài\n\n`;

        if (ctx.currentModuleTitle) {
            info += `**Module hiện tại:** ${ctx.currentModuleTitle}\n`;
        }
        if (ctx.currentLessonTitle) {
            info += `**Bài học hiện tại:** ${ctx.currentLessonTitle}`;
            if (ctx.currentLessonType) {
                info += ` (${ctx.currentLessonType})`;
            }
            info += `\n`;
        }

        if (ctx.modules && ctx.modules.length > 0) {
            info += `\n## CẤU TRÚC KHÓA HỌC:\n`;
            ctx.modules.forEach((mod, idx) => {
                info += `\n### Chương ${idx + 1}: ${mod.title}\n`;
                mod.lessons.forEach((lesson, lIdx) => {
                    const status = lesson.completed ? '✅' : '⬜';
                    info += `${status} ${lIdx + 1}. ${lesson.title} (${lesson.type})\n`;
                });
            });
        }

        return info;
    }

    private buildLearningSystemPrompt(contextInfo: string): string {
        return `Bạn là trợ lý học tập thông minh của nền tảng e-Learning.

PHONG CÁCH TRÒ CHUYỆN:
- Trả lời tự nhiên, thân thiện như đang trợ giúp bạn học
- Sử dụng emoji một cách hợp lý
- Gợi ý bài tiếp theo nếu phù hợp

QUY TẮC PHẢN HỒI:
1. Luôn dựa vào THÔNG TIN KHÓA HỌC HIỆN TẠI để trả lời
2. Nếu có dropped node (user kéo thả), ưu tiên trả lời về node đó
3. Nếu có attached content (file/text), phân tích và giải thích
4. Trả lời bằng tiếng Việt, có thể dùng markdown để format

QUICK REPLIES - Chỉ gợi ý khi hữu ích:
- "📋 Xem cấu trúc" → xem cấu trúc khóa học
- "📊 Tiến độ" → xem tiến độ học tập
- "📝 Tóm tắt" → tóm tắt bài học
- "📎 Bài tiếp" → gợi ý bài tiếp theo
- "❓ Hỏi đáp" → đặt câu hỏi

${contextInfo}

QUY TẮC QUAN TRỌNG:
- KHÔNG bịa đặt thông tin bài học nếu không có trong context
- Nếu không có đủ thông tin, nói rõ và gợi ý cách tìm hiểu thêm
- Hướng dẫn cụ thể, step-by-step cho quiz và assignment`;
    }

    private buildLearningUserPrompt(message: string, ctx?: LearningContext, intent?: string): string {
        let prompt = `Tin nhắn từ user: "${message}"\n\n`;

        if (ctx?.droppedNode) {
            prompt += `## USER ĐÃ KÉO THẢ:\n`;
            prompt += `**Loại:** ${ctx.droppedNode.type}\n`;
            prompt += `**Tên:** ${ctx.droppedNode.title}\n`;
            prompt += `**ID:** ${ctx.droppedNode.id}\n\n`;
        }

        if (ctx?.attachedContent) {
            prompt += `## NỘI DUNG ĐÍNH KÈM:\n`;
            prompt += `**Loại:** ${ctx.attachedContent.type}\n`;
            if (ctx.attachedContent.filename) {
                prompt += `**File:** ${ctx.attachedContent.filename}\n`;
            }
            prompt += `**Nội dung:**\n${ctx.attachedContent.content.substring(0, 2000)}\n\n`;
        }

        prompt += `## INTENT ĐÃ DETECT: ${intent || 'general'}\n`;

        return prompt;
    }

    private getLearningQuickReplies(ctx?: LearningContext, intent?: string): ChatbotQuickReply[] {
        const baseReplies: ChatbotQuickReply[] = [
            { text: '📋 Cấu trúc', value: 'xem cấu trúc khóa học' },
            { text: '📊 Tiến độ', value: 'xem tiến độ của tôi' },
        ];

        if (ctx?.currentLessonType === 'quiz') {
            return [
                ...baseReplies,
                { text: '📖 Hướng dẫn', value: 'hướng dẫn làm quiz' },
                { text: '⏱️ Thời gian', value: 'quiz có thời gian không' },
                { text: '🔄 Làm lại', value: 'có thể làm lại quiz không' },
            ];
        }

        if (ctx?.currentLessonType === 'assignment') {
            return [
                ...baseReplies,
                { text: '📝 Yêu cầu', value: 'yêu cầu bài tập là gì' },
                { text: '📤 Nộp bài', value: 'cách nộp bài' },
                { text: '📅 Hạn nộp', value: 'hạn nộp khi nào' },
            ];
        }

        if (ctx?.currentLessonType === 'video' || ctx?.currentLessonType === 'text') {
            return [
                ...baseReplies,
                { text: '📝 Tóm tắt', value: 'tóm tắt bài này' },
                { text: '❓ Hỏi đáp', value: `hỏi về: ${ctx.currentLessonTitle || 'bài này'}` },
                { text: '📋 Bài tập', value: 'xem bài tập' },
            ];
        }

        return baseReplies;
    }
}
