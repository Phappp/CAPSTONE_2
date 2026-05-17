import { LanguageProvider, TopicKnowledge } from './base';

// ====== Static Knowledge Data for Topic Comparison (English) ======
export const TOPIC_KNOWLEDGE_EN: Record<string, TopicKnowledge> = {
    python: {
        ease_of_learning: 'Very easy, simple syntax, ideal for beginners',
        best_for: 'AI/Machine Learning, Data Science, Automation, Lightweight Backend',
        job_demand: 'Very high, especially AI/ML, Data',
        ecosystem: 'Massive: numpy, pandas, pytorch, fastapi, django',
        difficulty: 'beginner',
    },
    java: {
        ease_of_learning: 'Requires understanding OOP and stricter typing than Python',
        best_for: 'Enterprise Backend, Android, large systems, microservices',
        job_demand: 'High and stable, many corporations use Java',
        ecosystem: 'Spring Boot, Hibernate, Android SDK',
        difficulty: 'intermediate',
    },
    javascript: {
        ease_of_learning: 'Easy to start, can run directly in browser',
        best_for: 'Web frontend, Fullstack, Node.js backend, Mobile (React Native)',
        job_demand: 'Very high, the most popular language in the world',
        ecosystem: 'React, Vue, Angular, Next.js, Express, Node.js',
        difficulty: 'beginner',
    },
    typescript: {
        ease_of_learning: 'Slightly harder than JS due to typing, but easy to pick up if you know JS',
        best_for: 'Large projects, enterprise, type-safe Fullstack',
        job_demand: 'High in serious projects',
        ecosystem: 'Angular (default), React + TS, Vue + TS, NestJS',
        difficulty: 'intermediate',
    },
    'c++': {
        ease_of_learning: 'Hard, complex syntax, many low-level concepts',
        best_for: 'Game, System programming, Embedded, Performance-critical',
        job_demand: 'Stable, especially in game and system',
        ecosystem: 'STL, Unreal Engine, Unity (C#)',
        difficulty: 'advanced',
    },
    'c#': {
        ease_of_learning: 'Pretty easy, clean syntax, developed by Microsoft',
        best_for: 'Game (Unity), Desktop app, Backend .NET, Enterprise',
        job_demand: 'High in enterprise, especially in Vietnam',
        ecosystem: '.NET, Unity, Xamarin, Blazor',
        difficulty: 'intermediate',
    },
    go: {
        ease_of_learning: 'Pretty easy, minimalist syntax, easy to read',
        best_for: 'Cloud Backend, Microservices, DevOps, Network programming',
        job_demand: 'Growing fast, especially in cloud/SaaS',
        ecosystem: 'Gin, Echo, gRPC, Docker, Kubernetes',
        difficulty: 'intermediate',
    },
    rust: {
        ease_of_learning: 'Hardest among modern languages, complex ownership system',
        best_for: 'System programming, WebAssembly, Performance-critical, Security',
        job_demand: 'Growing but fewer positions than Go/Python',
        ecosystem: 'Cargo, Rocket, Actix, WebAssembly',
        difficulty: 'advanced',
    },
    php: {
        ease_of_learning: 'Easy to start, many hosting options support it',
        best_for: 'Web backend, CMS (WordPress), Dynamic websites',
        job_demand: 'Declining but still many legacy projects',
        ecosystem: 'Laravel, Symfony, WordPress, Magento',
        difficulty: 'beginner',
    },
    ruby: {
        ease_of_learning: 'Very easy, elegant syntax, developer-friendly',
        best_for: 'Web backend, MVP, Scripting, Automation',
        job_demand: 'Less popular, but Ruby on Rails is still strong',
        ecosystem: 'Ruby on Rails, Sinatra, Jekyll',
        difficulty: 'beginner',
    },
    swift: {
        ease_of_learning: 'Pretty easy if you know Objective-C or another OOP language',
        best_for: 'iOS app, macOS app, Apple ecosystem',
        job_demand: 'High if doing iOS, separate market',
        ecosystem: 'SwiftUI, UIKit, Xcode',
        difficulty: 'intermediate',
    },
    kotlin: {
        ease_of_learning: 'Easier than Java, more modern syntax',
        best_for: 'Android, Backend (Ktor, Spring Kotlin)',
        job_demand: 'High in Android development',
        ecosystem: 'Android Studio, Jetpack Compose, Spring',
        difficulty: 'intermediate',
    },
    react: {
        ease_of_learning: 'Easy to start, many tutorials and community',
        best_for: 'Web frontend, SPA, Cross-platform (React Native)',
        job_demand: 'Very high, most popular frontend framework',
        ecosystem: 'Next.js, React Native, Redux, Zustand, Tailwind',
        difficulty: 'intermediate',
    },
    angular: {
        ease_of_learning: 'High learning curve, many concepts to learn',
        best_for: 'Enterprise web app, large-scale SPA',
        job_demand: 'High in enterprise, especially enterprise',
        ecosystem: 'Angular Material, NgRx, RxJS',
        difficulty: 'advanced',
    },
    vue: {
        ease_of_learning: 'Easiest among 3 big frameworks (React, Angular, Vue)',
        best_for: 'Web frontend, small to medium SPA, fast projects',
        job_demand: 'Pretty high, growing well',
        ecosystem: 'Nuxt.js, Vuex/Pinia, Vuetify',
        difficulty: 'beginner',
    },
    nodejs: {
        ease_of_learning: 'Easy if you know JavaScript',
        best_for: 'Backend, API, real-time apps, microservices',
        job_demand: 'Very high, especially with JS fullstack',
        ecosystem: 'Express, NestJS, Fastify, Socket.io',
        difficulty: 'intermediate',
    },
    django: {
        ease_of_learning: 'Pretty easy, built-in admin panel, batteries included',
        best_for: 'Backend, MVP, rapid development, Python projects',
        job_demand: 'Pretty high in Python community',
        ecosystem: 'Django REST Framework, Celery, PostgreSQL',
        difficulty: 'intermediate',
    },
    spring: {
        ease_of_learning: 'High learning curve, many configs, many ways to do things',
        best_for: 'Enterprise backend, Java microservice',
        job_demand: 'Very high in Java enterprise',
        ecosystem: 'Spring Boot, Spring Security, Spring Data',
        difficulty: 'advanced',
    },
    docker: {
        ease_of_learning: 'Medium, many concepts to understand',
        best_for: 'DevOps, Deployment, Microservices, CI/CD',
        job_demand: 'Very high, almost mandatory in DevOps',
        ecosystem: 'Docker Compose, Kubernetes, Helm',
        difficulty: 'intermediate',
    },
    kubernetes: {
        ease_of_learning: 'Hard, many concepts and objects',
        best_for: 'Container orchestration, Cloud, DevOps',
        job_demand: 'High, especially in cloud-native',
        ecosystem: 'Helm, kubectl, K9s, ArgoCD',
        difficulty: 'advanced',
    },
    sql: {
        ease_of_learning: 'Easy to learn, syntax close to natural language',
        best_for: 'Data analysis, Backend, Database management',
        job_demand: 'Very high, mandatory skill',
        ecosystem: 'MySQL, PostgreSQL, SQL Server, MongoDB (NoSQL)',
        difficulty: 'beginner',
    },
    aws: {
        ease_of_learning: 'Very many services, high learning curve',
        best_for: 'Cloud computing, Backend infrastructure, Data',
        job_demand: 'Very high, certifications are valuable',
        ecosystem: 'EC2, S3, Lambda, RDS, DynamoDB',
        difficulty: 'advanced',
    },
    flutter: {
        ease_of_learning: 'Easy if you know Dart, fast hot reload',
        best_for: 'Cross-platform mobile, iOS + Android from 1 codebase',
        job_demand: 'Growing strongly',
        ecosystem: 'Dart, Riverpod, BLoC, Firebase',
        difficulty: 'intermediate',
    },
    'react native': {
        ease_of_learning: 'Easy if you know React, can reuse web code',
        best_for: 'Cross-platform mobile, iOS + Android',
        job_demand: 'Pretty high, especially in startups',
        ecosystem: 'Expo, TypeScript, Redux, Firebase',
        difficulty: 'intermediate',
    },
    html: {
        ease_of_learning: 'Very easy, the most basic markup language',
        best_for: 'Web development, web foundation',
        job_demand: 'Mandatory for web developers',
        ecosystem: 'HTML5, CSS3, Accessibility',
        difficulty: 'beginner',
    },
    css: {
        ease_of_learning: 'Easy to learn, but mastery is hard',
        best_for: 'Web styling, responsive design, animations',
        job_demand: 'Mandatory for frontend',
        ecosystem: 'Tailwind, Sass, Bootstrap, CSS-in-JS',
        difficulty: 'intermediate',
    },
};

