import { DataSource, MoreThan, LessThan, Between } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import Course from '../../../../../internal/model/course';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import User from '../../../../../internal/model/user';
import PaymentOrder from '../../../../../internal/model/payment_order';
import Module from '../../../../../internal/model/modules';
import Lesson from '../../../../../internal/model/lesson';
import { ChatbotService, ChatMessage, ChatbotAction, LearningContext } from '../types';
import { ChatbotResponse, ChatbotReference, ChatbotQuickReply } from '../types';
import { OpenRouterClient } from './llm-client';
import { findFAQByMessage, FAQItem } from './faq-knowledge';
import { findRoadmapByTopic, Roadmap } from './roadmap-data';
import { findCareerByKeyword, formatCareerInfo, CareerPath } from './career-data';
import { getLanguageProvider, Locale, LanguageProvider } from './languages';

// ====== Types for Comparison Feature ======
type TopicKnowledge = {
    ease_of_learning: string;
    best_for: string;
    job_demand: string;
    ecosystem: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
};

type TopicStats = {
    courseCount: number;
    avgPrice: number | null;
    levels: string[];
};

// ====== Static Knowledge Data for Topic Comparison ======
const TOPIC_KNOWLEDGE: Record<string, TopicKnowledge> = {
    python: {
        ease_of_learning: 'Rất dễ, cú pháp đơn giản, lý tưởng cho người mới bắt đầu',
        best_for: 'AI/Machine Learning, Data Science, Automation, Backend nhẹ',
        job_demand: 'Rất cao, đặc biệt AI/ML, Data',
        ecosystem: 'Khổng lồ: numpy, pandas, pytorch, fastapi, django',
        difficulty: 'beginner',
    },
    java: {
        ease_of_learning: 'Yêu cầu hiểu OOP và typing chặt chẽ hơn Python',
        best_for: 'Backend enterprise, Android, hệ thống lớn, microservices',
        job_demand: 'Cao và ổn định, nhiều tập đoàn lớn dùng Java',
        ecosystem: 'Spring Boot, Hibernate, Android SDK',
        difficulty: 'intermediate',
    },
    javascript: {
        ease_of_learning: 'Dễ bắt đầu, có thể chạy trực tiếp trên trình duyệt',
        best_for: 'Web frontend, Fullstack, Node.js backend, Mobile (React Native)',
        job_demand: 'Rất cao, là ngôn ngữ phổ biến nhất thế giới',
        ecosystem: 'React, Vue, Angular, Next.js, Express, Node.js',
        difficulty: 'beginner',
    },
    typescript: {
        ease_of_learning: 'Khó hơn JS một chút do có typing, nhưng dễ tiếp cận nếu biết JS',
        best_for: 'Dự án lớn, enterprise, Fullstack type-safe',
        job_demand: 'Cao trong dự án nghiêm túc',
        ecosystem: 'Angular (mặc định), React + TS, Vue + TS, NestJS',
        difficulty: 'intermediate',
    },
    'c++': {
        ease_of_learning: 'Khó, cú pháp phức tạp, nhiều khái niệm low-level',
        best_for: 'Game, System programming, Embedded, Performance-critical',
        job_demand: 'Ổn định, đặc biệt trong game và system',
        ecosystem: 'STL, Unreal Engine, Unity (C#)',
        difficulty: 'advanced',
    },
    'c#': {
        ease_of_learning: 'Khá dễ, cú pháp clean, do Microsoft phát triển',
        best_for: 'Game (Unity), Desktop app, Backend .NET, Enterprise',
        job_demand: 'Cao trong doanh nghiệp, đặc biệt tại Việt Nam',
        ecosystem: '.NET, Unity, Xamarin, Blazor',
        difficulty: 'intermediate',
    },
    go: {
        ease_of_learning: 'Khá dễ, cú pháp tối giản, dễ đọc',
        best_for: 'Backend cloud, Microservices, DevOps, Network programming',
        job_demand: 'Tăng trưởng nhanh, đặc biệt trong cloud/SaaS',
        ecosystem: 'Gin, Echo, gRPC, Docker, Kubernetes',
        difficulty: 'intermediate',
    },
    rust: {
        ease_of_learning: 'Khó nhất trong các ngôn ngữ hiện đại, ownership system phức tạp',
        best_for: 'System programming, WebAssembly, Performance-critical, Security',
        job_demand: 'Đang tăng nhưng còn ít vị trí hơn Go/Python',
        ecosystem: 'Cargo, Rocket, Actix, WebAssembly',
        difficulty: 'advanced',
    },
    php: {
        ease_of_learning: 'Dễ bắt đầu, nhiều hosting hỗ trợ',
        best_for: 'Web backend, CMS (WordPress), Dynamic websites',
        job_demand: 'Giảm dần nhưng vẫn còn nhiều dự án cũ',
        ecosystem: 'Laravel, Symfony, WordPress, Magento',
        difficulty: 'beginner',
    },
    ruby: {
        ease_of_learning: 'Rất dễ, cú pháp thanh lịch, developer-friendly',
        best_for: 'Web backend, MVP, Scripting, Automation',
        job_demand: 'Ít phổ biến hơn, nhưng Ruby on Rails vẫn mạnh',
        ecosystem: 'Ruby on Rails, Sinatra, Jekyll',
        difficulty: 'beginner',
    },
    swift: {
        ease_of_learning: 'Khá dễ nếu biết Objective-C hoặc một OOP language',
        best_for: 'iOS app, macOS app, Apple ecosystem',
        job_demand: 'Cao nếu làm iOS, thị trường riêng',
        ecosystem: 'SwiftUI, UIKit, Xcode',
        difficulty: 'intermediate',
    },
    kotlin: {
        ease_of_learning: 'Dễ hơn Java, cú pháp hiện đại hơn',
        best_for: 'Android, Backend (Ktor, Spring Kotlin)',
        job_demand: 'Cao trong phát triển Android',
        ecosystem: 'Android Studio, Jetpack Compose, Spring',
        difficulty: 'intermediate',
    },
    react: {
        ease_of_learning: 'Dễ bắt đầu, có nhiều tutorial và community',
        best_for: 'Web frontend, SPA, Cross-platform (React Native)',
        job_demand: 'Rất cao, là framework frontend phổ biến nhất',
        ecosystem: 'Next.js, React Native, Redux, Zustand, Tailwind',
        difficulty: 'intermediate',
    },
    angular: {
        ease_of_learning: 'Có learning curve cao, nhiều concepts phải học',
        best_for: 'Enterprise web app, large-scale SPA',
        job_demand: 'Cao trong doanh nghiệp, đặc biệt enterprise',
        ecosystem: 'Angular Material, NgRx, RxJS',
        difficulty: 'advanced',
    },
    vue: {
        ease_of_learning: 'Dễ nhất trong 3 framework lớn (React, Angular, Vue)',
        best_for: 'Web frontend, SPA vừa và nhỏ, dự án nhanh',
        job_demand: 'Khá cao, đang tăng trưởng tốt',
        ecosystem: 'Nuxt.js, Vuex/Pinia, Vuetify',
        difficulty: 'beginner',
    },
    nodejs: {
        ease_of_learning: 'Dễ nếu đã biết JavaScript',
        best_for: 'Backend, API, real-time apps, microservices',
        job_demand: 'Rất cao, đặc biệt với JS fullstack',
        ecosystem: 'Express, NestJS, Fastify, Socket.io',
        difficulty: 'intermediate',
    },
    django: {
        ease_of_learning: 'Khá dễ, có admin panel built-in, batteries included',
        best_for: 'Backend, MVP, rapid development, Python projects',
        job_demand: 'Khá cao trong cộng đồng Python',
        ecosystem: 'Django REST Framework, Celery, PostgreSQL',
        difficulty: 'intermediate',
    },
    spring: {
        ease_of_learning: 'Learning curve cao, nhiều config, nhiều cách làm',
        best_for: 'Backend enterprise, Java microservice',
        job_demand: 'Rất cao trong doanh nghiệp Java',
        ecosystem: 'Spring Boot, Spring Security, Spring Data',
        difficulty: 'advanced',
    },
    docker: {
        ease_of_learning: 'Trung bình, có nhiều concepts cần hiểu',
        best_for: 'DevOps, Deployment, Microservices, CI/CD',
        job_demand: 'Rất cao, gần như bắt buộc trong DevOps',
        ecosystem: 'Docker Compose, Kubernetes, Helm',
        difficulty: 'intermediate',
    },
    kubernetes: {
        ease_of_learning: 'Khó, nhiều concepts và objects',
        best_for: 'Container orchestration, Cloud, DevOps',
        job_demand: 'Cao, đặc biệt trong cloud-native',
        ecosystem: 'Helm, kubectl, K9s, ArgoCD',
        difficulty: 'advanced',
    },
    sql: {
        ease_of_learning: 'Dễ học, cú pháp gần ngôn ngữ tự nhiên',
        best_for: 'Data analysis, Backend, Database management',
        job_demand: 'Rất cao, là kỹ năng bắt buộc',
        ecosystem: 'MySQL, PostgreSQL, SQL Server, MongoDB (NoSQL)',
        difficulty: 'beginner',
    },
    aws: {
        ease_of_learning: 'Rất nhiều services, có learning curve cao',
        best_for: 'Cloud computing, Backend infrastructure, Data',
        job_demand: 'Rất cao, certifications có giá trị cao',
        ecosystem: 'EC2, S3, Lambda, RDS, DynamoDB',
        difficulty: 'advanced',
    },
    flutter: {
        ease_of_learning: 'Dễ nếu biết Dart, hot reload nhanh',
        best_for: 'Cross-platform mobile, iOS + Android từ 1 codebase',
        job_demand: 'Đang tăng trưởng mạnh',
        ecosystem: 'Dart, Riverpod, BLoC, Firebase',
        difficulty: 'intermediate',
    },
    'react native': {
        ease_of_learning: 'Dễ nếu biết React, có thể reuse code web',
        best_for: 'Cross-platform mobile, iOS + Android',
        job_demand: 'Khá cao, đặc biệt startup',
        ecosystem: 'Expo, TypeScript, Redux, Firebase',
        difficulty: 'intermediate',
    },
    html: {
        ease_of_learning: 'Rất dễ, ngôn ngữ đánh dấu cơ bản nhất',
        best_for: 'Web development, là nền tảng web',
        job_demand: 'Bắt buộc cho web developer',
        ecosystem: 'HTML5, CSS3, Accessibility',
        difficulty: 'beginner',
    },
    css: {
        ease_of_learning: 'Dễ học, nhưng mastery thì khó',
        best_for: 'Web styling, responsive design, animations',
        job_demand: 'Bắt buộc cho frontend',
        ecosystem: 'Tailwind, Sass, Bootstrap, CSS-in-JS',
        difficulty: 'intermediate',
    },
};

