import { DataSource, MoreThan, LessThan, Between } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import Course from '../../../../../internal/model/course';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import User from '../../../../../internal/model/user';
import PaymentOrder from '../../../../../internal/model/payment_order';
import Module from '../../../../../internal/model/modules';
import Lesson from '../../../../../internal/model/lesson';
import { ChatbotService, ChatMessage, ChatbotAction } from '../types';
import { ChatbotResponse, ChatbotReference, ChatbotQuickReply } from '../types';
import { OpenRouterClient } from './llm-client';
import { findFAQByMessage, FAQItem } from './faq-knowledge';
import { findRoadmapByTopic, Roadmap } from './roadmap-data';
import { findCareerByKeyword, formatCareerInfo, CareerPath } from './career-data';

const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn khóa học thân thiện của nền tảng e-Learning.

PHONG CÁCH TRÒ CHUYỆN:
- Trả lời tự nhiên, thân thiện như đang chat với bạn bè
- Sử dụng emoji một cách hợp lý 😊
- Có thể trò chuyện thông thường ngoài việc tư vấn khóa học

QUY TẮC QUAN TRỌNG:
1. Nếu user hỏi về khóa học, đăng ký, hoặc cần hiển thị danh sách → trả về JSON
2. Nếu user chỉ chat thông thường → trả lời tự nhiên, không cần JSON
3. KHÔNG bắt buộc references nếu không có khóa học phù hợp
4. quickReplies chỉ khi thực sự hữu ích

KHI TRẢ LỜI VỀ KHÓA HỌC (dùng JSON):
{
  "reply": "Câu trả lời TỰ NHIÊN, có thể chứa thông tin khóa học trực tiếp ở đây",
  "references": [{"type":"course","id":1,"slug":"python","title":"Python cơ bản","price":0}],
  "quickReplies": [],
  "action": null
}

VÍ DỤ RESPONSE ĐẸP:

Case 1: User hỏi về khóa miễn phí
"Ơi, có khóa NodeJS miễn phí không vậy?"
→ {"reply": "Có đó bạn! NodeJS có vài khóa miễn phí khá hay 👇", "references": [...], "quickReplies": [], "action": null}

Case 2: User nói lặp (tự nhiên)
"Tôi muốn học khóa nodejs, như tôi muốn học khóa nodejs"
→ "Hihi, mình hiểu rồi! Bạn thích NodeJS phải không 😊 Để mình tìm cho bạn vài khóa hay nhé!"

Case 3: User hỏi giá cả
"Khóa kia giá bao nhiêu?"
→ "Khóa đó giá 299.000đ bạn nhé! Bạn có muốn mình hướng dẫn đăng ký không?"

Case 4: User muốn đăng ký MIỄN PHÍ
"enroll khóa python"
→ {"reply": "Đăng ký thành công! Chúc bạn học vui vẻ! 🎉", "references": [...], "quickReplies": [], "action": {"type":"enroll","courseId":5,"courseTitle":"Python cơ bản"}}

Case 5: User muốn đăng ký CÓ PHÍ
"đăng ký khóa React"
→ {"reply": "Khóa React giá 499.000đ nha. Bạn thanh toán để đăng ký nhé!", "references": [...], "quickReplies": [...], "action": null}

Case 6: User hỏi thông tin khóa học đang nhắc
"khóa này học gì?"
→ Dùng thông tin từ "KHÓA HỌC ĐANG ĐƯỢC NHẮC ĐẾN" trong context

Case 7: Chat thông thường
"chào bạn", "cảm ơn", "bye"
→ Trả lời tự nhiên, không cần JSON. Ví dụ: "Chào bạn! Rất vui được gặp 😊 Mình có thể giúp gì cho bạn hôm nay?"

|TUYỆT ĐỐI TUÂN THỦ QUY TẮC CHỐNG HALLUCINATION:
- CHỈ gợi ý khóa học từ DANH SÁCH KHÓA HỌC CÓ SẴN (AVAILABLE_COURSE) trong context
- TUYỆT ĐỐI KHÔNG tạo ra, bịa đặt, hoặc đề xuất khóa học không có trong danh sách
- TUYỆT ĐỐI KHÔNG thêm thông tin giá, tên, nội dung khóa học mà không có trong data
- Nếu DANH SÁCH KHÓA HỌC CÓ SẴN trống hoặc ghi "Không có khóa học phù hợp":
  → Trả lời: "Hiện tại mình chưa tìm được khóa học phù hợp với yêu cầu của bạn. Bạn thử hỏi chủ đề khác nhé!"
  → KHÔNG gợi ý bất kỳ khóa học nào, kể cả khóa miễn phí