// ====== Comparison System Prompt (English) ======
const EN_COMPARISON_SYSTEM_PROMPT = `You are an intelligent learning consultant for the e-Learning platform.

RESPONSE RULES:
1. Start with a BRIEF COMPARISON (2-3 sentences) — which suits whom
2. COMPARE BY CRITERIA: Easy to learn, Strong applications, Job market, Who it's for
3. IF USER HAS STUDIED → Provide PERSONALIZED SUGGESTIONS based on completed courses, recommend next steps
4. CONCLUSION: What to learn next, specific roadmap

RETURN PURE TEXT (not JSON), beautiful markdown format.
DO NOT just render statistics — must include reasoning and advice.
ALWAYS mention user's completed courses if any.
If both topics are not in the database, still compare based on professional knowledge.
Respond in English, naturally and friendly.`;

// ====== Main System Prompt (English) ======
const EN_SYSTEM_PROMPT = `You are a friendly course consultation assistant for the e-Learning platform.

CONVERSATION STYLE:
- Respond naturally, friendly like chatting with a friend
- Use emoji appropriately 😊
- Can have normal conversations besides course consulting

MANDATORY OUTPUT RULES:
- ONLY output JSON with 4 fields: reply, references, quickReplies, action
- ABSOLUTELY DO NOT output: analysis, thinking, reasoning, chain_of_thought, internal, notes
- If returning JSON → reply MUST be in English
- If normal chat → English text, no JSON needed

IMPORTANT RULES:
1. If user asks about courses, registration, or needs to display a list → return JSON
2. If user just chatting normally → respond naturally in English, no JSON
3. DO NOT require references if there are no suitable courses
4. quickReplies only when truly helpful

WHEN RESPONDING ABOUT COURSES (use JSON):
{
  "reply": "NATURAL ANSWER, can contain course information directly here",
  "references": [{"type":"course","id":1,"slug":"python-basics","title":"Python Basics","price":0}],
  "quickReplies": [],
  "action": null
}

EXAMPLE RESPONSES:

Case 1: User asks about free courses
"Hey, are there any free NodeJS courses?"
→ {"reply": "Yes! There are some pretty good free NodeJS courses 👇", "references": [...], "quickReplies": [], "action": null}

Case 2: User is repeating (natural)
"I want to learn nodejs course, like I want to learn nodejs course"
→ "Haha, I got it! You like NodeJS right? 😊 Let me find some great courses for you!"

Case 3: User asks about price
"How much is that course?"
→ "That course costs $12.99! Want me to guide you through registration?"

Case 4: User wants to enroll in FREE course
"enroll python course"
→ {"reply": "Enrolled successfully! Happy learning! 🎉", "references": [...], "quickReplies": [], "action": {"type":"enroll","courseId":5,"courseTitle":"Python Basics"}}

Case 5: User wants to enroll in PAID course
"register for React course"
→ {"reply": "React course costs $49.99. Please complete payment to register!", "references": [...], "quickReplies": [...], "action": null}

Case 6: User asks about course info mentioned
"What will I learn in this course?"
→ Use information from "CURRENTLY MENTIONED COURSE" in context

Case 7: Normal chat
"hi", "thanks", "bye"
→ Respond naturally, no JSON needed. Example: "Hi! Nice to meet you 😊 How can I help you today?"

|STRICTLY FOLLOW ANTI-HALLUCINATION RULES:
- ONLY suggest courses from AVAILABLE COURSE LIST in context
- ABSOLUTELY DO NOT create, fabricate, or propose courses not in the list
- ABSOLUTELY DO NOT add price, name, course content info without data
- ABSOLUTELY DO NOT fabricate learning progress or earned certificates if not in data
- If AVAILABLE COURSE LIST is empty or says "No suitable courses":
  → Respond: "I couldn't find any courses matching your requirements. Try asking about a different topic!"
  → DO NOT suggest any courses, even free ones
- references ONLY contain courses actually in AVAILABLE_COURSE
- If no courses in context, reply must be PURE TEXT, no references

|CONTEXTUAL FOLLOW-UP (IMPORTANT):
- When user asks "related courses", "next course", "what to learn after" WITHOUT specifying a topic:
  → Must use "CURRENTLY MENTIONED TOPIC" in context to determine the topic
  → Example: "any related courses I can buy" + context has "nodejs" → suggest NodeJS related courses
- When user says "related", "next", "similar" and context has enrolled courses:
  → Prioritize suggesting advanced/supplementary courses for completed courses
- NEVER ignore "CURRENTLY MENTIONED TOPIC" to answer generically
- If context has NO active topic and user asks "related courses":
  → Ask back: "What topic are you interested in so I can suggest?"`;