// ====== Comparison System Prompt ======
const COMPARISON_SYSTEM_PROMPT = `Bạn là chuyên gia tư vấn học tập thông minh cho nền tảng e-Learning.

QUY TẮC PHẢN HỒI:
1. Bắt đầu bằng SO SÁNH NGẮN GỌN (2-3 câu) — cái nào phù hợp đối tượng nào
2. SO SÁNH THEO TIÊU CHÍ: Dễ học, Ứng dụng mạnh, Thị trường việc làm, Phù hợp với ai
3. NẾU USER ĐÃ HỌC → GỢI Ý CÁ NHÂN HÓA dựa trên khóa đã học, recommend bước tiếp theo
4. KẾT LUẬN: Nên học gì tiếp theo, roadmap cụ thể

TRẢ VỀ TEXT THUẦN TÚY (không phải JSON), format markdown đẹp.
KHÔNG render statistics thuần túy — phải có reasoning và tư vấn.
LUÔN đề cập khóa đã học của user nếu có.
Nếu cả 2 topic đều không có trong database, vẫn so sánh dựa trên kiến thức chuyên môn.
Phản hồi bằng tiếng Việt, tự nhiên và thân thiện.`;

const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn khóa học thân thiện của nền tảng e-Learning.

PHONG CÁCH TRÒ CHUYỆN:
- Trả lời tự nhiên, thân thiện như đang chat với bạn bè
- Sử dụng emoji một cách hợp lý 😊
- Có thể trò chuyện thông thường ngoài việc tư vấn khóa học

QUY TẮC OUTPUT BẮT BUỘC:
- CHỉ output JSON với 4 fields: reply, references, quickReplies, action
- TUYỆT ĐỐI KHÔNG output: analysis, thinking, reasoning, chain_of_thought, internal, notes
- Nếu trả JSON → reply BẮT BUỘC bằng tiếng Việt (không dùng tiếng Anh)
- Nếu chat thông thường → text tiếng Việt, không cần JSON

QUY TẮC QUAN TRỌNG:
1. Nếu user hỏi về khóa học, đăng ký, hoặc cần hiển thị danh sách → trả về JSON
2. Nếu user chỉ chat thông thường → trả lời tự nhiên bằng tiếng Việt, không cần JSON
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
- TUYỆT ĐỐI KHÔNG bịa thông tin về tiến độ học tập, chứng chỉ đã đạt được nếu không có trong data
- Nếu DANH SÁCH KHÓA HỌC CÓ SẴN trống hoặc ghi "Không có khóa học phù hợp":
  → Trả lời: "Hiện tại mình chưa tìm được khóa học phù hợp với yêu cầu của bạn. Bạn thử hỏi chủ đề khác nhé!"
  → KHÔNG gợi ý bất kỳ khóa học nào, kể cả khóa miễn phí
- references CHỈ chứa khóa học thực sự có trong AVAILABLE_COURSE
- Nếu không có khóa học nào trong context, reply phải là TEXT THUẦN TÚY, không có references

|CONTEXTUAL FOLLOW-UP (QUAN TRỌNG):
- Khi user hỏi "khóa liên quan", "khóa tiếp theo", "nên học gì sau" mà KHÔNG nêu tên chủ đề:
  → Phải dùng "CHỦ ĐỀ ĐANG ĐƯỢC NHẮC ĐẾN" trong context để xác định chủ đề
  → Ví dụ: "có khóa nào liên quan để tôi mua không" + context có "nodejs" → gợi ý khóa liên quan NodeJS
- Khi user nói "liên quan", "tiếp theo", "tương tự" mà context có enrolled courses:
  → Ưu tiên gợi ý khóa nâng cao/bổ sung cho khóa đã học
