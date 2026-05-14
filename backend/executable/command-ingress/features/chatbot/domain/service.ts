import { DataSource } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import Course from '../../../../../internal/model/course';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import User from '../../../../../internal/model/user';
import { ChatbotService, ChatMessage } from '../types';
import { ChatbotResponse, ChatbotReference, ChatbotQuickReply } from '../types';
import { OpenRouterClient } from './llm-client';

const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn khóa học của nền tảng e-Learning.

CRITICAL - BẮT BUỘC PHẢI TUÂN THỦ:
Bạn PHẢI trả về JSON object hợp lệ duy nhất, KHÔNG có text nào ngoài JSON. Format:

{
  "reply": "Text tiếng Việt ngắn gọn (tối đa 1-2 câu), KHÔNG liệt kê thông tin khóa học ở đây",
  "references": [
    {"type": "course", "id": 123, "slug": "python-co-ban", "title": "Python cơ bản", "level": "Người mới bắt đầu", "price": 0, "has_certificate": true}
  ],
  "quickReplies": [
    {"text": "Câu hỏi ngắn", "value": "câu trả lời ngắn"}
  ]
}

TUYỆT ĐỐI CẤM:
❌ Liệt kê khóa học trong reply: "• Python - tiến độ 50%", "1. Python", "| Python | 50% |"
❌ Reply chứa thông tin chi tiết về khóa học (progress, giá, level, v.v.)
❌ Dùng markdown list, bảng, emoji để format thông tin khóa học trong reply
❌ Trả về text thuần túy thay vì JSON

LUÔN LÀM:
✅ MỖI khóa học phải đặt vào references với đầy đủ thông tin
✅ Reply chỉ là 1-2 câu giới thiệu ngắn gọn
✅ Thông tin chi tiết (progress, giá, level) chỉ nằm trong references

VÍ DỤ BẮT BUỘC TUÂN THEO:

Case 1: User hỏi về khóa học đã đăng ký
- Input: "Khóa học của tôi"
- Output BẮT BUỘC:
{
  "reply": "Bạn đang học 2 khóa học. Nhấn vào thẻ bên dưới để xem chi tiết:",
  "references": [
    {"type":"course","id":5,"slug":"python","title":"Python","progress_percent":66.67,"has_certificate":false},
    {"type":"course","id":8,"slug":"nodejs","title":"Nodejs","progress_percent":33.33,"has_certificate":true}
  ],
  "quickReplies": []
}

Case 2: User hỏi về khóa học miễn phí
- Input: "Có khóa học miễn phí nào?"
- Output BẮT BUỘC:
{
  "reply": "Dưới đây là các khóa học miễn phí bạn có thể tham gia:",
  "references": [
    {"type":"course","id":1,"slug":"python","title":"Python cơ bản","price":0,"level":"Người mới bắt đầu","has_certificate":true}
  ],
  "quickReplies": []
}

Case 3: User muốn gợi ý khóa học
- Input: "Gợi ý khóa học cho tôi"
- Output BẮT BUỘC:
{
  "reply": "Dựa trên sở thích của bạn, đây là các khóa học được đánh giá cao:",
  "references": [
    {"type":"course","id":3,"slug":"react","title":"React từ cơ bản đến nâng cao","level":"Trung cấp","price":299000,"has_certificate":true}
  ],
  "quickReplies": []
}

