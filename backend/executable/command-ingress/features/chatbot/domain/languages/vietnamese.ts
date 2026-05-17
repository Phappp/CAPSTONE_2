import { LanguageProvider, TopicKnowledge } from './base';

// ====== Static Knowledge Data for Topic Comparison (Vietnamese) ======
export const TOPIC_KNOWLEDGE_VI: Record<string, TopicKnowledge> = {
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

// ====== Comparison System Prompt (Vietnamese) ======
const VI_COMPARISON_SYSTEM_PROMPT = `Bạn là chuyên gia tư vấn học tập thông minh cho nền tảng e-Learning.

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

// ====== Main System Prompt (Vietnamese) ======
const VI_SYSTEM_PROMPT = `Bạn là trợ lý tư vấn khóa học thân thiện của nền tảng e-Learning.

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
  → Hỏi lại: "Bạn đang quan tâm đến chủ đề gì để mình gợi ý nhé?"`;

// ====== Vietnamese Language Provider ======
export const vietnameseProvider: LanguageProvider = {
    locale: 'vi',
    name: 'Tiếng Việt',
    
    systemPrompt: VI_SYSTEM_PROMPT,
    comparisonPrompt: VI_COMPARISON_SYSTEM_PROMPT,
    
    topicKnowledge: TOPIC_KNOWLEDGE_VI,
    
    quickReplies: {
        greeting: [
            { text: 'Tìm khóa học', value: 'tìm khóa học' },
            { text: 'Khóa miễn phí', value: 'khóa miễn phí' },
            { text: 'Lộ trình học', value: 'lộ trình học' },
        ],
        courseSearch: [
            { text: 'Tìm khóa học', value: 'tìm khóa học' },
            { text: 'Khóa học của tôi', value: 'khóa học của tôi' },
            { text: 'Gợi ý khóa học', value: 'gợi ý khóa học' },
        ],
        outOfDomain: [
            { text: 'Tìm khóa học', value: 'gợi ý khóa học' },
            { text: 'Khóa miễn phí', value: 'khóa miễn phí' },
            { text: 'Lộ trình học', value: 'lộ trình học backend' },
        ],
        fallback: [
            { text: 'Tìm khóa học', value: 'tìm khóa học' },
            { text: 'Hỏi lại', value: '__RETRY__' },
        ],
    },
    
    detectionPatterns: [
        // Vietnamese characters (diacritics) - high confidence Vietnamese indicator
        /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i,
        // Common Vietnamese words - MUST have word boundaries to avoid matching English substrings
        /\b(tôi|bạn|mình|khóa|học|tìm|kiếm|đăng|ký|thanh|toán|chào|cảm ơn|muốn|cần|nào|ở đâu|vì sao|như thế nào)\b/gi,
    ],
    
    responses: {
        outOfDomain: 'Oops, mình chỉ hỗ trợ về khóa học thôi nha 😅 Bạn cần mình tư vấn khóa học gì không?',
        fallback: 'Oops, mình gặp chút sự cố rồi 😅 Bạn thử hỏi lại được không? Hoặc liên hệ hỗ trợ nếu cần nhé!',
        cancel: 'Đã hủy thao tác. Bạn cần mình hỗ trợ gì khác không?',
        clarification: 'Bạn muốn học về lĩnh vực nào? Mình gợi ý vài chủ đề phổ biến nhé!',
        greeting: 'Chào bạn! Rất vui được gặp 😊 Mình có thể giúp gì cho bạn hôm nay?',
    },
};