- KHÔNG bao giờ bỏ qua "CHỦ ĐỀ ĐANG ĐƯỢC NHẮC ĐẾN" để trả lời generic
- Nếu context KHÔNG có active topic và user hỏi "khóa liên quan":
  → Hỏi lại: "Bạn đang quan tâm đến chủ đề gì để mình gợi ý nhé?"
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

    // Related course keywords — user wants to find related/next courses
    private readonly RELATED_COURSE_INTENTS = [
        'liên quan', 'tiếp theo', 'tương tự', 'mở rộng', 'nâng cao',
        'bổ sung', 'học thêm', 'kế tiếp', 'next course', 'related',
        'nên học gì sau', 'học gì tiếp', 'bước tiếp theo',
        'rộng hơn', 'chuyên sâu', 'chuyên ngành',
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
        enrolledCourseIds?: number[],
        learningContext?: LearningContext,
        chatMode?: 'consult' | 'learning',
        videoQuery?: { timestamp: number; rangeSeconds: number },
        specialCommand?: string
    ): Promise<ChatbotResponse> {
        // ========== HANDLE SPECIAL COMMANDS ==========
        if (specialCommand === 'video_summary') {
            return await this.handleVideoSummary(userId, message, learningContext);
        }
        if (specialCommand === 'fetch_attachments') {
            return await this.handleFetchAttachments(userId, message, learningContext);
        }

        // ========== USER-SELECTED MODE ROUTING ==========
        // If user explicitly selected learning mode, prioritize learning support
        if (chatMode === 'learning') {
            console.log('[Chatbot Debug] User selected learning mode, prioritizing learning support');

            // Check if user is asking about enrolled courses (regardless of learningContext)
            const lower = message.toLowerCase();
            const isMyCoursesQuery = lower.includes('khóa học của tôi') || 
                                     lower.includes('course của tôi') || 
                                     lower.includes('đã đăng ký') || 
                                     lower.includes('enrolled') || 
                                     lower.includes('danh sách khóa');

            if (isMyCoursesQuery) {
                // Show enrolled courses even without learningContext
                const enrolledCourses = await this.getEnrolledCourses(userId);

                if (enrolledCourses.length === 0) {
                    return {
                        reply: 'Bạn chưa đăng ký khóa học nào. Hãy vào chế độ Tư vấn để tìm khóa học phù hợp nhé!',
                        references: [],
                        quickReplies: [
                            { text: 'Về chế độ Tư vấn', value: '__switch_to_consult__' },
                            { text: 'Tìm khóa học', value: 'tìm khóa học' },
                        ],
                        action: null,
                    };
                }

                return {
                    reply: `Bạn đã đăng ký ${enrolledCourses.length} khóa học:`,
                    references: enrolledCourses.map((course) => ({
                        type: 'course' as const,
                        id: course.id,
                        slug: course.slug,
                        title: course.title,
                        level: course.level,
                        price: course.price,
                        has_certificate: course.has_certificate,
                        progress_percent: course.progress_percent,
                    })),
                    quickReplies: [
                        { text: 'Về chế độ Tư vấn', value: '__switch_to_consult__' },
                        { text: 'Xem tiến độ', value: 'xem tiến độ của tôi' },
                    ],
                    action: null,
                };
            }

            // If learning context is available, use it
            if (learningContext && learningContext.courseId) {
                return this.processLearningMessage(userId, message, conversationHistory, learningContext, videoQuery);
            }
            // If no learning context, guide user to provide context
            return {
                reply: 'Bạn đang ở chế độ Hỗ trợ học tập. Để được giúp đỡ tốt nhất, hãy vào một khóa học và hỏi mình về bài học nhé! Hoặc bạn có thể kéo thả một bài học vào đây.',
                references: [],
                quickReplies: [
                    { text: 'Về chế độ Tư vấn', value: '__switch_to_consult__' },
                    { text: 'Khóa học của tôi', value: 'khóa học của tôi' },
                ],
                action: null,
            };
        }

        // ========== LEARNING CONTEXT DETECTION ==========
        // If learning context is provided AND user didn't explicitly select consult mode,
        // route to learning support mode
        if (chatMode !== 'consult' && learningContext && learningContext.courseId) {
            console.log('[Chatbot Debug] Learning context detected, routing to learning mode');
            return this.processLearningMessage(userId, message, conversationHistory, learningContext, videoQuery);
        }

        // ========== LANGUAGE DETECTION ==========
        // Detect language and get appropriate provider
        const langProvider = getLanguageProvider(message);
        console.log('[Chatbot Debug] Detected language:', langProvider.locale);

        // ====== HANDLE TYPO CONFIRMATION ======
        // User confirmed typo correction
        if (message.startsWith('__confirm_typo__:')) {
            const correctedTopic = message.replace('__confirm_typo__:', '');
            console.log('[Chatbot Debug] User confirmed typo correction, searching for:', correctedTopic);
            
            // Search courses with the corrected topic
            const courses = await this.getPublishedCourses([correctedTopic]);
            const enrolledCourses = await this.getEnrolledCourses(userId);
            
            if (courses.length === 0) {
                return {
                    reply: `Mình tìm thấy khóa học về **${correctedTopic.toUpperCase()}** nhưng hiện tại chưa có trong hệ thống. Bạn thử hỏi chủ đề khác nhé!`,
                    references: [],
                    quickReplies: langProvider.quickReplies.courseSearch,
                    action: null,
                };
            }
            
            // Filter out enrolled courses
            const availableCourses = courses.filter(c => !enrolledCourses.some(e => e.id === c.id));
            
            return {
                reply: `Đây là khóa học về **${correctedTopic.toUpperCase()}** mình tìm được cho bạn 👇`,
                references: availableCourses.slice(0, 5).map(course => ({
                    type: 'course' as const,
                    id: course.id,
                    slug: course.slug,
                    title: course.title,
                    level: course.level,
                    price: course.price,
                    has_certificate: course.has_certificate,
                })),
                quickReplies: [
                    { text: 'Tìm khóa khác', value: 'tìm khóa học khác' },
                    { text: 'Xem tất cả', value: 'xem tất cả khóa học' },
                ],
                action: null,
            };
        }
        
        // User said typo correction is not correct - search with original typed word
        if (message.startsWith('__typo_not_correct__:')) {
            const originalWord = message.replace('__typo_not_correct__:', '');
            console.log('[Chatbot Debug] User said typo is not correct, searching with:', originalWord);
            
            // Search with the original word as-is
            const courses = await this.getPublishedCourses([originalWord]);
            const enrolledCourses = await this.getEnrolledCourses(userId);
            
            if (courses.length === 0) {
                return {
                    reply: `Mình không tìm được khóa học nào liên quan đến "${originalWord}". Bạn thử mô tả chi tiết hơn hoặc hỏi về chủ đề khác nhé!`,
                    references: [],
                    quickReplies: langProvider.quickReplies.courseSearch,
                    action: null,
                };
            }
            
            // Filter out enrolled courses
            const availableCourses = courses.filter(c => !enrolledCourses.some(e => e.id === c.id));
            
            return {
                reply: `Mình tìm được vài khóa học liên quan đến "${originalWord}" 👇`,
                references: availableCourses.slice(0, 5).map(course => ({
                    type: 'course' as const,
                    id: course.id,
                    slug: course.slug,
                    title: course.title,
                    level: course.level,
                    price: course.price,
                    has_certificate: course.has_certificate,
                })),
                quickReplies: [
                    { text: 'Tìm khóa khác', value: 'tìm khóa học khác' },
                    { text: 'Xem tất cả', value: 'xem tất cả khóa học' },
                ],
                action: null,
            };
        }

        // Check if this is a payment quick reply (format: "pay_{courseId}")
        const payMatch = String(message).match(/^pay_(\d+)$/i);
        if (payMatch) {
            const courseId = parseInt(payMatch[1], 10);
            return this.handlePaymentRequest(userId, courseId);
        }

        // Check if user wants to cancel
        if (['hủy', 'cancel', 'không', 'no'].includes(String(message).toLowerCase().trim())) {
            return {
                reply: langProvider.responses.cancel,
                references: [],
                quickReplies: langProvider.quickReplies.courseSearch,
                action: null,
            };
        }

        // ========== OWNERSHIP CONFIRMATION DETECTION ==========
        // Handle "đã mua...đúng không" = user confirming enrollment, NOT payment request
        // Must be BEFORE FAQ to avoid misclassification
        const confirmMatch = this.detectOwnershipConfirmation(message);
        if (confirmMatch) {
            console.log('[Chatbot Debug] Ownership confirmation detected:', confirmMatch);
            return await this.handleOwnershipConfirmation(userId, confirmMatch.topic, confirmMatch.courseTitle);
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
                reply: langProvider.responses.outOfDomain,
                references: [],
                quickReplies: langProvider.quickReplies.outOfDomain,
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
            return await this.generateComparisonResponse(userId, comparisonIntent.topic1, comparisonIntent.topic2);
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
            return this.getClarifyTopicResponse(langProvider);
        }

        // Step 2: Extract specific topics — ALSO resolve from conversation history
        const { topics, potentialTypos } = this.extractTopicFromMessage(message);
        const priceFilter = this.extractPriceFilterFromMessage(message);

        // ====== NEW: Resolve topic from history if current message is a follow-up ======
        // Fixes: "có khóa nào liên quan" → topic from history
        const isFollowUpRequest = this.RELATED_COURSE_INTENTS.some(kw => lowerMessage.includes(kw))
            || lowerMessage.includes('khóa') && !topics.length;
        if (isFollowUpRequest && topics.length === 0) {
            const historyTopic = this.extractActiveTopicFromHistory(conversationHistory || []);
            if (historyTopic) {
                console.log('[Chatbot Debug] Resolved topic from history:', historyTopic);
                topics.push(historyTopic);
            }
        }

        console.log('[Chatbot Debug] Extracted topics:', topics);
        console.log('[Chatbot Debug] Potential typos:', potentialTypos);
        console.log('[Chatbot Debug] Price filter:', priceFilter);

        // ====== NEW: Handle potential typos - ask for confirmation ======
        if (potentialTypos.length > 0 && topics.length > 0) {
            const typo = potentialTypos[0];
            console.log('[Chatbot Debug] Detected potential typo:', typo);
            
            // Build confirmation message
            const typoDisplay = typo.typed.toUpperCase();
            const correctedDisplay = typo.corrected.toUpperCase();
            
            return {
                reply: `Mình nghĩ bạn có thể đang đề cập đến **${correctedDisplay}** thay vì "${typoDisplay}" phải không? 🤔

Nếu đúng thì mình sẽ tìm khóa học về **${correctedDisplay}** cho bạn nhé!`,
                references: [],
                quickReplies: [
                    { text: `Đúng rồi, tìm ${correctedDisplay}`, value: `__confirm_typo__:${typo.corrected}` },
                    { text: 'Không đúng', value: `__typo_not_correct__:${typo.typed}` },
                ],
                action: null,
            };
        }

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

        const activeTopic = topics.length > 0 ? topics[0] : null;
        const contextInfo = this.buildContextInfo(courses, enrolledCourses, enrolledCourseIds || [], userProfile, recentCourseContext, activeTopic, langProvider);
        const conversationContext = this.buildConversationContext(conversationHistory || []);

        const messages = [
            { role: 'system' as const, content: langProvider.systemPrompt },
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
                // Check if ANY keyword matches
                return lowerKeywords.some(keyword => {
                    const titleMatch = course.title?.toLowerCase().includes(keyword);
                    const descMatch = course.short_description?.toLowerCase().includes(keyword);
                    const catMatch = course.category?.toLowerCase().includes(keyword);
                    const tagsMatch = Array.isArray(course.tags) && 
                        course.tags.some((tag: string) => keyword.includes(tag.toLowerCase()) || tag.toLowerCase().includes(keyword));
                    return titleMatch || descMatch || catMatch || tagsMatch;
                });
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
                level: (e.course as any)?.level,
                price: (e.course as any)?.price,
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

    // ====== NEW: Extract active topic from conversation history ======
    // Resolves contextual references like "khóa liên quan" → "NodeJS"
    private extractActiveTopicFromHistory(history: ChatMessage[]): string | null {
        const KNOWN_TOPICS = [
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust',
            'php', 'ruby', 'swift', 'kotlin', 'dart',
            'react', 'angular', 'vue', 'nextjs', 'nodejs', 'node.js',
            'html', 'css', 'sass', 'tailwind',
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
            'docker', 'kubernetes', 'aws', 'azure', 'gcp',
            'django', 'flask', 'spring', 'spring boot', 'express', 'nestjs',
            'react native', 'flutter',
            'machine learning', 'deep learning', 'ai', 'data science',
            'git', 'linux', 'devops', 'ci/cd',
            'excel', 'powerpoint', 'word',
            'marketing', 'seo', 'content',
            'figma', 'photoshop', 'illustrator',
        ];

        // Look at last 6 messages (3 turns) for topic mentions
        const recentMessages = history.slice(-6);
        for (const msg of [...recentMessages].reverse()) {
            const lower = msg.content.toLowerCase();
            for (const topic of KNOWN_TOPICS) {
                if (lower.includes(topic)) {
                    return topic;
                }
            }
            // Also check for enrolled course titles
            if (msg.role === 'assistant' && msg.content.includes('khóa')) {
                const topicMatch = lower.match(/(?:python|java|javascript|typescript|c\+\+|c#|go|rust|php|ruby|swift|kotlin|dart|react|angular|vue|nextjs|nodejs|html|css|sql|docker|aws|git|excel|marketing|figma)/);
                if (topicMatch) return topicMatch[1];
            }
        }
        return null;
    }

    private buildContextInfo(
        courses: any[],
        enrolledCourses: any[],
        excludeCourseIds: number[],
        userProfile: any,
        recentCourseContext?: any,
        activeTopic?: string | null,
        langProvider?: LanguageProvider
    ): string {
        const enrolledCourseIds = enrolledCourses.map((e) => e.id);
        const allExcludeIds = [...new Set([...enrolledCourseIds, ...excludeCourseIds])];

        const availableCourses = courses
            .filter((c) => !allExcludeIds.includes(c.id))
            .slice(0, 50);

        const isEnglish = langProvider?.locale === 'en';

        const enrolledList =
            enrolledCourses.length > 0
                ? enrolledCourses
                      .map((e) => {
                          const cert = e.has_certificate 
                              ? (isEnglish ? 'Has certificate' : 'Có cấp chứng chỉ')
                              : (isEnglish ? 'No certificate' : 'Không cấp chứng chỉ');
                          return `[ENROLLED_COURSE] id=${e.id}|slug=${e.slug}|title=${e.title}|progress=${e.progress_percent}%|status=${e.status}|cert=${e.has_certificate}`;
                      })
                      .join('\n')
                : (isEnglish ? 'No courses enrolled yet' : 'Chưa đăng ký khóa học nào');

        const availableList =
            availableCourses.length > 0
                ? availableCourses
                      .map(
                          (c) =>
                              `[AVAILABLE_COURSE] id=${c.id}|slug=${c.slug}|title=${c.title}|level=${c.level}|price=${c.price}|cert=${c.has_certificate}`
                      )
                      .join('\n')
                : (isEnglish ? 'No suitable courses' : 'Không có khóa học phù hợp');

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
                : (isEnglish ? 'No content yet' : 'Chưa có nội dung');

            recentCourseInfo = `
${isEnglish ? 'CURRENTLY MENTIONED COURSE' : 'KHÓA HỌC ĐANG ĐƯỢC NHẮC ĐẾN'} (${isEnglish ? 'use when user asks about this course' : 'dùng khi user hỏi về khóa này'}):
- ${isEnglish ? 'Name' : 'Tên'}: ${recentCourseContext.title}
- Level: ${recentCourseContext.level || (isEnglish ? 'Not specified' : 'Không xác định')}
- ${isEnglish ? 'Price' : 'Giá'}: ${recentCourseContext.price === 0 
    ? (isEnglish ? 'Free' : 'Miễn phí') 
    : recentCourseContext.price?.toLocaleString('vi-VN') + ' VNĐ'}
- ${isEnglish ? 'Certificate' : 'Chứng chỉ'}: ${recentCourseContext.has_certificate ? (isEnglish ? 'Yes' : 'Có') : (isEnglish ? 'No' : 'Không')}
- ${isEnglish ? 'Detailed content' : 'Nội dung chi tiết'}:
${moduleSummary}
`;
        }

        // ====== NEW: Active topic from conversation context ======
        let activeTopicInfo = '';
        if (activeTopic) {
            // Get enrolled courses matching this topic for context
            const enrolledInTopic = enrolledCourses.filter((e) =>
                e.title.toLowerCase().includes(activeTopic.toLowerCase())
            );
            const enrolledInTopicList = enrolledInTopic.length > 0
                ? enrolledInTopic.map((e) => `${e.title} (${e.progress_percent}%)`).join(', ')
                : (isEnglish ? 'No courses yet' : 'Không có khóa nào');
            activeTopicInfo = `
${isEnglish ? 'CURRENTLY MENTIONED TOPIC IN CONVERSATION' : 'CHỦ ĐỀ ĐANG ĐƯỢC NHẮC ĐẾN TRONG CUỘC TRÒ CHUYỆN'}: ${activeTopic.toUpperCase()}
→ ${isEnglish ? 'User is interested in' : 'User đang quan tâm đến chủ đề'} "${activeTopic}"
→ ${isEnglish ? 'Completed courses on' : 'Khóa đã học về'} "${activeTopic}": ${enrolledInTopicList}
→ ${isEnglish ? 'When user asks "related courses", "next course", "what to learn" → SUGGEST courses related to' : 'Khi user hỏi "khóa liên quan", "khóa tiếp theo", "nên học gì" → GỢI Ý khóa liên quan đến'} "${activeTopic}"
`;
        }

        // Localization for context instructions
        const userInfoLabel = isEnglish ? 'USER INFORMATION' : 'THÔNG TIN NGƯỜI DÙNG';
        const enrolledCountLabel = isEnglish ? 'Courses enrolled' : 'Đã đăng ký';
        const enrolledListLabel = isEnglish 
            ? 'ENROLLED COURSES (FOR REFERENCE ONLY - DO NOT SUGGEST THESE)'
            : 'DANH SÁCH KHÓA HỌC ĐÃ ĐĂNG KÝ (CHỈ ĐỂ THAM KHẢO - KHÔNG GỢI Ý NHỮNG KHÓA NÀY)';
        const availableListLabel = isEnglish
            ? 'AVAILABLE COURSES (PRIORITY FOR SUGGESTIONS)'
            : 'DANH SÁCH KHÓA HỌC CÓ SẴN (ƯU TIÊN GỢI Ý NHỮNG KHÓA NÀY)';
        const ragRulesLabel = isEnglish ? 'IMPORTANT RULES FOR COURSE SUGGESTIONS (RAG PATTERN)' : 'QUY TẮC QUAN TRỌNG KHI GỢI Ý KHÓA HỌC (RAG PATTERN)';
        const rule1 = isEnglish 
            ? 'ALWAYS prioritize suggesting courses from AVAILABLE_COURSE list'
            : 'LUÔN ƯU TIÊN gợi ý khóa học từ DANH SÁCH KHÓA HỌC CÓ SẴN (AVAILABLE_COURSE)';
        const rule2 = isEnglish
            ? 'DO NOT suggest courses from ENROLLED COURSES list'
            : 'KHÔNG gợi ý khóa từ DANH SÁCH KHÓA HỌC ĐÃ ĐĂNG KÝ';
        const rule3 = isEnglish
            ? 'If AVAILABLE_COURSE is empty → notify and suggest other topics'
            : 'Nếu AVAILABLE_COURSE trống → thông báo và gợi ý chủ đề khác';
        const rule4 = isEnglish
            ? 'When user asks for suggestions → return at least 1 course from AVAILABLE_COURSE'
            : 'Khi user hỏi "gợi ý khóa học" → trả về ít nhất 1 khóa từ AVAILABLE_COURSE';
        const rule5 = activeTopic 
            ? (isEnglish 
                ? `5. When user asks "related courses", "next course" → prioritize courses RELATED to "${activeTopic}"`
                : `5. Khi user hỏi "khóa liên quan", "khóa tiếp theo" → ưu tiên gợi ý khóa LIÊN QUAN đến "${activeTopic}"`)
            : '';
        const responseLabel = isEnglish ? 'WHEN RESPONDING' : 'KHI TRẢ LỜI';
        const responseTip1 = isEnglish
            ? 'reply can naturally contain course information (price, level, content...)'
            : 'reply có thể chứa thông tin khóa học tự nhiên (giá, level, nội dung...)';
        const responseTip2 = isEnglish
            ? 'references are used to display course cards below reply'
            : 'references dùng để hiển thị thẻ khóa học bên dưới reply';
        const responseTip3 = isEnglish
            ? 'When user wants to enroll in FREE course: action = {"type": "enroll", "courseId": X, "courseTitle": "..."}'
            : 'Khi user muốn đăng ký khóa học MIỄN PHÍ: action = {"type": "enroll", "courseId": X, "courseTitle": "..."}';
        const responseTip4 = isEnglish
            ? 'When user wants to enroll in PAID course: quickReply = {"text": "Pay now", "value": "pay_X"}'
            : 'Khi user muốn đăng ký khóa học CÓ PHÍ: quickReply = {"text": "Thanh toán ngay", "value": "pay_X"}';
        const responseTip5 = isEnglish
            ? 'When asking for suggestions/finding courses: ALWAYS prioritize from AVAILABLE_COURSE (not enrolled), return at least 1 course from this list'
            : 'Khi user hỏi gợi ý/tìm khóa học: LUÔN ƯU TIÊN gợi ý từ DANH SÁCH KHÓA HỌC CÓ SẴN (chưa đăng ký), trả về ÍT NHẤT 1 khóa từ phần này';
        const responseTip6 = isEnglish
            ? 'DO NOT suggest courses that are already in ENROLLED COURSES list'
            : 'KHÔNG gợi ý các khóa đã có trong DANH SÁCH KHÓA HỌC ĐÃ ĐĂNG KÝ';
        const responseTip7 = isEnglish
            ? 'Respond naturally like chatting with a friend, no need to be too formal'
            : 'Trả lời tự nhiên như đang chat với bạn, không cần quá formal';

        return `${userInfoLabel}:
${activeTopicInfo}
- ${isEnglish ? 'Full name' : 'Họ tên'}: ${userProfile.full_name}
- ${enrolledCountLabel}: ${enrolledCourses.length} ${isEnglish ? 'courses' : 'khóa học'}
${recentCourseInfo}
${enrolledListLabel}:
${enrolledList}

${availableListLabel}:
${availableList}

${ragRulesLabel}:
1. ${rule1}
2. ${rule2}
3. ${rule3}
4. ${rule4}
${rule5 ? '\n' + rule5 : ''}

${responseLabel}:
- ${responseTip1}
- ${responseTip2}
- ${responseTip3}
- ${responseTip4}
- ${responseTip5}
- ${responseTip6}
- ${responseTip7}`;
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

                // Strip reasoning/internal fields that leak into response
                delete parsed.analysis;
                delete parsed.thinking;
                delete parsed.reasoning;
                delete parsed.internal;
                delete parsed.chain_of_thought;
                delete parsed.notes;
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
                // If no reply after stripping reasoning fields, fall back to plain text
                if (!parsed.reply) {
                    return {
                        reply: cleaned.slice(0, 3000),
                        references: [],
                        quickReplies: [],
                        action: null,
                    };
                }
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

    // ========== LEARNING SUPPORT METHODS ==========

    private async processLearningMessage(
        userId: number,
        message: string,
        conversationHistory?: ChatMessage[],
        learningContext?: LearningContext,
        videoQuery?: { timestamp: number; rangeSeconds: number }
    ): Promise<ChatbotResponse> {
        console.log('[Chatbot Debug] Processing learning message:', message);
        console.log('[Chatbot Debug] Learning context:', JSON.stringify(learningContext, null, 2));

        // Detect intent from message
        const intent = this.detectLearningIntent(message, learningContext);
        console.log('[Chatbot Debug] Detected learning intent:', intent);

        // ========== Handle 'my_courses' intent specially ==========
        if (intent === 'my_courses') {
            const enrolledCourses = await this.getEnrolledCourses(userId);

            if (enrolledCourses.length === 0) {
                return {
                    reply: 'Bạn chưa đăng ký khóa học nào. Hãy vào chế độ Tư vấn để tìm khóa học phù hợp nhé!',
                    references: [],
                    quickReplies: [
                        { text: 'Về chế độ Tư vấn', value: '__switch_to_consult__' },
                        { text: 'Tìm khóa học', value: 'tìm khóa học' },
                    ],
                    action: null,
                };
            }

            return {
                reply: `Bạn đã đăng ký ${enrolledCourses.length} khóa học:`,
                references: enrolledCourses.map((course) => ({
                    type: 'course' as const,
                    id: course.id,
                    slug: course.slug,
                    title: course.title,
                    level: course.level,
                    price: course.price,
                    has_certificate: course.has_certificate,
                    progress_percent: course.progress_percent,
                })),
                quickReplies: [
                    { text: 'Về chế độ Tư vấn', value: '__switch_to_consult__' },
                    { text: 'Xem tiến độ', value: 'xem tiến độ của tôi' },
                ],
                action: null,
            };
        }

        // ========== VIDEO QUERY PROCESSING ==========
        // If user specified a timestamp, fetch transcript chunk
        let videoTranscriptChunk: string | null = null;
        if (videoQuery && learningContext?.droppedNode && learningContext?.courseId) {
            try {
                const node = learningContext.droppedNode;
                const { timestamp, rangeSeconds } = videoQuery;
                const fromSec = Math.max(0, timestamp - rangeSeconds);
                const toSec = timestamp + rangeSeconds;

                const transcriptData = await this.getLessonTranscriptChunk(
                    userId,
                    learningContext.courseId,
                    node.id,
                    fromSec,
                    toSec
                );

                if (transcriptData.transcript) {
                    const startMin = Math.floor(fromSec / 60);
                    const startSec = fromSec % 60;
                    const endMin = Math.floor(toSec / 60);
                    const endSec = toSec % 60;
                    videoTranscriptChunk = `[Video transcript (${startMin}:${String(startSec).padStart(2, '0')} → ${endMin}:${String(endSec).padStart(2, '0')})]\n${transcriptData.transcript}`;
                }
            } catch (err) {
                console.error('[Chatbot] Failed to fetch video transcript chunk:', err);
            }
        }

        // ========== AUTO-FETCH QUIZ/ASSIGNMENT CONTENT ==========
        // If dropped node is quiz/assignment but has no content, fetch it
        const node = learningContext?.droppedNode;
        if (node && !node.content && learningContext?.courseId) {
            try {
                if (node.type === 'quiz') {
                    const quizData = await this.fetchQuizQuestions(userId, learningContext.courseId, node.id);
                    if (quizData) {
                        (learningContext.droppedNode as any).content = { questions: quizData };
                    }
                } else if (node.type === 'assignment') {
                    const assignmentData = await this.fetchAssignmentContent(userId, learningContext.courseId, node.id);
                    if (assignmentData) {
                        (learningContext.droppedNode as any).content = assignmentData;
                    }
                }
            } catch (err) {
                console.error('[Chatbot] Failed to fetch dropped node content:', err);
            }
        }

        // Build context info string
        const contextInfo = this.buildLearningContextInfo(learningContext, videoTranscriptChunk);
        const systemPrompt = this.buildLearningSystemPrompt(contextInfo);
        const userPrompt = this.buildLearningUserPrompt(message, learningContext, intent);

        // Call LLM for response
        const llmResponse = await this.llmClient.chat([
            { role: 'system', content: systemPrompt },
            ...(conversationHistory || []).slice(-10).map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            })),
            { role: 'user', content: userPrompt }
        ]);

        // Clean the raw LLM response first - remove ALL "(final)" markers with surrounding text
        let cleanedResponse = llmResponse
            // Remove entire blocks like "*/ (final). */" or ". (final)."
            .replace(/\s*\*\/\s*\(\s*final\s*\)\.?\s*\*/gi, ' ')
            .replace(/\.\s*\(\s*final\s*\)\.?\s*/gi, ' ')
            .replace(/\s*\(\s*final\s*\)\.?\s*/gi, ' ')
            // Remove remaining orphaned markers
            .replace(/\s*\*\/\s*/gi, ' ')
            // Clean trailing junk at end of response
            .replace(/(\(\s*final\s*\)[\s\.\)]*)+$/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

        // For learning mode, always use text response (not JSON)
        const reply = this.sanitizeString(cleanedResponse);
        const quickReplies = this.getLearningQuickReplies(learningContext, intent);

        return {
            reply,
            references: [],
            quickReplies,
            action: null
        };
    }

    private detectLearningIntent(message: string, ctx?: LearningContext): string {
        const lower = message.toLowerCase();

        // Check if dropped node exists
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

        // My courses intent
        if (lower.includes('khóa học của tôi') || lower.includes('course của tôi') || 
            lower.includes('đã đăng ký') || lower.includes('enrolled') || lower.includes('danh sách khóa')) {
            return 'my_courses';
        }

        // Summary intent
        if (lower.includes('tóm tắt') || lower.includes('tổng kết') || lower.includes('sum') || lower.includes('summary')) {
            return 'summary';
        }

        // Quiz intent
        if (lower.includes('quiz') || lower.includes('kiểm tra') || lower.includes('thi')) {
            return 'quiz_help';
        }

        // Assignment intent
        if (lower.includes('bài tập') || lower.includes('assignment') || lower.includes('nộp bài')) {
            return 'assignment_help';
        }

        // Progress intent
        if (lower.includes('tiến độ') || lower.includes('progress') || lower.includes('đã học')) {
            return 'progress';
        }

        // Structure intent
        if (lower.includes('cấu trúc') || lower.includes('chương') || lower.includes('module') || lower.includes('bài học')) {
            return 'structure';
        }

        // Explanation intent
        if (lower.includes('giải thích') || lower.includes('nói gì') || lower.includes('là gì') || lower.includes('what')) {
            return 'explanation';
        }

        // Next/previous lesson intent
        if (lower.includes('tiếp') || lower.includes('kế tiếp') || lower.includes('next')) {
            return 'next_lesson';
        }
        if (lower.includes('trước') || lower.includes('previous')) {
            return 'prev_lesson';
        }

        // Code help intent
        if (lower.includes('code') || lower.includes('code') || lower.includes('lỗi') || lower.includes('bug')) {
            return 'code_help';
        }

        // Default: general question
        return 'general';
    }

    private buildLearningContextInfo(ctx?: LearningContext, videoTranscriptChunk?: string | null): string {
        if (!ctx) return 'Không có thông tin khóa học.';

        let info = `# THÔNG TIN KHÓA HỌC HIỆN TẠI\n\n`;
        info += `**Khóa học:** ${ctx.courseTitle}\n`;
        info += `**Tiến độ:** ${ctx.progressPercent}%\n`;
        info += `**Đã hoàn thành:** ${ctx.completedLessons}/${ctx.totalLessons} bài\n\n`;

        // Add video transcript chunk if available
        if (videoTranscriptChunk) {
            info += `## VIDEO TRANSCRIPT CHUNK:\n${videoTranscriptChunk}\n\n`;
        }

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

        // Course structure
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
- KHÔNG trả về JSON - LUÔN trả lời bằng VĂN BẢN THƯỜNG có định dạng markdown đẹp mắt
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

            // Include dropped content if available
            const content = (ctx.droppedNode as any).content;
            if (content) {
                // Video/Text transcript
                if (content.transcript) {
                    prompt += `## TRANSCRIPT BÀI GIẢNG:\n${String(content.transcript).substring(0, 3000)}\n\n`;
                }

                // Quiz questions
                if (content.questions && Array.isArray(content.questions)) {
                    prompt += `## CÂU HỎI QUIZ:\n`;
                    content.questions.forEach((q: any, idx: number) => {
                        prompt += `${idx + 1}. ${q.question_text}\n`;
                        if (q.options && Array.isArray(q.options)) {
                            q.options.forEach((opt: any, optIdx: number) => {
                                prompt += `   ${String.fromCharCode(65 + optIdx)}. ${opt.option_text}\n`;
                            });
                        }
                        prompt += '\n';
                    });
                    prompt += '\n';
                }

                // Assignment content
                if (content.description) {
                    prompt += `## MÔ TẢ BÀI TẬP:\n${content.description}\n\n`;
                }
                if (content.short_answer_questions && Array.isArray(content.short_answer_questions)) {
                    prompt += `## CÂU HỎI BÀI TẬP:\n`;
                    content.short_answer_questions.forEach((q: any, idx: number) => {
                        prompt += `${idx + 1}. ${q.question_text}\n`;
                    });
                    prompt += '\n';
                }
                if (content.attachments && Array.isArray(content.attachments)) {
                    prompt += `## FILE ĐÍNH KÈM:\n`;
                    content.attachments.forEach((att: any) => {
                        prompt += `- ${att.filename}\n`;
                    });
                    prompt += '\n';
                }
            }
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
            .replace(/[\u200b-\u200f\u2028-\u202f\ufeff]/g, '')
            .replace(/\{[^}]*"[^"]*":\s*[^}]*\}/g, '')
            .replace(/\{"[^"]*":\s*[^}]*\}/g, '')
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

    // ====== OWNERSHIP CONFIRMATION: Handle "đã mua...đúng không" ======
    private detectOwnershipConfirmation(message: string): { topic: string; courseTitle: string } | null {
        const lower = message.toLowerCase().trim();

        // Pattern: "đã mua" + optional "1 khóa" + topic + "đúng không" / "phải không" / "không"
        // Examples:
        //   "tôi đã mua 1 khóa nodejs đúng không"
        //   "đã mua khóa python phải không"
        //   "tôi đã đăng ký khóa react đúng không"
        const patterns = [
            /đã\s+(?:mua|đăng\s*ký|register|enroll)\s+(?:1\s+)?khóa?\s+(.+?)\s+(?:đúng\s+không|phải\s+không)$/i,
            /đã\s+(?:mua|đăng\s*ký|register|enroll)\s+(?:1\s+)?khóa?\s+(.+?)\s+(?:không|\?)$/i,
            /(?:tôi|mình)\s+(?:đã\s+)?(?:mua|đăng\s*ký)\s+(?:1\s+)?(?:khóa\s+)?(.+?)\s+(?:đúng\s+không|phải\s+không)$/i,
        ];

        const KNOWN_TOPICS = [
            'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust',
            'php', 'ruby', 'swift', 'kotlin', 'dart',
            'react', 'angular', 'vue', 'nextjs', 'nodejs', 'node.js',
            'html', 'css', 'sass', 'tailwind',
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
            'docker', 'kubernetes', 'aws', 'azure', 'gcp',
            'django', 'flask', 'spring', 'spring boot', 'express', 'nestjs',
            'react native', 'flutter',
            'machine learning', 'deep learning', 'ai', 'data science',
            'git', 'linux', 'devops',
            'excel', 'powerpoint', 'word',
            'marketing', 'seo', 'content',
            'figma', 'photoshop', 'illustrator',
        ];

        for (const pattern of patterns) {
            const match = lower.match(pattern);
            if (match) {
                const topicOrTitle = match[1].trim();

                // Try to find known topic in the match
                for (const topic of KNOWN_TOPICS) {
                    if (topicOrTitle.includes(topic) || topic.includes(topicOrTitle)) {
                        return { topic, courseTitle: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Cơ Bản` };
                    }
                }
                // If no known topic, use the extracted text as course title
                return { topic: topicOrTitle, courseTitle: topicOrTitle };
            }
        }
        return null;
    }

    private async handleOwnershipConfirmation(
        userId: number,
        topic: string,
        _courseTitle: string
    ): Promise<ChatbotResponse> {
        // Search for enrolled courses matching this topic
        const enrolledCourses = await this.getEnrolledCourses(userId);
        const matched = enrolledCourses.find((e) =>
            e.title.toLowerCase().includes(topic.toLowerCase())
        );

        if (matched) {
            return {
                reply: `Đúng rồi bạn ơi! Bạn đã đăng ký khóa **${matched.title}** rồi 👍
Tiến độ hiện tại của bạn: **${matched.progress_percent}%**

Bạn có muốn tiếp tục học không?`,
                references: [{
                    type: 'course',
                    id: matched.id,
                    slug: matched.slug,
                    title: matched.title,
                    level: matched.level,
                    price: matched.price,
                    has_certificate: matched.has_certificate,
                    progress_percent: matched.progress_percent,
                }],
                quickReplies: [
                    { text: 'Tiếp tục học', value: `vào khóa ${matched.slug}` },
                    { text: 'Khóa liên quan', value: 'có khóa nào liên quan để tôi mua không' },
                    { text: 'Lộ trình học', value: `lộ trình học ${topic}` },
                ],
                action: null,
            };
        }

        // User thinks they bought but not in DB
        return {
            reply: `Mình không thấy khóa học "${topic}" trong tài khoản của bạn nhé 😅

Bạn có thể:
- Kiểm tra lại tên khóa học
- Hoặc mình giúp bạn tìm khóa "${topic}" để đăng ký nhé?`,
            references: [],
            quickReplies: [
                { text: 'Tìm khóa NodeJS', value: 'tìm khóa nodejs' },
                { text: 'Khóa của tôi', value: 'khóa học của tôi' },
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
            'ielts', 'toeic', 'toiec', // Language exams - toeic/toiec handle typo
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
            'ielts', 'toeic', 'toiec', // Language exams - toeic/toiec handle typo
            'design', 'photoshop', 'illustrator', 'figma',
            'lập trình', 'programming', 'coding',
            'web', 'mobile', 'app', 'frontend', 'backend', 'fullstack', 'devops',
            'kinh doanh', 'business', 'startup', 'quản trị', 'tài chính', 'kế toán',
            'git', 'linux', 'network', 'security',
        ];
        return topics.some(topic => message.includes(topic));
    }

    // NEW: Get clarifying response for vague requests (RAG Pattern Flow A)
    private getClarifyTopicResponse(langProvider?: LanguageProvider): ChatbotResponse {
        const isEnglish = langProvider?.locale === 'en';
        
        return {
            reply: isEnglish 
                ? "What field are you interested in? Let me suggest some popular topics!" 
                : "Bạn muốn học về lĩnh vực nào? Mình gợi ý vài chủ đề phổ biến nhé!",
            references: [],
            quickReplies: isEnglish 
                ? [
                    { text: "Programming", value: "programming courses" },
                    { text: "AI & Data", value: "AI courses" },
                    { text: "Design", value: "design courses" },
                    { text: "Marketing", value: "marketing courses" },
                    { text: "Languages", value: "language courses" },
                    { text: "Business", value: "business courses" },
                ]
                : [
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
    // Also returns potential typos for confirmation
    private extractTopicFromMessage(message: string): { topics: string[]; potentialTypos: Array<{ typed: string; corrected: string }> } {
        const lower = message.toLowerCase();
        const topics: string[] = [];
        const potentialTypos: Array<{ typed: string; corrected: string }> = [];

        const knownTopics = [
            'java', 'python', 'react', 'nodejs', 'javascript', 'typescript',
            'c#', 'c++', 'go', 'rust', 'php', 'ruby',
            'swift', 'kotlin', 'flutter', 'react native',
            'sql', 'mongodb', 'postgresql', 'mysql', 'docker', 'kubernetes',
            'html', 'css', 'angular', 'vue', 'nextjs', 'next.js', 'express',
            'spring', 'django', 'flask', 'laravel',
            'machine learning', 'deep learning', 'ai', 'data science',
            'excel', 'marketing', 'seo', 'english', 'tiếng anh',
            'ielts', 'toeic', // toeic is correct, toiec is typo
            'design', 'photoshop', 'illustrator', 'figma',
            'lập trình', 'programming', 'coding',
            'web', 'mobile', 'app', 'frontend', 'backend', 'fullstack', 'devops',
            'kinh doanh', 'business', 'startup', 'quản trị', 'tài chính', 'kế toán',
            'git', 'linux', 'network', 'security',
        ];

        // Mapping of common typos to correct words
        const typoMappings: Record<string, string> = {
            'toiec': 'toeic',
            'todiec': 'toeic',
            'ilet': 'ielts',
            'reactjs': 'react',
            'node': 'nodejs',
            'javascrip': 'javascript',
            'javscript': 'javascript',
            'typecript': 'typescript',
            'phyton': 'python',
            'pytho': 'python',
        };

        for (const topic of knownTopics) {
            if (lower.includes(topic)) {
                topics.push(topic);
            }
        }

        // Check for potential typos (words that are close to known topics but not exact match)
        const words = lower.split(/[\s,.!?;:]+/).filter(w => w.length > 2);
        
        for (const word of words) {
            // Check if this word is close to a known topic (Levenshtein distance)
            for (const known of knownTopics) {
                if (word === known) continue; // Already matched exactly
                
                // Check typo mappings first
                if (typoMappings[word] === known) {
                    if (!topics.includes(known)) {
                        potentialTypos.push({ typed: word, corrected: known });
                        topics.push(known); // Use corrected version
                    }
                    break;
                }
                
                // Use Levenshtein distance for fuzzy matching
                const distance = this.levenshteinDistance(word, known);
                // If distance is 1-2 and word length > 3, it's likely a typo
                if (distance > 0 && distance <= 2 && word.length > 3 && known.length > 3) {
                    if (!topics.includes(known)) {
                        potentialTypos.push({ typed: word, corrected: known });
                        topics.push(known); // Use corrected version
                    }
                    break;
                }
            }
        }

        return { topics, potentialTypos };
    }

    // Calculate Levenshtein distance between two strings
    private levenshteinDistance(str1: string, str2: string): number {
        const m = str1.length;
        const n = str2.length;
        const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,     // delete
                        dp[i][j - 1] + 1,     // insert
                        dp[i - 1][j - 1] + 1  // replace
                    );
                }
            }
        }
        return dp[m][n];
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
        const { topics } = this.extractTopicFromMessage(message);
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
    private async generateComparisonResponse(
        userId: number,
        topic1: string,
        topic2: string
    ): Promise<ChatbotResponse> {
        // 1. Fetch courses for both topics
        const courses1 = await this.getPublishedCourses([topic1]);
        const courses2 = await this.getPublishedCourses([topic2]);

        // 2. Fetch enrolled courses for personalization
        const enrolledCourses = await this.getEnrolledCourses(userId);
        const enrolledTopic1 = enrolledCourses.filter((e) =>
            e.title.toLowerCase().includes(topic1.toLowerCase())
        );
        const enrolledTopic2 = enrolledCourses.filter((e) =>
            e.title.toLowerCase().includes(topic2.toLowerCase())
        );

        // 3. Compute safe stats (no NaN possible)
        const stats1 = this.computeTopicStats(courses1);
        const stats2 = this.computeTopicStats(courses2);

        // 4. Get topic knowledge
        const knowledge1 = this.getTopicKnowledge(topic1);
        const knowledge2 = this.getTopicKnowledge(topic2);

        // 5. Build user prompt for LLM
        const userPrompt = this.buildComparisonUserPrompt(
            topic1, topic2,
            knowledge1, knowledge2,
            stats1, stats2,
            enrolledTopic1, enrolledTopic2
        );

        // 6. Call LLM to generate reasoning + recommendation
        const messages: Array<{ role: 'system' | 'user'; content: string }> = [
            { role: 'system', content: COMPARISON_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ];

        let reasoning = '';
        try {
            reasoning = await this.llmClient.chat(messages);
        } catch (error) {
            console.error('[Chatbot] Comparison LLM error:', error);
            // Fallback: build a basic response if LLM fails
            reasoning = this.buildBasicComparisonFallback(
                topic1, topic2, knowledge1, knowledge2, stats1, stats2,
                enrolledTopic1, enrolledTopic2
            );
        }

        // 7. Build references
        const references: any[] = [
            ...courses1.slice(0, 2).map((c) => ({
                type: 'course' as const,
                id: c.id,
                title: c.title,
                slug: c.slug,
                level: c.level,
                price: c.price,
                has_certificate: c.has_certificate,
            })),
            ...courses2.slice(0, 2).map((c) => ({
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
            reply: reasoning,
            references,
            quickReplies: [
                { text: `Khóa ${topic1}`, value: `khóa ${topic1}` },
                { text: `Khóa ${topic2}`, value: `khóa ${topic2}` },
                { text: 'So sánh khác', value: 'so sánh python và java' },
            ],
            action: { type: 'comparison', topic1, topic2 },
        };
    }

    // ========== NEW: Helper to compute safe topic stats ==========
    private computeTopicStats(courses: any[]): TopicStats {
        const prices = courses
            .map((c) => c.price)
            .filter((p): p is number => p != null && p !== undefined && p > 0);
        const avgPrice = prices.length > 0
            ? prices.reduce((sum, p) => sum + p, 0) / prices.length
            : null;
        const levels = [...new Set(courses.map((c) => c.level || 'N/A'))];
        return { courseCount: courses.length, avgPrice, levels };
    }

    // ========== NEW: Helper to get topic knowledge with fallback ==========
    private getTopicKnowledge(topic: string): TopicKnowledge {
        const lower = topic.toLowerCase().trim();
        const found = TOPIC_KNOWLEDGE[lower];
        if (found) return found;
        // Try partial match
        const partialKey = Object.keys(TOPIC_KNOWLEDGE).find((k) => lower.includes(k) || k.includes(lower));
        if (partialKey) return TOPIC_KNOWLEDGE[partialKey];
        // Fallback
        return {
            ease_of_learning: 'Phụ thuộc vào khóa học cụ thể và background của bạn',
            best_for: 'Nhiều ứng dụng đa dạng trong lĩnh vực IT',
            job_demand: 'Cao trong thị trường IT hiện tại',
            ecosystem: 'Phụ thuộc vào framework/library cụ thể',
            difficulty: 'intermediate',
        };
    }

    // ========== NEW: Build user prompt for comparison LLM ==========
    private buildComparisonUserPrompt(
        topic1: string,
        topic2: string,
        knowledge1: TopicKnowledge,
        knowledge2: TopicKnowledge,
        stats1: TopicStats,
        stats2: TopicStats,
        enrolledTopic1: any[],
        enrolledTopic2: any[]
    ): string {
        const avgPrice1Text = stats1.avgPrice !== null
            ? stats1.avgPrice.toLocaleString('vi-VN') + ' VNĐ'
            : 'chưa có dữ liệu';
        const avgPrice2Text = stats2.avgPrice !== null
            ? stats2.avgPrice.toLocaleString('vi-VN') + ' VNĐ'
            : 'chưa có dữ liệu';

        const enrolled1Text = enrolledTopic1.length > 0
            ? enrolledTopic1.map((e) => `${e.title} (${e.progress_percent}%)`).join(', ')
            : 'Chưa học';
        const enrolled2Text = enrolledTopic2.length > 0
            ? enrolledTopic2.map((e) => `${e.title} (${e.progress_percent}%)`).join(', ')
            : 'Chưa học';

        return `So sánh **${topic1}** và **${topic2}**:

--- KIẾN THỨC CHUYÊN MÔN ---
${topic1}:
  - Dễ học: ${knowledge1.ease_of_learning}
  - Ứng dụng mạnh: ${knowledge1.best_for}
  - Thị trường việc làm: ${knowledge1.job_demand}
  - Ecosystem: ${knowledge1.ecosystem}
  - Độ khó: ${knowledge1.difficulty}

${topic2}:
  - Dễ học: ${knowledge2.ease_of_learning}
  - Ứng dụng mạnh: ${knowledge2.best_for}
  - Thị trường việc làm: ${knowledge2.job_demand}
  - Ecosystem: ${knowledge2.ecosystem}
  - Độ khó: ${knowledge2.difficulty}

--- DỮ LIỆU NỀN TẢNG ---
${topic1}: ${stats1.courseCount} khóa, avg price: ${avgPrice1Text}, levels: ${stats1.levels.join(', ')}
${topic2}: ${stats2.courseCount} khóa, avg price: ${avgPrice2Text}, levels: ${stats2.levels.join(', ')}

--- KHÓA USER ĐÃ HỌC ---
${topic1}: ${enrolled1Text}
${topic2}: ${enrolled2Text}`;
    }

    // ========== NEW: Fallback comparison when LLM fails ==========
    private buildBasicComparisonFallback(
        topic1: string,
        topic2: string,
        knowledge1: TopicKnowledge,
        knowledge2: TopicKnowledge,
        stats1: TopicStats,
        stats2: TopicStats,
        enrolledTopic1: any[],
        enrolledTopic2: any[]
    ): string {
        let reply = `## So sánh **${topic1}** và **${topic2}**\n\n`;

        // Quick summary
        reply += `**Tóm tắt:** ${topic1} phù hợp với ${knowledge1.best_for.split(',')[0].toLowerCase()}. `
            + `${topic2} phù hợp với ${knowledge2.best_for.split(',')[0].toLowerCase()}.\n\n`;

        // Comparison table
        reply += `| Tiêu chí | ${topic1} | ${topic2} |\n`;
        reply += `|----------|---------|-----------|\n`;
        reply += `| Độ khó | ${knowledge1.difficulty} | ${knowledge2.difficulty} |\n`;
        reply += `| Ứng dụng | ${knowledge1.best_for.split(',')[0]} | ${knowledge2.best_for.split(',')[0]} |\n`;
        reply += `| Việc làm | ${knowledge1.job_demand.split(',')[0]} | ${knowledge2.job_demand.split(',')[0]} |\n`;
        reply += `| Khóa có sẵn | ${stats1.courseCount} | ${stats2.courseCount} |\n`;

        // Personalized recommendation
        if (enrolledTopic1.length > 0 || enrolledTopic2.length > 0) {
            reply += `\n**Dựa trên khóa bạn đã học:**\n`;
            if (enrolledTopic1.length > 0) {
                reply += `- Bạn đã học ${topic1}: ${enrolledTopic1.map((e) => `${e.title} (${e.progress_percent}%)`).join(', ')}\n`;
            }
            if (enrolledTopic2.length > 0) {
                reply += `- Bạn đã học ${topic2}: ${enrolledTopic2.map((e) => `${e.title} (${e.progress_percent}%)`).join(', ')}\n`;
            }
        }

        // Conclusion
        reply += `\n**Nên chọn:** `;
        if (knowledge1.difficulty === 'beginner' && knowledge2.difficulty !== 'beginner') {
            reply += `Nếu bạn mới bắt đầu → ưu tiên **${topic1}**.\n`;
        } else if (knowledge2.difficulty === 'beginner' && knowledge1.difficulty !== 'beginner') {
            reply += `Nếu bạn mới bắt đầu → ưu tiên **${topic2}**.\n`;
        } else {
            reply += `Cả hai đều có giá trị. Hãy chọn dựa trên mục tiêu nghề nghiệp của bạn.\n`;
        }

        return reply;
    }

    // ========== HELPER METHODS FOR VIDEO QUERY ==========

    private async getLessonTranscriptChunk(
        userId: number,
        courseId: number,
        lessonId: number,
        fromSec: number,
        toSec: number
    ): Promise<{ transcript: string | null; segments: any[] }> {
        // Use the course service's method
        const courseService = new (await import('../../course/domain/service')).CourseServiceImpl();
        return await courseService.getLessonTranscriptChunkForLearner(userId, courseId, lessonId, fromSec, toSec);
    }

    private async fetchQuizQuestions(
        userId: number,
        courseId: number,
        lessonId: number
    ): Promise<any[] | null> {
        try {
            const courseService = new (await import('../../course/domain/service')).CourseServiceImpl();
            const result = await courseService.getQuizQuestionsForLearner(userId, courseId, lessonId);
            return result?.questions || null;
        } catch (err) {
            console.error('[Chatbot] Failed to fetch quiz questions:', err);
            return null;
        }
    }

    private async fetchAssignmentContent(
        userId: number,
        courseId: number,
        lessonId: number
    ): Promise<any | null> {
        try {
            const courseService = new (await import('../../course/domain/service')).CourseServiceImpl();
            return await courseService.getAssignmentContentForLearner(userId, courseId, lessonId);
        } catch (err) {
            console.error('[Chatbot] Failed to fetch assignment content:', err);
            return null;
        }
    }

    private async handleVideoSummary(
        userId: number,
        _message: string,
        learningContext?: LearningContext
    ): Promise<ChatbotResponse> {
        if (!learningContext?.droppedNode || !learningContext?.courseId) {
            return {
                reply: 'Không có thông tin bài học để tóm tắt.',
                references: [],
                quickReplies: [],
                action: null,
            };
        }

        const node = learningContext.droppedNode;
        try {
            const transcriptData = await this.getLessonTranscriptChunk(
                userId,
                learningContext.courseId,
                node.id,
                0,
                3600 // Get first hour
            );

            if (!transcriptData.transcript) {
                return {
                    reply: 'Không tìm thấy transcript cho bài học này.',
                    references: [],
                    quickReplies: [],
                    action: null,
                };
            }

            // Build prompt for summary
            const summaryPrompt = `Hãy tóm tắt nội dung video sau một cách ngắn gọn (khoảng 3-5 câu):

${transcriptData.transcript.substring(0, 3000)}`;

            const summaryResponse = await this.llmClient.chat([
                { role: 'user', content: summaryPrompt }
            ]);

            return {
                reply: `📝 **Tóm tắt bài học: ${node.title}**\n\n${summaryResponse}`,
                references: [],
                quickReplies: [
                    { text: '📹 Hỏi về video', value: `__ask_video__:${node.id}:${node.title}` },
                    { text: '❓ Hỏi thêm', value: `hỏi về: ${node.title}` },
                ],
                action: null,
            };
        } catch (err) {
            console.error('[Chatbot] Failed to get video summary:', err);
            return {
                reply: 'Không thể tóm tắt bài học lúc này. Bạn thử hỏi lại nhé!',
                references: [],
                quickReplies: [],
                action: null,
            };
        }
    }

    private async handleFetchAttachments(
        _userId: number,
        _message: string,
        learningContext?: LearningContext
    ): Promise<ChatbotResponse> {
        if (!learningContext?.droppedNode) {
            return {
                reply: 'Không có thông tin bài học để lấy file.',
                references: [],
                quickReplies: [],
                action: null,
            };
        }

        const node = learningContext.droppedNode;
        try {
            // Fetch lesson resources directly using SQL
            const resources = await AppDataSource.query(
                `SELECT id, filename, url, mime_type, resource_type
                 FROM lesson_resources
                 WHERE lesson_id = ? AND review_status = 'approved'
                 ORDER BY order_index ASC`,
                [node.id]
            ) as any[];

            if (resources.length === 0) {
                return {
                    reply: `📎 **${node.title}**\n\nBài học này không có file đính kèm.`,
                    references: [],
                    quickReplies: [
                        { text: '📹 Hỏi về video', value: `__ask_video__:${node.id}:${node.title}` },
                        { text: '📝 Tóm tắt', value: `__video_summary__:${node.id}` },
                    ],
                    action: null,
                };
            }

            const resourceList = resources.map((r: any, idx: number) =>
                `${idx + 1}. 📄 ${r.filename || 'File'}`
            ).join('\n');

            return {
                reply: `📎 **File đính kèm: ${node.title}**\n\n${resourceList}`,
                references: resources.map((r: any) => ({
                    type: 'lesson' as const,
                    id: r.id,
                    title: r.filename || 'File',
                })),
                quickReplies: [
                    { text: '📹 Hỏi về video', value: `__ask_video__:${node.id}:${node.title}` },
                    { text: '📝 Tóm tắt', value: `__video_summary__:${node.id}` },
                ],
                action: null,
            };
        } catch (err) {
            console.error('[Chatbot] Failed to fetch attachments:', err);
            return {
                reply: 'Không thể lấy file đính kèm lúc này. Bạn thử hỏi lại nhé!',
                references: [],
                quickReplies: [],
                action: null,
            };
        }
    }
}