- references CHỈ chứa khóa học thực sự có trong AVAILABLE_COURSE
- Nếu không có khóa học nào trong context, reply phải là TEXT THUẦN TÚY, không có references
`;

export class ChatbotServiceImpl implements ChatbotService {
    private dataSource: DataSource;
    private llmClient: OpenRouterClient;

        // Keywords that indicate user wants to find/search courses
    private readonly COURSE_SEARCH_INTENTS = [
        'tìm', 'tìm kiếm', 'tìm khóa học', 'tìm khóa', 'tìm course',
        'xem khóa', 'xem course', 'xem các khóa', 'danh sách khóa',
        'có khóa nào', 'còn khóa nào', 'khám phá', 'khám phá khóa',
        'muốn học', 'muốn tìm', 'cần khóa', 'cần tìm', 'học', 'học khóa',
        'gợi ý', 'gợi ý khóa', 'gợi ý khóa học',
        'show', 'list', 'search', 'find', 'recommend', 'suggest',
        'cho tôi', 'tôi muốn', 'mình muốn', 'bạn có',
    ];

    // Keywords that indicate user wants topic suggestions first
    private readonly NEEDS_TOPIC_PROMPT = [
        'mới', 'mới nhất', 'tìm mới', 'khóa mới',
        'gợi ý', 'gợi ý cho tôi', 'suggest', 'recommend',
        'chưa biết', 'chưa biết học gì', 'gợi ý đi',
    ];

    // Keywords that indicate user wants details about a course from conversation
    private readonly COURSE_DETAIL_INTENTS = [
        'chi tiết', 'thông tin thêm', 'thêm thông tin', 'giới thiệu thêm',
        'mô tả', 'nội dung', 'học gì', 'bài học', 'lộ trình',
        'khóa học này', 'course này', 'khóa này',
        'nó', 'của nó', 'của khóa',
        'phù hợp', 'dành cho', 'cho ai', 'ai học', 'trình độ',
        'giá', 'bao nhiêu', 'học phí', 'chi phí',
        'thời lượng', 'bao lâu', 'mất bao lâu',
        'chứng chỉ', 'certificate', 'cert',
        'yêu cầu', 'điều kiện', 'prerequisites',
        'module', 'lesson', 'chương',
    ];

    // Out-of-domain keywords - chatbot should redirect instead of trying to answer
    private readonly OUT_OF_DOMAIN_INTENTS = [
        'thời tiết', 'weather', 'tin tức', 'news', 'bóng đá', 'đá bóng',
        'game', 'trò chơi', 'phim', 'nhạc', 'nấu ăn', 'du lịch',
        'sức khỏe', 'y tế', 'thuốc', 'bệnh', 'đi khám',
        'nấu ăn', 'ẩm thực', 'thời trang', 'làm đẹp',
        'chứng khoán', 'đầu tư', 'bitcoin', 'crypto', 'forex',
        'tử vi', 'bói toán', 'tướng số', 'phong thủy',
        'mua sắm', 'shopee', 'lazada', 'amazon',
        'đặt đồ ăn', 'grab', 'gojek', 'ship',
    ];

    // Comparison keywords
    private readonly COMPARISON_INTENTS = [
        'so sánh', 'compar', 'khác nhau', 'nên chọn', 'cái nào',
        'hay hơn', 'tốt hơn', '优于', ' vs ', ' versus ',
        'đâu tốt hơn', 'nên học', 'học cái nào',
    ];

    // Roadmap keywords
    private readonly ROADMAP_INTENTS = [
        'lộ trình', 'roadmap', 'con đường', 'bắt đầu từ',
        'học từ đầu', 'step by step', 'theo thứ tự', 'thứ tự học',
        'nên học gì trước', 'học gì trước', 'học gì sau',
    ];

    // Career guidance keywords
    private readonly CAREER_INTENTS = [
        'nghề', 'career', 'làm nghề', 'job', 'mức lương', 'salary',
        'trở thành', 'học gì để làm', 'lộ trình nghề',
        'kỹ năng cần', 'skills', 'yêu cầu nghề',
    ];

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
        // Check if this is a payment quick reply (format: "pay_{courseId}")
        const payMatch = String(message).match(/^pay_(\d+)$/i);
        if (payMatch) {
            const courseId = parseInt(payMatch[1], 10);
            return this.handlePaymentRequest(userId, courseId);
        }

        // Check if user wants to cancel
        if (['hủy', 'cancel', 'không', 'no'].includes(String(message).toLowerCase().trim())) {
            return {
                reply: 'Đã hủy thao tác. Bạn cần mình hỗ trợ gì khác không?',
                references: [],
                quickReplies: [
                    { text: 'Tìm khóa học', value: 'tìm khóa học' },
                    { text: 'Khóa học của tôi', value: 'khóa học của tôi' },
                ],
                action: null,
            };
        }

        // ========== FAQ / POLICY DETECTION ==========
        // Check FAQ knowledge base BEFORE other processing
        const faqMatch = findFAQByMessage(message);
        if (faqMatch) {
            console.log('[Chatbot Debug] FAQ match found:', faqMatch.id);
            return {
                reply: faqMatch.answer,
                references: [],
                quickReplies: faqMatch.quickReplies || [],
                action: { type: 'faq', category: faqMatch.category },
            };
        }

        // ========== OUT-OF-DOMAIN DETECTION ==========
        if (this.isOutOfDomain(message)) {
            console.log('[Chatbot Debug] Out-of-domain message detected');
            return {
                reply: 'Oops, mình chỉ hỗ trợ về khóa học thôi nha 😅 Bạn cần mình tư vấn khóa học gì không?',
                references: [],
                quickReplies: [
                    { text: 'Tìm khóa học', value: 'gợi ý khóa học' },
                    { text: 'Khóa miễn phí', value: 'khóa miễn phí' },
                    { text: 'Lộ trình học', value: 'lộ trình học backend' },
                ],
                action: null,
            };
        }

        // ========== ROADMAP DETECTION ==========
        const roadmapIntent = this.detectRoadmapIntent(message);
        if (roadmapIntent) {
            console.log('[Chatbot Debug] Roadmap intent detected:', roadmapIntent);
            const roadmap = findRoadmapByTopic(roadmapIntent.topic);
            if (roadmap) {
                return this.generateRoadmapResponse(roadmapIntent.topic, roadmap);
            }
        }

        // ========== CAREER GUIDANCE DETECTION ==========
        const careerIntent = this.detectCareerIntent(message);
        if (careerIntent) {
            console.log('[Chatbot Debug] Career intent detected:', careerIntent);
            if (careerIntent === 'general') {
                // Show general career guidance
                return {
                    reply: `Mình có thể tư vấn về các nghề nghiệp trong ngành IT sau:

🖥️ **Developer:** Frontend, Backend, Fullstack, Mobile
🤖 **AI/Data:** AI Engineer, Data Scientist, Data Analyst
☁️ **DevOps:** DevOps Engineer, Cloud Engineer
📱 **Mobile:** iOS, Android Developer