// ====== English Language Provider ======
export const englishProvider: LanguageProvider = {
    locale: 'en',
    name: 'English',
    
    systemPrompt: EN_SYSTEM_PROMPT,
    comparisonPrompt: EN_COMPARISON_SYSTEM_PROMPT,
    
    topicKnowledge: TOPIC_KNOWLEDGE_EN,
    
    quickReplies: {
        greeting: [
            { text: 'Find Courses', value: 'find courses' },
            { text: 'Free Courses', value: 'free courses' },
            { text: 'Learning Path', value: 'learning path' },
        ],
        courseSearch: [
            { text: 'Find Courses', value: 'find courses' },
            { text: 'My Courses', value: 'my courses' },
            { text: 'Get Suggestions', value: 'suggest courses' },
        ],
        outOfDomain: [
            { text: 'Find Courses', value: 'find courses' },
            { text: 'Free Courses', value: 'free courses' },
            { text: 'Learning Path', value: 'learning path backend' },
        ],
        fallback: [
            { text: 'Find Courses', value: 'find courses' },
            { text: 'Try Again', value: '__RETRY__' },
        ],
    },
    
    detectionPatterns: [
        // Common English question words and phrases
        /\b(how|what|which|can|could|would|should|where|when|who|why)\b/i,
        // Common English words
        /\b(the|a|an|is|are|was|were|do|does|did|have|has|need|want|like|know|think)\b/i,
        // Course-related English words
        /\b(course|learn|study|class|lesson|tutorial|guide|tip|enroll|register|price|cost|free|paid)\b/i,
    ],
    
    responses: {
        outOfDomain: 'Oops, I only support questions about courses 😅 Do you need any course recommendations?',
        fallback: 'Oops, something went wrong 😅 Can you try asking again? Or contact support if needed!',
        cancel: 'Cancelled. Do you need help with anything else?',
        clarification: 'What field are you interested in? Let me suggest some popular topics!',
        greeting: 'Hi there! Great to meet you 😊 How can I help you today?',
    },
};