QUICK REPLIES: Đặt 2-3 câu hỏi gợi ý ngắn gọn, liên quan đến nội dung đang trả lời
`;

export class ChatbotServiceImpl implements ChatbotService {
    private dataSource: DataSource;
    private llmClient: OpenRouterClient;

    constructor() {
        this.dataSource = AppDataSource;
        this.llmClient = new OpenRouterClient();
    }

    async processMessage(
        userId: number,
        message: string,
        conversationHistory?: ChatMessage[],
        enrolledCourseIds?: number[]
    ): Promise<ChatbotResponse> {
        const courses = await this.getPublishedCourses();
        const enrolledCourses = await this.getEnrolledCourses(userId);
        const userProfile = await this.getUserProfile(userId);

        const contextInfo = this.buildContextInfo(courses, enrolledCourses, enrolledCourseIds || [], userProfile);
        const conversationContext = this.buildConversationContext(conversationHistory || []);

        const messages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            { role: 'system' as const, content: contextInfo },
            ...conversationContext,
            { role: 'user' as const, content: message },
        ];

        try {
            const response = await this.llmClient.chat(messages);
            return this.parseAIResponse(response);
        } catch (error: any) {
            console.error('[Chatbot] Error:', error);
            return this.getFallbackResponse();
        }
    }

    private async getPublishedCourses(): Promise<any[]> {
        const courseRepo = this.dataSource.getRepository(Course);
        const courses = await courseRepo.find({
            where: { status: 'published' as any },
            select: ['id', 'title', 'slug', 'short_description', 'level', 'category', 'price', 'has_certificate', 'estimated_hours'],
        });
        return courses;
    }

    private async getEnrolledCourses(userId: number): Promise<any[]> {
        const enrollmentRepo = this.dataSource.getRepository(CourseEnrollment);
        const enrollments = await enrollmentRepo.find({
            where: { user_id: userId },
            relations: ['course'],
        });
        return enrollments
            .filter((e) => e.course)
            .map((e) => ({
                id: e.course_id,
                title: (e.course as any)?.title,
                slug: (e.course as any)?.slug,
                status: e.status,
                progress_percent: e.progress_percent,
                has_certificate: (e.course as any)?.has_certificate,
            }));
    }

    private async getUserProfile(userId: number): Promise<any> {
        const userRepo = this.dataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: userId as any } });
        return user
            ? { id: user.id, full_name: user.full_name }
            : { id: userId, full_name: 'Bạn' };
    }

    private buildContextInfo(
        courses: any[],
        enrolledCourses: any[],
        excludeCourseIds: number[],
        userProfile: any
    ): string {
        const enrolledCourseIds = enrolledCourses.map((e) => e.id);
        const allExcludeIds = [...new Set([...enrolledCourseIds, ...excludeCourseIds])];

        const availableCourses = courses
            .filter((c) => !allExcludeIds.includes(c.id))
            .slice(0, 50);

        // Format enrolled courses with details for references
        const enrolledList =
            enrolledCourses.length > 0
                ? enrolledCourses
                      .map((e) => {
                          const cert = e.has_certificate ? 'Có cấp chứng chỉ' : 'Không cấp chứng chỉ';
                          return `[ENROLLED_COURSE] id=${e.id}|slug=${e.slug}|title=${e.title}|progress=${e.progress_percent}%|status=${e.status}|cert=${e.has_certificate}`;
                      })
                      .join('\n')
                : 'Chưa đăng ký khóa học nào';

        const availableList =
            availableCourses.length > 0
                ? availableCourses
                      .map(
                          (c) =>
                              `[AVAILABLE_COURSE] id=${c.id}|slug=${c.slug}|title=${c.title}|level=${c.level}|price=${c.price}|cert=${c.has_certificate}`
                      )
                      .join('\n')
                : 'Không có khóa học phù hợp';

        return `THÔNG TIN NGƯỜI DÙNG:
- Họ tên: ${userProfile.full_name}
- Đã đăng ký: ${enrolledCourses.length} khóa học

DANH SÁCH KHÓA HỌC ĐÃ ĐĂNG KÝ (LUÔN dùng cho references, KHÔNG viết trong reply):
${enrolledList}

DANH SÁCH KHÓA HỌC CÓ SẴN (dùng cho references khi gợi ý khóa học mới):
${availableList}