Bạn quan tâm đến nghề nào nhất?`,
                    references: [],
                    quickReplies: [
                        { text: 'Backend Developer', value: 'backend developer là gì' },
                        { text: 'AI Engineer', value: 'học gì để làm AI Engineer' },
                        { text: 'Frontend Developer', value: 'frontend developer là gì' },
                    ],
                    action: null,
                };
            }
            const career = findCareerByKeyword(careerIntent);
            if (career) {
                return this.generateCareerGuidanceResponse(career);
            }
        }

        // ========== COMPARISON DETECTION ==========
        const comparisonIntent = this.detectComparisonIntent(message);
        if (comparisonIntent) {
            console.log('[Chatbot Debug] Comparison intent detected:', comparisonIntent);
            return await this.generateComparisonResponse(comparisonIntent.topic1, comparisonIntent.topic2);
        }

        // Check if user is asking for details about a course mentioned in conversation
        const lowerMessage = String(message).toLowerCase().trim();

        // Detect simple chat (greetings, thanks, bye, etc.) - skip course search
        const simpleChatPatterns = [
            /^chào|^xin\s*chào|^hi|^hey|^hello|^hola/i,
            /cảm\s*ơn|cảm ơn|thank|thanks|tks/i,
            /^bye$|^tạm\s*biệt|^bai$|^byebye/i,
            /^[oó]i$|^[ô]i$|^ơi$/i, // "oi", "oi", "oi" without context
            /^[kck]$|^ok$|^okay$|^okes?$/i,
        ];
        const isSimpleChat = simpleChatPatterns.some(p => p.test(lowerMessage));
        
        // Check if message is just repeating/affirming without course context
        const isRepeating = /^(vâng|đúng|rồi|có|có đúng không|tôi muốn|tôi muốn|ích muốn|tôi muốn)/i.test(lowerMessage) 
            && !lowerMessage.includes('khóa') && !lowerMessage.includes('học');
        
        const isDetailIntent = this.COURSE_DETAIL_INTENTS.some(intent => lowerMessage.includes(intent));

        const isCourseSearchIntent = this.COURSE_SEARCH_INTENTS.some(intent => lowerMessage.includes(intent));

        // ========== RAG PATTERN: FLOW A vs FLOW B ==========

        // Step 1: Check if this is a vague request (no specific topic)
        const isVagueRequest = this.isVagueCourseRequest(message);

        if (isVagueRequest) {
            // Flow A: Return clarifying response (don't search DB)
            console.log('[Chatbot Debug] Vague request detected - returning clarify response');
            return this.getClarifyTopicResponse();
        }

        // Step 2: Extract specific topics and price filter for DB search (Flow B)
        const topics = this.extractTopicFromMessage(message);
        const priceFilter = this.extractPriceFilterFromMessage(message);
        console.log('[Chatbot Debug] Extracted topics:', topics);
        console.log('[Chatbot Debug] Price filter:', priceFilter);

        // Step 3: Only search DB if we have specific topics or price filter
        const courses = (topics.length > 0 || priceFilter)
            ? await this.getPublishedCourses(topics.length > 0 ? topics : undefined, priceFilter)
            : [];

        console.log('[Chatbot Debug] Courses found:', courses.length);
        const enrolledCourses = await this.getEnrolledCourses(userId);
        const userProfile = await this.getUserProfile(userId);

        // ========== OVERRIDE: If no courses found for specific search, return default response ==========
        // This prevents LLM from hallucinating courses that don't exist
        const isCourseSearchQuery = this.COURSE_SEARCH_INTENTS.some(intent => lowerMessage.includes(intent));
        if (isCourseSearchQuery && topics.length > 0 && courses.length === 0) {
            console.log('[Chatbot Debug] No courses found - returning override response');
            const topicList = topics.join(', ');
            return {
                reply: `Hiện tại mình chưa tìm được khóa học nào về "${topicList}" trong hệ thống. Bạn có thể thử hỏi chủ đề khác như Python, JavaScript, Machine Learning, Data Science, hay Cloud Computing nhé!`,
                references: [],
                quickReplies: [
                    { text: 'Xem tất cả khóa học', value: 'xem tất cả khóa học' },
                    { text: 'Gợi ý khóa miễn phí', value: 'khóa miễn phí' },
                    { text: 'Khóa Machine Learning', value: 'tìm khóa machine learning' },
                ],
                action: null,
            };
        }

        // If user is asking about a course from conversation history or search results, fetch details
        let recentCourseContext: any = null;
        if (isDetailIntent) {
            // First try to find from conversation history
            if (conversationHistory && conversationHistory.length > 0) {
                const lastCourse = this.findLastCourseFromHistory(conversationHistory);
                if (lastCourse) {
                    const recentCourses = await this.getCourseByName(lastCourse.name, lastCourse.id);
                    if (recentCourses.length > 0) {
                        recentCourseContext = recentCourses[0];
                    }
                }
            }
            // If no context from history, use the first course from search results
            if (!recentCourseContext && courses.length > 0) {
                const firstCourse = courses[0];
                const courseDetails = await this.getCourseByName(firstCourse.title, firstCourse.id);
                if (courseDetails.length > 0) {
                    recentCourseContext = courseDetails[0];
                }
            }
        }

        const contextInfo = this.buildContextInfo(courses, enrolledCourses, enrolledCourseIds || [], userProfile, recentCourseContext);
        const conversationContext = this.buildConversationContext(conversationHistory || []);

        const messages = [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            { role: 'system' as const, content: contextInfo },
            ...conversationContext,
            { role: 'user' as const, content: message },
        ];

        try {
            const response = await this.llmClient.chat(messages);
            console.log('[Chatbot] Raw LLM Response:', response);
            const parsed = this.parseAIResponse(response);

            // Handle enroll action immediately
            if (parsed.action?.type === 'enroll') {
                const enrollResult = await this.enrollCourse(userId, parsed.action.courseId);
                if (enrollResult.success) {
                    parsed.reply = `Bạn đã đăng ký thành công khóa ${parsed.action.courseTitle}! Chúc bạn học tốt!`;
                    parsed.action = {
                        type: 'enroll',
                        courseId: parsed.action.courseId,
                        courseTitle: parsed.action.courseTitle,
                    };
                } else {
                    parsed.reply = `Bạn đã đăng ký khóa ${parsed.action.courseTitle} trước đó rồi!`;
                    parsed.action = {
                        type: 'enrollment_conflict',
                        courseId: parsed.action.courseId,
                        courseTitle: parsed.action.courseTitle,
                    };
                }
            }

            return parsed;
        } catch (error: any) {
            console.error('[Chatbot] Error:', error);
            return this.getFallbackResponse();
        }
    }

    private async handlePaymentRequest(userId: number, courseId: number): Promise<ChatbotResponse> {
        try {
            // Get course info
            const courseRepo = this.dataSource.getRepository(Course);
            const course = await courseRepo.findOne({ where: { id: courseId } });

            if (!course) {
                return {
                    reply: 'Không tìm thấy khóa học này.',
                    references: [],
                    quickReplies: [
                        { text: 'Tìm khóa học', value: 'tìm khóa học' },
                    ],
                    action: { type: 'error', message: 'Course not found' },
                };
            }

            // Check if already enrolled
            const enrollmentRepo = this.dataSource.getRepository(CourseEnrollment);
            const existingEnrollment = await enrollmentRepo.findOne({
                where: { user_id: userId, course_id: courseId },
            });

            if (existingEnrollment) {
                return {
                    reply: `Bạn đã đăng ký khóa ${course.title} rồi! Bạn có thể vào học ngay.`,
                    references: [{
                        type: 'course',
                        id: course.id,
                        slug: course.slug,
                        title: course.title,
                    }],
                    quickReplies: [
                        { text: 'Vào học ngay', value: `vào khóa ${course.slug}` },
                    ],
                    action: {
                        type: 'enrollment_conflict',
                        courseId: course.id,
                        courseTitle: course.title,
                    },
                };
            }

            // Check if already has a pending or paid order
            const orderRepo = this.dataSource.getRepository(PaymentOrder);
            const existingOrder = await orderRepo.findOne({
                where: [
                    { user_id: userId, course_id: courseId, status: 'paid' as any },
                    { user_id: userId, course_id: courseId, status: 'pending' as any },
                ],
            });

            if (existingOrder) {
                if (existingOrder.status === 'paid') {
                    // Auto-enroll since already paid
                    await this.enrollCourse(userId, courseId);
                    return {
                        reply: `Bạn đã thanh toán khóa ${course.title}. Đã tự động đăng ký!`,
                        references: [{
                            type: 'course',
                            id: course.id,
                            slug: course.slug,
                            title: course.title,
                        }],
                        quickReplies: [
                            { text: 'Vào học ngay', value: `vào khóa ${course.slug}` },
                        ],
                        action: {
                            type: 'enroll',
                            courseId: course.id,
                            courseTitle: course.title,
                        },
                    };
                }

                // Check if pending order is expired - if so, create new order
                const isExpired = existingOrder.expired_at && new Date(existingOrder.expired_at) < new Date();
                if (isExpired) {
                    // Mark old order as expired
                    existingOrder.status = 'expired' as any;
                    await orderRepo.save(existingOrder);
                } else {
                    // Has valid pending order - return it
                    return {
                        reply: `Bạn đã có đơn thanh toán cho khóa ${course.title} đang chờ. Vui lòng hoàn tất thanh toán.`,
                        references: [{
                            type: 'course',
                            id: course.id,
                            slug: course.slug,
                            title: course.title,
                            price: course.price,
                        }],
                        quickReplies: [],
                        action: {
                            type: 'create_order',
                            courseId: course.id,
                            orderId: existingOrder.id,
                            paymentUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/mock-payment?order_id=${existingOrder.id}`,
                            amount: course.price,
                            courseTitle: course.title,
                        },
                    };
                }
            }

            // Create new order
            const order = orderRepo.create({
                user_id: userId,
                course_id: courseId,
                provider: 'momo' as any,
                status: 'pending' as any,
                amount: course.price,
                currency: 'VND',
                provider_order_ref: `MOMO_C${courseId}U${userId}_${Date.now()}`,
                expired_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
            });
            await orderRepo.save(order);

            const paymentUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/mock-payment?order_id=${order.id}`;

            return {
                reply: `Đã tạo đơn thanh toán cho khóa ${course.title}. Bạn có thể thanh toán ngay hoặc chọn phương thức khác.`,
                references: [{
                    type: 'course',
                    id: course.id,
                    slug: course.slug,
                    title: course.title,
                    price: course.price,
                    level: course.level,
                    has_certificate: course.has_certificate,
                }],
                quickReplies: [],
                action: {
                    type: 'create_order',
                    courseId: course.id,
                    orderId: order.id,
                    paymentUrl,
                    amount: course.price,
                    courseTitle: course.title,
                },
            };
        } catch (error: any) {
            console.error('[Chatbot] Payment error:', error);
            return {
                reply: 'Xảy ra lỗi khi tạo đơn thanh toán. Vui lòng thử lại.',
                references: [],
                quickReplies: [
                    { text: 'Thử lại', value: 'thử lại' },
                ],
                action: { type: 'error', message: error.message },
            };
        }
    }

    private async enrollCourse(userId: number, courseId: number): Promise<{ success: boolean; message?: string }> {
        try {
            const enrollmentRepo = this.dataSource.getRepository(CourseEnrollment);

            // Check if already enrolled
            const existing = await enrollmentRepo.findOne({
                where: { user_id: userId, course_id: courseId },
            });

            if (existing) {
                return { success: false, message: 'Already enrolled' };
            }

            // Create enrollment
            const enrollment = enrollmentRepo.create({
                user_id: userId,
                course_id: courseId,
                status: 'active',
                progress_percent: 0,
                enrolled_at: new Date(),
            });

            await enrollmentRepo.save(enrollment);
            return { success: true };
        } catch (error: any) {
            console.error('[Chatbot] Enroll error:', error);
            return { success: false, message: error.message };
        }
    }

    private async getPublishedCourses(
        keywords?: string[],
        priceFilter?: { type: 'free' | 'paid' | 'range'; minPrice?: number; maxPrice?: number } | undefined
    ): Promise<any[]> {
        const courseRepo = this.dataSource.getRepository(Course);
        
        // Build where conditions
        const whereConditions: any = { status: 'published' };
        
        // Filter by price - use MoreThan/LessThan/Between from typeorm
        if (priceFilter) {
            if (priceFilter.type === 'free') {
                whereConditions.price = 0;
            } else if (priceFilter.type === 'paid') {
                whereConditions.price = MoreThan(0);
            } else if (priceFilter.type === 'range') {
                // For range filters, we'll filter in memory after fetching
                // since typeorm conditions need to be built dynamically
            }
        }
        
        // Use find() with relations for modules and lessons
        const courses = await courseRepo.find({
            where: whereConditions,
            select: ['id', 'title', 'slug', 'short_description', 'level', 'category', 'price', 'has_certificate', 'estimated_hours', 'tags'],
            relations: {
                modules: {
                    lessons: true,
                },
            },
            order: { id: 'DESC' }
        });
        
        // Filter by keywords in memory (since TypeORM JSON search is tricky)
        let filteredCourses = courses;
        if (keywords && keywords.length > 0) {
            const lowerKeywords = keywords.map(k => k.toLowerCase());
            filteredCourses = courses.filter(course => {
                const titleMatch = course.title?.toLowerCase().includes(lowerKeywords[0]);
                const descMatch = course.short_description?.toLowerCase().includes(lowerKeywords[0]);
                const catMatch = course.category?.toLowerCase().includes(lowerKeywords[0]);
                const tagsMatch = Array.isArray(course.tags) && 
                    course.tags.some((tag: string) => lowerKeywords.some(kw => tag.toLowerCase().includes(kw)));
                return titleMatch || descMatch || catMatch || tagsMatch;
            });
        }
        
        // Apply price range filter in memory
        if (priceFilter && priceFilter.type === 'range') {
            filteredCourses = filteredCourses.filter(course => {
                const price = course.price || 0;
                if (priceFilter.minPrice !== undefined && price < priceFilter.minPrice) {
                    return false;
                }
                if (priceFilter.maxPrice !== undefined && price > priceFilter.maxPrice) {
                    return false;
                }
                return true;
            });
        }
        
        console.log('[Chatbot Debug] All published courses:', courses.length);
        console.log('[Chatbot Debug] Keywords:', keywords);
        console.log('[Chatbot Debug] Price filter:', priceFilter);
        console.log('[Chatbot Debug] Filtered courses:', filteredCourses.length, filteredCourses.map(c => c.title));
        
        return filteredCourses;
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

    private async getCourseByName(courseName: string, courseId?: number): Promise<any[]> {
        const courseRepo = this.dataSource.getRepository(Course);

        if (courseId) {
            const directCourse = await courseRepo.findOne({
                where: { id: courseId, status: 'published' as any },
                relations: {
                    modules: { lessons: true },
                },
            });
            if (directCourse) return [directCourse];
        }

        const lowerCourseName = courseName.toLowerCase();
        const allCourses = await courseRepo.find({
            where: { status: 'published' as any },
            relations: { modules: { lessons: true } },
        });

        return allCourses.filter(c => {
            const lowerTitle = c.title.toLowerCase();
            return lowerTitle.includes(lowerCourseName) ||
                   lowerCourseName.includes(lowerTitle) ||
                   this.calculateSimilarity(lowerTitle, lowerCourseName) > 0.5;
        }).slice(0, 1);
    }

    private buildContextInfo(
        courses: any[],
        enrolledCourses: any[],
        excludeCourseIds: number[],
        userProfile: any,
        recentCourseContext?: any
    ): string {
        const enrolledCourseIds = enrolledCourses.map((e) => e.id);
        const allExcludeIds = [...new Set([...enrolledCourseIds, ...excludeCourseIds])];

        const availableCourses = courses
            .filter((c) => !allExcludeIds.includes(c.id))
            .slice(0, 50);

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

        // Add recent course context if available
        let recentCourseInfo = '';
        if (recentCourseContext) {
            const modules = recentCourseContext.modules || [];
            const moduleSummary = modules.length > 0
                ? modules
                    .sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((mod: any, idx: number) => {
                        const lessons = mod.lessons?.filter((l: any) => l.is_published) || [];
                        const lessonTitles = lessons.map((l: any) => l.title).join(', ');
                        return `- Module ${idx + 1}: ${mod.title} (${lessons.length} bài: ${lessonTitles})`;
                    }).join('\n')
                : 'Chưa có nội dung';

            recentCourseInfo = `
KHÓA HỌC ĐANG ĐƯỢC NHẮC ĐẾN (dùng khi user hỏi về khóa này):
- Tên: ${recentCourseContext.title}
- Level: ${recentCourseContext.level || 'Không xác định'}
- Giá: ${recentCourseContext.price === 0 ? 'Miễn phí' : recentCourseContext.price?.toLocaleString('vi-VN') + ' VNĐ'}
- Chứng chỉ: ${recentCourseContext.has_certificate ? 'Có' : 'Không'}
- Nội dung chi tiết:
${moduleSummary}
`;
        }

        return `THÔNG TIN NGƯỜI DÙNG:
- Họ tên: ${userProfile.full_name}
- Đã đăng ký: ${enrolledCourses.length} khóa học
${recentCourseInfo}
DANH SÁCH KHÓA HỌC ĐÃ ĐĂNG KÝ (CHỈ ĐỂ THAM KHẢO - KHÔNG GỢI Ý NHỮNG KHÓA NÀY):
${enrolledList}

DANH SÁCH KHÓA HỌC CÓ SẴN (ƯU TIÊN GỢI Ý NHỮNG KHÓA NÀY):
${availableList}

QUY TẮC QUAN TRỌNG KHI GỢI Ý KHÓA HỌC (RAG PATTERN):
1. LUÔN ƯU TIÊN gợi ý khóa học từ DANH SÁCH KHÓA HỌC CÓ SẴN (AVAILABLE_COURSE)
2. KHÔNG gợi ý khóa từ DANH SÁCH KHÓA HỌC ĐÃ ĐĂNG KÝ
3. Nếu AVAILABLE_COURSE trống → thông báo và gợi ý chủ đề khác
4. Khi user hỏi "gợi ý khóa học" → trả về ít nhất 1 khóa từ AVAILABLE_COURSE