QUY TẮC BẮT BUỘC:
1. Khi đề cập khóa học đã đăng ký → dùng [ENROLLED_COURSE], điền vào references với fields: id, slug, title, progress_percent, has_certificate
2. Khi gợi ý khóa học mới → dùng [AVAILABLE_COURSE], điền vào references với fields: id, slug, title, level, price, has_certificate
3. reply TUYỆT ĐỐI KHÔNG chứa thông tin chi tiết khóa học (progress, giá, level, v.v.)
4. references tối đa 5 khóa học`;
    }

    private buildConversationContext(history: ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
        return history.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
        }));
    }

    private parseAIResponse(response: string): ChatbotResponse {
        try {
            let cleaned = String(response || '').trim();
            cleaned = cleaned.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

            let parsed: any = null;

            // Try to find and parse the JSON object
            const first = cleaned.indexOf('{');
            const last = cleaned.lastIndexOf('}');
            if (first !== -1 && last !== -1 && last > first) {
                let jsonStr = cleaned.slice(first, last + 1);

                // Fix common LLM JSON errors
                jsonStr = this.sanitizeJSON(jsonStr);

                try {
                    parsed = JSON.parse(jsonStr);
                } catch {
                    // Try to extract and fix individual fields
                    parsed = this.extractFieldsManually(cleaned);
                }
            } else {
                // Not a JSON-like response, try manual extraction
                parsed = this.extractFieldsManually(cleaned);
            }

            if (parsed && typeof parsed === 'object') {
                const reply = this.sanitizeString(parsed.reply || parsed.content || '');
                const references = this.validateReferences(parsed.references);
                const quickReplies = this.validateQuickReplies(parsed.quickReplies);

                return {
                    reply: reply.slice(0, 3000),
                    references,
                    quickReplies,
                };
            }

            // Fallback: clean the entire response
            return {
                reply: cleaned.slice(0, 3000),
                references: [],
                quickReplies: [],
            };
        } catch (error) {
            console.error('[Chatbot] Parse error:', error);
        }

        return {
            reply: String(response).slice(0, 3000),
            references: [],
            quickReplies: [
                { text: 'Khóa học miễn phí nào?', value: 'Khóa học miễn phí nào?' },
                { text: 'Các khóa học phổ biến', value: 'Các khóa học phổ biến nhất' },
                { text: 'Hướng dẫn đăng ký', value: 'Cách đăng ký khóa học' },
            ],
        };
    }

    private sanitizeJSON(jsonStr: string): string {
        // Fix escaped quotes issues like: \"value\":\"huy\"}
        jsonStr = jsonStr.replace(/\\"/g, '"');
        jsonStr = jsonStr.replace(/\\'/g, "'");

        // Fix double quotes issues like: "{""text"":"
        jsonStr = jsonStr.replace(/""/g, '"');

        // Fix curly braces inside strings that break JSON
        // e.g. "value":"xem{}" -> extract just the text
        jsonStr = jsonStr.replace(/"([^"]*\{[^}]*\}[^"]*)"/g, (match, content) => {
            // If it's inside a value field, clean it
            return `"${content.replace(/[{}]/g, '')}"`;
        });

        // Fix trailing commas
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

        // Fix unescaped newlines in strings
        jsonStr = jsonStr.replace(/\n/g, '\\n');

        return jsonStr;
    }

    private extractFieldsManually(text: string): any {
        const result: any = {
            reply: '',
            references: [],
            quickReplies: [],
        };

        // Check if text contains JSON-like structure but couldn't be parsed
        // Extract reply (text before first reference or quickReply)
        const replyMatch = text.match(/"reply"\s*:\s*"([^"]*)"/i);
        if (replyMatch) {
            result.reply = replyMatch[1];
        } else {
            // Use the entire text as reply if no structured data found
            result.reply = text.replace(/\{[^}]*\}/g, '').trim();
        }

        // Extract references
        const refMatches = text.matchAll(/"references"\s*:\s*\[([^\]]*)\]/gi);
        for (const match of refMatches) {
            try {
                const refArray = JSON.parse(`[${match[1]}]`);
                result.references = this.validateReferences(refArray);
            } catch {
                // Try to extract individual course objects
                const courseMatches = match[1].matchAll(/\{[^}]+\}/g);
                for (const cm of courseMatches) {
                    try {
                        const course = JSON.parse(cm[0]);
                        if (course.id || course.slug) {
                            result.references.push(course);
                        }
                    } catch {
                        // skip
                    }
                }
            }
        }

        // Extract quickReplies
        const qrMatches = text.matchAll(/"quickReplies"\s*:\s*\[([^\]]*)\]/gi);
        for (const match of qrMatches) {
            try {
                const qrArray = JSON.parse(`[${match[1]}]`);
                result.quickReplies = this.validateQuickReplies(qrArray);
            } catch {
                // Try to extract individual quickReply objects
                const qrObjMatches = match[1].matchAll(/\{[^}]*\}/g);
                for (const qm of qrObjMatches) {
                    try {
                        const qr = JSON.parse(qm[0]);
                        if (qr.text) {
                            result.quickReplies.push({
                                text: this.sanitizeString(qr.text),
                                value: this.sanitizeString(qr.value || qr.text),
                            });
                        }
                    } catch {
                        // skip
                    }
                }
            }
        }

        return result;
    }

    private validateReferences(refs: any): Array<{ type: 'course'; id: number; slug?: string; title?: string; level?: string; price?: number; has_certificate?: boolean; progress_percent?: number }> {
        if (!Array.isArray(refs)) return [];

        return refs
            .filter((r: any) => r && (r.id || r.slug))
            .map((r: any) => ({
                type: 'course' as const,
                id: Number(r.id) || 0,
                slug: this.sanitizeString(r.slug || ''),
                title: this.sanitizeString(r.title || 'Khóa học'),
                level: this.sanitizeString(r.level || ''),
                price: typeof r.price === 'number' ? r.price : undefined,
                has_certificate: Boolean(r.has_certificate),
                progress_percent: typeof r.progress_percent === 'number' ? r.progress_percent : undefined,
            }))
            .slice(0, 5);
    }

    private validateQuickReplies(qrs: any): Array<{ text: string; value: string }> {
        if (!Array.isArray(qrs)) return [];

        return qrs
            .filter((q: any) => q && q.text)
            .map((q: any) => ({
                text: this.sanitizeString(q.text),
                value: this.sanitizeString(q.value || q.text),
            }))
            .slice(0, 4);
    }

    private sanitizeString(str: any): string {
        if (typeof str !== 'string') return '';
        return str
            .replace(/[{}]/g, '') // Remove curly braces
            .replace(/\\+"/g, '"') // Fix escaped quotes
            .replace(/""/g, '"') // Fix double quotes
            .trim();
    }

    private getFallbackResponse(): ChatbotResponse {
        return {
            reply: 'Xin lỗi, mình gặp sự cố khi xử lý tin nhắn của bạn. Bạn có thể thử lại sau nhé? Hoặc liên hệ hỗ trợ để được giúp đỡ.',
            references: [],
            quickReplies: [
                { text: 'Tìm khóa học mới', value: 'tìm khóa học' },
                { text: 'Trợ giúp khác', value: 'trợ giúp' },
            ],
        };
    }
}