KHI TRẢ LỜI:
- reply có thể chứa thông tin khóa học tự nhiên (giá, level, nội dung...)
- references dùng để hiển thị thẻ khóa học bên dưới reply
- Khi user muốn đăng ký khóa học MIỄN PHÍ: action = {"type": "enroll", "courseId": X, "courseTitle": "..."}
- Khi user muốn đăng ký khóa học CÓ PHÍ: quickReply = {"text": "Thanh toán ngay", "value": "pay_X"}
- Khi user hỏi gợi ý/tìm khóa học: LUÔN ƯU TIÊN gợi ý từ DANH SÁCH KHÓA HỌC CÓ SẴN (chưa đăng ký), trả về ÍT NHẤT 1 khóa từ phần này
- KHÔNG gợi ý các khóa đã có trong DANH SÁCH KHÓA HỌC ĐÃ ĐĂNG KÝ
- Trả lời tự nhiên như đang chat với bạn, không cần quá formal`;
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

            const first = cleaned.indexOf('{');
            const last = cleaned.lastIndexOf('}');
            
            // If we find valid JSON braces, try to parse it
            if (first !== -1 && last !== -1 && last > first) {
                let jsonStr = cleaned.slice(first, last + 1);
                jsonStr = this.sanitizeJSON(jsonStr);

                try {
                    parsed = JSON.parse(jsonStr);
                } catch {
                    parsed = this.extractFieldsManually(cleaned);
                }
            } else {
                // No JSON found - treat as plain text response (natural chat)
                return {
                    reply: cleaned.slice(0, 3000),
                    references: [],
                    quickReplies: [],
                    action: null,
                };
            }

            if (parsed && typeof parsed === 'object') {
                const reply = this.sanitizeString(parsed.reply || parsed.content || cleaned.slice(0, 3000));
                const references = this.validateReferences(parsed.references);
                const quickReplies = this.validateQuickReplies(parsed.quickReplies);
                const action = this.validateAction(parsed.action);

                return {
                    reply: reply.slice(0, 3000),
                    references,
                    quickReplies,
                    action,
                };
            }

            // Parsed but invalid structure - return as plain text
            return {
                reply: cleaned.slice(0, 3000),
                references: [],
                quickReplies: [],
                action: null,
            };
        } catch (error) {
            console.error('[Chatbot] Parse error:', error);
        }

        // Fallback: return response as plain text
        return {
            reply: String(response).slice(0, 3000),
            references: [],
            quickReplies: [],
            action: null,
        };
    }

    private sanitizeJSON(jsonStr: string): string {
        // Strip markdown code blocks first
        jsonStr = jsonStr.replace(/```json\s*/gi, '');
        jsonStr = jsonStr.replace(/```\s*/g, '');
        
        jsonStr = jsonStr.replace(/\\"/g, '"');
        jsonStr = jsonStr.replace(/\\'/g, "'");
        jsonStr = jsonStr.replace(/""/g, '"');
        jsonStr = jsonStr.replace(/"([^"]*\{[^}]*\}[^"]*)"/g, (match, content) => {
            return `"${content.replace(/[{}]/g, '')}"`;
        });
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
        jsonStr = jsonStr.replace(/\n/g, '\\n');
        return jsonStr;
    }

    private extractFieldsManually(text: string): any {
        const result: any = {
            reply: '',
            references: [],
            quickReplies: [],
            action: null,
        };

        const replyMatch = text.match(/"reply"\s*:\s*"([^"]*)"/i);
        if (replyMatch) {
            result.reply = replyMatch[1];
        } else {
            result.reply = text.replace(/\{[^}]*\}/g, '').trim();
        }

        const refMatches = text.matchAll(/"references"\s*:\s*\[([^\]]*)\]/gi);
        for (const match of refMatches) {
            try {
                const refArray = JSON.parse(`[${match[1]}]`);
                result.references = this.validateReferences(refArray);
            } catch {
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

        const qrMatches = text.matchAll(/"quickReplies"\s*:\s*\[([^\]]*)\]/gi);
        for (const match of qrMatches) {
            try {
                const qrArray = JSON.parse(`[${match[1]}]`);
                result.quickReplies = this.validateQuickReplies(qrArray);
            } catch {
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

        // Extract action
        const actionMatch = text.match(/"action"\s*:\s*(\{[^}]*\})/i);
        if (actionMatch) {
            try {
                result.action = JSON.parse(actionMatch[1]);
            } catch {
                result.action = null;
            }
        }

        return result;
    }

    private validateAction(action: any): ChatbotAction {
        if (!action || typeof action !== 'object') return null;

        if (action.type === 'enroll' && typeof action.courseId === 'number') {
            return {
                type: 'enroll',
                courseId: action.courseId,
                courseTitle: this.sanitizeString(action.courseTitle || 'Khóa học'),
            };
        }

        if (action.type === 'create_order' && typeof action.courseId === 'number') {
            return {
                type: 'create_order',
                courseId: action.courseId,
                orderId: action.orderId,
                paymentUrl: action.paymentUrl,
                amount: typeof action.amount === 'number' ? action.amount : 0,
                courseTitle: this.sanitizeString(action.courseTitle || 'Khóa học'),
            };
        }

        if (action.type === 'enrollment_conflict' && typeof action.courseId === 'number') {
            return {
                type: 'enrollment_conflict',
                courseId: action.courseId,
                courseTitle: this.sanitizeString(action.courseTitle || 'Khóa học'),
            };
        }

        if (action.type === 'error') {
            return {
                type: 'error',
                message: this.sanitizeString(action.message || 'Unknown error'),
            };
        }

        return null;
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
            .replace(/[{}]/g, '')
            .replace(/\\+"/g, '"')
            .replace(/""/g, '"')
            .trim();
    }

    private getFallbackResponse(): ChatbotResponse {
        return {
            reply: 'Oops, mình gặp chút sự cố rồi 😅 Bạn thử hỏi lại được không? Hoặc liên hệ hỗ trợ nếu cần nhé!',
            references: [],
            quickReplies: [
                { text: 'Tìm khóa học', value: 'tìm khóa học' },
                { text: 'Hỏi lại', value: '__RETRY__' },
            ],
            action: null,
        };
    }

    // ============== Course Search Helpers ==============

    private getExploreCoursesResponse(): ChatbotResponse {
        return {
            reply: 'Bạn đang quan tâm chủ đề nào? Mình gợi ý vài lĩnh vực phổ biến nha 😊',
            references: [],
            quickReplies: [
                { text: 'Lập trình & CNTT', value: 'khóa lập trình' },
                { text: 'Marketing', value: 'khóa marketing' },
                { text: 'Design', value: 'khóa design' },
                { text: 'Kinh doanh', value: 'khóa kinh doanh' },
                { text: 'Ngoại ngữ', value: 'khóa ngoại ngữ' },
            ],
            action: null,
        };
    }

    private findLastCourseFromHistory(history: ChatMessage[]): { name: string; id?: number } | null {
        // Look at the last few messages to find course mentions
        const recentMessages = history.slice(-8);

        // Pattern 1: Extract from JSON references in assistant responses
        const jsonPattern = /"title"\s*:\s*"([^"]+)"/g;
        
        for (let i = recentMessages.length - 1; i >= 0; i--) {
            const msg = recentMessages[i];
            if (msg.role === 'assistant') {
                // Try to extract from JSON references
                let match;
                const matches: string[] = [];
                while ((match = jsonPattern.exec(msg.content)) !== null) {
                    matches.push(match[1]);
                }
                
                // Return the most recent course found in JSON
                if (matches.length > 0) {
                    // Also try to get the course ID if available
                    const idMatch = msg.content.match(/"id"\s*:\s*(\d+)/);
                    return {
                        name: matches[matches.length - 1],
                        id: idMatch ? parseInt(idMatch[1]) : undefined
                    };
                }
            }
        }

        // Pattern 2: Extract from text responses
        const textPatterns = [
            /([A-Z][a-zÀ-ỹ0-9\s]+(?:Bootcamp|Framework|thực Chiến|Cơ Bản|Nâng Cao|Advanced|Beginner|Foundation|Pro|Plus)?)/g,
            /khóa\s+["']?([\w\sÀ-ỹ]+?)["']?\s*(?:này|phù hợp|cho|bạn|giá|level)/gi,
            /dưới đây là ([\w\sÀ-ỹ]+?):/gi,
            /-\s*([\w\sÀ-ỹ]+?)\s*[\n|]/g,
        ];

        for (let i = recentMessages.length - 1; i >= 0; i--) {
            const msg = recentMessages[i];
            if (msg.role === 'assistant') {
                // Clean markdown formatting
                const cleanContent = msg.content
                    .replace(/[#*_`\[\]]/g, '')
                    .replace(/https?:\/\/\S+/g, '')
                    .trim();

                for (const pattern of textPatterns) {
                    pattern.lastIndex = 0;
                    let match;
                    while ((match = pattern.exec(cleanContent)) !== null) {
                        const courseName = match[1].trim();
                        // Validate - not too short, not generic words
                        if (courseName.length >= 3 && courseName.length <= 100) {
                            const genericWords = ['dưới đây', 'khóa học', 'danh sách', 'thông tin', 'chi tiết', 
                                'phù hợp', 'bạn', 'tôi', 'nào', 'gợi ý', 'mình', 'các', 'tất cả'];
                            if (!genericWords.some(w => courseName.toLowerCase().includes(w))) {
                                return { name: courseName };
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    }

    private async getCourseDetailResponse(userId: number, courseName: string, courseId?: number): Promise<ChatbotResponse> {
        try {
            let courses: any[] = [];
            
            // If we have the course ID, fetch directly
            if (courseId) {
                const courseRepo = this.dataSource.getRepository(Course);
                const directCourse = await courseRepo.findOne({
                    where: { id: courseId, status: 'published' },
                    relations: {
                        modules: {
                            lessons: true,
                        },
                    },
                });
                if (directCourse) {
                    courses = [directCourse];
                }
            }
            
            // If no course found by ID, search by name
            if (courses.length === 0) {
                courses = await this.getPublishedCourses([courseName], undefined);
            }
            
            if (courses.length === 0) {
                // Try fuzzy match - search all and find closest
                const allCourses = await this.getPublishedCourses([], undefined);
                const lowerCourseName = courseName.toLowerCase();
                const matched = allCourses.find(c => 
                    c.title.toLowerCase().includes(lowerCourseName) ||
                    lowerCourseName.includes(c.title.toLowerCase()) ||
                    this.calculateSimilarity(c.title.toLowerCase(), lowerCourseName) > 0.6
                );
                
                if (matched) {
                    return this.buildCourseDetailResponse(matched);
                }
                
                return {
                    reply: `Mình không tìm thấy khóa học "${courseName}" trong danh sách. Bạn muốn tìm khóa học khác không?`,
                    references: [],
                    quickReplies: [
                        { text: 'Tìm khóa học', value: 'tìm khóa học' },
                        { text: 'Xem tất cả', value: 'xem tất cả khóa học' },
                    ],
                    action: null,
                };
            }

            // Return details of the first matched course
            return this.buildCourseDetailResponse(courses[0]);
        } catch (error) {
            console.error('[Chatbot] Error getting course detail:', error);
            return this.getFallbackResponse();
        }
    }

    private buildCourseDetailResponse(course: any): ChatbotResponse {
        const priceText = course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString('vi-VN')} VNĐ`;
        const certText = course.has_certificate ? 'Có' : 'Không';
        const levelText = course.level || 'Không xác định';

        // Fetch modules and lessons
        const modules = course.modules || [];
        let contentText = '';

        if (modules.length > 0) {
            const moduleList = modules
                .sort((a: any, b: any) => a.order_index - b.order_index)
                .map((mod: any, idx: number) => {
                    const lessons = mod.lessons
                        ?.filter((l: any) => l.is_published)
                        ?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

                    const lessonList = lessons.length > 0
                        ? lessons.map((lesson: any) => {
                            const duration = lesson.duration_minutes
                                ? ` (${lesson.duration_minutes} phút)`
                                : '';
                            return `  • ${lesson.title}${duration}`;
                        }).join('\n')
                        : '  (Chưa có bài học)';

                    return `📁 Module ${idx + 1}: ${mod.title}\n${lessonList}`;
                }).join('\n\n');

            contentText = `\n📖 Nội dung khóa học:\n\n${moduleList}`;
        }

        return {
            reply: `📚 ${course.title}

Level: ${levelText}
Giá: ${priceText}
Chứng chỉ: ${certText}${contentText}

Bạn có muốn đăng ký khóa học này không?`,
            references: [{
                type: 'course',
                id: course.id,
                slug: course.slug,
                title: course.title,
                level: course.level,
                price: course.price,
                has_certificate: course.has_certificate,
            }],
            quickReplies: course.price === 0 
                ? [{ text: 'Đăng ký ngay', value: `enroll_${course.id}` }]
                : [{ text: 'Thanh toán ngay', value: `pay_${course.id}` }],
            action: null,
        };
    }

    private containsSpecificKeywords(message: string): boolean {
        // Common specific keywords that indicate user has a topic in mind
        const specificKeywords = [
            // Vietnamese
            'python', 'javascript', 'java', 'react', 'nodejs', 'angular', 'vue',
            'html', 'css', 'sql', 'docker', 'aws', 'git', 'typescript', 'c++', 'c#', 'ruby', 'php',
            'web', 'mobile', 'app', 'frontend', 'backend', 'fullstack', 'devops', 'data',
            'marketing', 'facebook', 'seo', 'content', 'ads', 'digital',
            'design', 'photoshop', 'illustrator', 'figma', 'ui', 'ux',
            'excel', 'word', 'powerpoint', 'tin học', 'văn phòng',
            'tiếng anh', 'tiếng nhật', 'tiếng trung', 'ngoại ngữ',
            'python', 'java', 'c++', 'lập trình',
            'business', 'kinh doanh', 'startup', 'quản lý',
            // English
            'programming', 'coding', 'development', 'software',
            'business', 'management', 'leadership',
            'language', 'english', 'japanese', 'chinese',
        ];

        return specificKeywords.some(kw => message.includes(kw));
    }

    // NEW: Detect vague requests that need clarification (RAG Pattern)
    private isVagueCourseRequest(message: string): boolean {
        const vaguePatterns = [
            'gợi ý khóa học', 'gợi ý cho tôi', 'gợi ý đi',
            'recommend', 'suggest',
            'tìm khóa học', 'tìm khóa', 'có khóa nào', 'còn khóa nào',
            'xem khóa', 'xem các khóa', 'danh sách khóa',
            'khám phá', 'khám phá khóa',
            'show courses', 'list courses', 'find courses',
        ];
        const lower = message.toLowerCase();

        const hasVagueIntent = vaguePatterns.some(p => lower.includes(p));
        const hasSpecificTopic = this.hasSpecificTopic(lower);

        return hasVagueIntent && !hasSpecificTopic;
    }

    // NEW: Check if message has specific topic keywords
    private hasSpecificTopic(message: string): boolean {
        const topics = [
            'java', 'python', 'react', 'nodejs', 'node.js', 'javascript',
            'typescript', 'c#', 'c++', 'go', 'rust', 'php', 'ruby',
            'swift', 'kotlin', 'flutter', 'react native',
            'sql', 'mongodb', 'postgresql', 'mysql', 'docker', 'kubernetes',
            'aws', 'azure', 'gcp',
            'html', 'css', 'angular', 'vue', 'nextjs', 'next.js',
            'spring', 'django', 'flask', 'laravel', 'express',
            'machine learning', 'deep learning', 'ai', 'data science', 'data',
            'excel', 'powerpoint', 'word',
            'marketing', 'seo', 'content', 'social media',
            'english', 'tiếng anh', 'tiếng nhật', 'tiếng trung',
            'design', 'photoshop', 'illustrator', 'figma',
            'lập trình', 'programming', 'coding',
            'web', 'mobile', 'app', 'frontend', 'backend', 'fullstack', 'devops',
            'kinh doanh', 'business', 'startup', 'quản trị', 'tài chính', 'kế toán',
            'git', 'linux', 'network', 'security',
        ];
        return topics.some(topic => message.includes(topic));
    }

    // NEW: Get clarifying response for vague requests (RAG Pattern Flow A)
    private getClarifyTopicResponse(): ChatbotResponse {
        return {
            reply: "Bạn muốn học về lĩnh vực nào? Mình gợi ý vài chủ đề phổ biến nhé!",
            references: [],
            quickReplies: [
                { text: "Lập trình", value: "học lập trình" },
                { text: "AI & Data", value: "học AI" },
                { text: "Thiết kế", value: "học design" },
                { text: "Marketing", value: "học marketing" },
                { text: "Ngoại ngữ", value: "học tiếng anh" },
                { text: "Kinh doanh", value: "học kinh doanh" },
            ],
            action: null,
        };
    }

    // NEW: Extract only specific topics for DB search (RAG Pattern)
    private extractTopicFromMessage(message: string): string[] {
        const lower = message.toLowerCase();
        const topics: string[] = [];

        const knownTopics = [
            'java', 'python', 'react', 'nodejs', 'javascript', 'typescript',
            'c#', 'c++', 'go', 'rust', 'php', 'ruby',
            'swift', 'kotlin', 'flutter', 'react native',
            'sql', 'mongodb', 'postgresql', 'mysql', 'docker', 'kubernetes',
            'html', 'css', 'angular', 'vue', 'nextjs', 'next.js', 'express',
            'spring', 'django', 'flask', 'laravel',
            'machine learning', 'deep learning', 'ai', 'data science',
            'excel', 'marketing', 'seo', 'english', 'tiếng anh',
            'design', 'photoshop', 'illustrator', 'figma',
            'lập trình', 'programming', 'coding',
            'web', 'mobile', 'app', 'frontend', 'backend', 'fullstack', 'devops',
            'kinh doanh', 'business', 'startup', 'quản trị', 'tài chính', 'kế toán',
            'git', 'linux', 'network', 'security',
        ];

        for (const topic of knownTopics) {
            if (lower.includes(topic)) {
                topics.push(topic);
            }
        }

        return topics;
    }

    // Price filter types
    private extractPriceFilterFromMessage(message: string): { type: 'free' | 'paid' | 'range'; minPrice?: number; maxPrice?: number } | undefined {
        const lower = message.toLowerCase();

        const freePatterns = [
            'miễn phí', 'free', 'không mất phí', '0đ', '0 vnđ',
            'miễn phi', 'free course', 'free class',
        ];

        const paidPatterns = [
            'trả phí', 'có phí', 'paid', 'mất phí', 'trả tiền',
            'affordable', 'cheap',
        ];

        // Check for free first
        for (const pattern of freePatterns) {
            if (lower.includes(pattern)) {
                return { type: 'free' };
            }
        }

        // Check for paid (any price > 0)
        for (const pattern of paidPatterns) {
            if (lower.includes(pattern)) {
                return { type: 'paid' };
            }
        }

        // Parse specific price amounts: "trên 4 triệu", "dưới 500k", "từ 1 đến 3 triệu"
        const pricePatterns = [
            // Pattern: "trên X triệu" / "trên X k" / "trên X"
            { regex: /trên\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|k|nghìn)?/i, operator: 'gt' },
            // Pattern: "dưới X triệu" / "dưới X k" / "dưới X"
            { regex: /dưới\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|k|nghìn)?/i, operator: 'lt' },
            // Pattern: "hơn X triệu"
            { regex: /hơn\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|k|nghìn)?/i, operator: 'gt' },
            // Pattern: "ít hơn X triệu"
            { regex: /ít\s*hơn\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|k|nghìn)?/i, operator: 'lt' },
            // Pattern: "dưới X"
            { regex: /<(\d+(?:[.,]\d+)?)/i, operator: 'lt' },
            // Pattern: "trên X"
            { regex: />(\d+(?:[.,]\d+)?)/i, operator: 'gt' },
        ];

        // Check for range pattern: "từ X đến Y" or "từ X - Y"
        const rangeMatch = lower.match(/(?:từ|from)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|k|nghìn)?\s*(?:đến|to|-)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|k|nghìn)?/i);
        if (rangeMatch) {
            const minPrice = this.parsePriceValue(rangeMatch[1], lower);
            const maxPrice = this.parsePriceValue(rangeMatch[2], lower);
            if (minPrice !== null && maxPrice !== null) {
                return { type: 'range', minPrice, maxPrice };
            }
        }

        // Check for single price with operator
        for (const { regex, operator } of pricePatterns) {
            const match = lower.match(regex);
            if (match) {
                const value = this.parsePriceValue(match[1], lower);
                if (value !== null) {
                    if (operator === 'gt') {
                        return { type: 'range', minPrice: value };
                    } else {
                        return { type: 'range', maxPrice: value };
                    }
                }
            }
        }

        return undefined;
    }

    // Parse price value from string (e.g., "4 triệu" -> 4000000, "500k" -> 500000)
    private parsePriceValue(value: string, message: string): number | null {
        const numValue = parseFloat(value.replace(',', '.'));
        if (isNaN(numValue)) return null;

        // Determine multiplier based on context
        const hasTriệu = message.includes('triệu');
        const hasK = /\bk\b/.test(message) || message.includes('nghìn');

        if (hasTriệu) {
            return Math.round(numValue * 1000000);
        } else if (hasK) {
            return Math.round(numValue * 1000);
        } else {
            // If number is small (<100), assume it's in thousands; otherwise assume it's already in VND
            if (numValue < 100) {
                return Math.round(numValue * 1000);
            }
            return Math.round(numValue);
        }
    }

    private extractKeywordsFromMessage(message: string): string[] {
        const lowerMsg = message.toLowerCase();

        // Remove common stopwords
        const stopwords = [
            'tìm', 'tìm kiếm', 'khóa', 'course', 'học', 'có', 'nào',
            'mới', 'nhất', 'gợi ý', 'muốn', 'cần', 'cho', 'tôi', 'bạn',
            'về', 'liên quan', 'theo', 'với', 'và', 'hay', 'hoặc',
            'show', 'list', 'search', 'find', 'new', 'latest',
            'please', 'can', 'i', 'me', 'want', 'need', 'looking',
        ];

        // Extract potential keywords
        let keywords = lowerMsg
            .split(/\s+/)
            .filter(word => word.length >= 2 && !stopwords.includes(word));

        // Clean up common phrases
        const phraseMappings: Record<string, string> = {
            'lập trình': 'lập trình',
            'tiếng anh': 'tiếng anh',
            'tiếng nhật': 'tiếng nhật',
            'kinh doanh': 'kinh doanh',
            'web': 'web',
            'app': 'app',
        };

        // Check for phrases first
        const foundKeywords: string[] = [];
        for (const [phrase, normalized] of Object.entries(phraseMappings)) {
            if (lowerMsg.includes(phrase)) {
                foundKeywords.push(normalized);
            }
        }

        // Add individual words
        for (const kw of keywords) {
            if (!foundKeywords.includes(kw) && kw.length >= 3) {
                foundKeywords.push(kw);
            }
        }

        return [...new Set(foundKeywords)].slice(0, 5);
    }

    private calculateSimilarity(str1: string, str2: string): number {
        // Simple Jaccard similarity based on character n-grams
        const getNgrams = (str: string, n: number = 2): Set<string> => {
            const ngrams = new Set<string>();
            for (let i = 0; i <= str.length - n; i++) {
                ngrams.add(str.slice(i, i + n));
            }
            return ngrams;
        };

        const ngrams1 = getNgrams(str1);
        const ngrams2 = getNgrams(str2);

        const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
        const union = new Set([...ngrams1, ...ngrams2]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    // ========== NEW: OUT-OF-DOMAIN DETECTION ==========
    private isOutOfDomain(message: string): boolean {
        const lower = message.toLowerCase();
        return this.OUT_OF_DOMAIN_INTENTS.some(keyword => lower.includes(keyword));
    }

    // ========== NEW: COMPARISON INTENT ==========
    private detectComparisonIntent(message: string): { topic1: string; topic2: string } | null {
        const lower = message.toLowerCase();

        // Check if this is a comparison request
        const hasComparisonKeyword = this.COMPARISON_INTENTS.some(keyword => lower.includes(keyword));
        if (!hasComparisonKeyword) {
            return null;
        }

        // Pattern to extract two topics being compared
        // Examples: "Java vs Python", "so sánh Java và Python", "Spring Boot hay .NET"
        const patterns = [
            /(\w+)\s*(?:vs|versus|v\s+|vs\.)\s*(\w+)/i,
            /so sánh\s+(.+?)\s+(?:với|vs|và|hay)\s+(.+?)(?:\?|$)/i,
            /(?:nên chọn|cái nào|hay hơn|tốt hơn)\s+(.+?)\s+(?:hay|với|vs|so với)\s+(.+?)(?:\?|$)/i,
        ];

        for (const pattern of patterns) {
            const match = lower.match(pattern);
            if (match) {
                return {
                    topic1: match[1].trim(),
                    topic2: match[2].trim(),
                };
            }
        }

        return null;
    }

    // ========== NEW: ROADMAP INTENT ==========
    private detectRoadmapIntent(message: string): { topic: string; duration?: number } | null {
        const lower = message.toLowerCase();

        // Check if this is a roadmap request
        const hasRoadmapKeyword = this.ROADMAP_INTENTS.some(keyword => lower.includes(keyword));
        if (!hasRoadmapKeyword) {
            return null;
        }

        // Extract topic from message
        const topics = this.extractTopicFromMessage(message);
        if (topics.length === 0) {
            return null; // Need a specific topic for roadmap
        }

        // Extract duration if specified (e.g., "trong 3 tháng", "6 tháng")
        const durationMatch = lower.match(/(\d+)\s*(tháng|month|weeks?|tuần)/i);
        const duration = durationMatch ? parseInt(durationMatch[1], 10) : undefined;

        return {
            topic: topics[0],
            duration,
        };
    }

    // ========== NEW: CAREER INTENT ==========
    private detectCareerIntent(message: string): string | null {
        const lower = message.toLowerCase();

        // Check if this is a career guidance request
        const hasCareerKeyword = this.CAREER_INTENTS.some(keyword => lower.includes(keyword));
        if (!hasCareerKeyword) {
            return null;
        }

        // Common career paths to detect
        const careerPaths = [
            'ai engineer', 'machine learning', 'data scientist', 'data analyst',
            'backend developer', 'backend dev', 'frontend developer', 'frontend dev',
            'fullstack developer', 'fullstack dev', 'mobile developer', 'mobile dev',
            'devops', 'cloud', 'security', 'cyber security',
            'ux designer', 'ui designer', 'product manager', 'data engineer',
        ];

        for (const career of careerPaths) {
            if (lower.includes(career)) {
                return career;
            }
        }

        // Generic career question
        if (lower.includes('nghề') || lower.includes('career') || lower.includes('làm nghề')) {
            return 'general';
        }

        return null;
    }

    // ========== NEW: GENERATE ROADMAP RESPONSE ==========
    private generateRoadmapResponse(topic: string, roadmap: Roadmap): ChatbotResponse {
        const stepsText = roadmap.steps.map(step => {
            const difficultyEmoji = {
                'beginner': '🟢',
                'intermediate': '🟡',
                'advanced': '🔴'
            }[step.difficulty];

            return `${step.order}. **${step.title}** ${difficultyEmoji}
   📝 ${step.description}
   ⏱️ ~${step.estimatedWeeks} tuần
   🛠️ ${step.skills.slice(0, 3).join(', ')}`;
        }).join('\n\n');

        const reply = `📚 **${roadmap.title}**

${roadmap.description}

**Thời gian ước tính:** ${roadmap.totalDurationMonths} tháng

---

${stepsText}

---

💡 *Bạn muốn mình gợi ý khóa học cho bước nào trước?*`;

        const references: any[] = roadmap.steps.map((step, index) => ({
            type: 'roadmap-step',
            id: index + 1,
            title: step.title,
            description: step.description,
            skills: step.skills,
            estimatedWeeks: step.estimatedWeeks,
            difficulty: step.difficulty,
            order: step.order,
        }));

        return {
            reply,
            references,
            quickReplies: [
                { text: `Gợi ý khóa cho bước 1`, value: `khóa học ${roadmap.steps[0].skills[0]}` },
                { text: 'Tìm khóa miễn phí', value: 'khóa miễn phí' },
                { text: 'Hỏi về nghề nghiệp', value: 'học gì để làm backend' },
            ],
            action: { type: 'roadmap', roadmapId: roadmap.id, topic },
            roadmap: {
                id: roadmap.id,
                title: roadmap.title,
                description: roadmap.description,
                targetCareer: roadmap.targetCareer,
                totalDurationMonths: roadmap.totalDurationMonths,
                steps: roadmap.steps,
            },
        };
    }

    // ========== NEW: GENERATE CAREER GUIDANCE RESPONSE ==========
    private generateCareerGuidanceResponse(career: CareerPath): ChatbotResponse {
        const reply = formatCareerInfo(career);

        return {
            reply,
            references: [],
            quickReplies: [
                { text: `Xem lộ trình học`, value: `lộ trình học ${career.title}` },
                { text: 'Tìm khóa học liên quan', value: `khóa ${career.courses?.[0] || ''}` },
                { text: 'So sánh với nghề khác', value: 'so sánh backend và frontend' },
            ],
            action: { type: 'career', careerId: career.id },
        };
    }

    // ========== NEW: GENERATE COMPARISON RESPONSE ==========
    private async generateComparisonResponse(topic1: string, topic2: string): Promise<ChatbotResponse> {
        // Search courses for both topics
        const courses1 = await this.getPublishedCourses([topic1]);
        const courses2 = await this.getPublishedCourses([topic2]);

        const hasCourses1 = courses1.length > 0;
        const hasCourses2 = courses2.length > 0;

        let reply = `So sánh **${topic1}** và **${topic2}**:\n\n`;

        // Basic comparison text
        reply += `| Tiêu chí | ${topic1} | ${topic2} |\n`;
        reply += `|----------|-----------|-----------|\n`;
        reply += `| Khóa học có sẵn | ${hasCourses1 ? `${courses1.length} khóa` : 'Không có'} | ${hasCourses2 ? `${courses2.length} khóa` : 'Không có'} |\n`;

        if (hasCourses1) {
            const avgPrice1 = courses1.reduce((sum, c) => sum + (c.price || 0), 0) / courses1.length;
            const levels1 = [...new Set(courses1.map(c => c.level || 'N/A'))];
            reply += `| Mức giá TB | ${avgPrice1 === 0 ? 'Miễn phí' : avgPrice1.toLocaleString('vi-VN') + ' VNĐ'} | `;
        } else {
            reply += `| Mức giá TB | - | `;
        }

        if (hasCourses2) {
            const avgPrice2 = courses2.reduce((sum, c) => sum + (c.price || 0), 0) / courses2.length;
            reply += `${avgPrice2 === 0 ? 'Miễn phí' : avgPrice2.toLocaleString('vi-VN') + ' VNĐ'} |\n`;
        } else {
            reply += `- |\n`;
        }

        reply += `\n💡 **Nên chọn:**\n`;
        if (hasCourses1 && hasCourses2) {
            reply += `- Cả hai đều có khóa học chất lượng\n`;
        } else if (hasCourses1) {
            reply += `- **${topic1}** có nhiều khóa học hơn trên nền tảng\n`;
        } else if (hasCourses2) {
            reply += `- **${topic2}** có nhiều khóa học hơn trên nền tảng\n`;
        } else {
            reply += `- Mình chưa có khóa học cho cả hai chủ đề này\n`;
        }

        // Add course references
        const references: any[] = [
            ...courses1.slice(0, 2).map(c => ({
                type: 'course' as const,
                id: c.id,
                title: c.title,
                slug: c.slug,
                level: c.level,
                price: c.price,
                has_certificate: c.has_certificate,
            })),
            ...courses2.slice(0, 2).map(c => ({
                type: 'course' as const,
                id: c.id,
                title: c.title,
                slug: c.slug,
                level: c.level,
                price: c.price,
                has_certificate: c.has_certificate,
            })),
        ];

        return {
            reply,
            references,
            quickReplies: [
                { text: `Tìm khóa ${topic1}`, value: `khóa ${topic1}` },
                { text: `Tìm khóa ${topic2}`, value: `khóa ${topic2}` },
                { text: 'So sánh khác', value: 'so sánh python và java' },
            ],
            action: { type: 'comparison', topic1, topic2 },
        };
    }
}
