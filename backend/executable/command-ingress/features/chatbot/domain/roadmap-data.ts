export interface RoadmapStep {
    order: number;
    title: string;
    description: string;
    skills: string[];
    estimatedWeeks: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface Roadmap {
    id: string;
    title: string;
    description: string;
    targetCareer: string;
    totalDurationMonths: number;
    steps: RoadmapStep[];
    relatedTopics: string[];
}

// Career roadmaps data
export const CAREER_ROADMAPS: Roadmap[] = [
    // ===== BACKEND JAVA =====
    {
        id: 'backend-java',
        title: 'Lộ trình Backend Java Developer',
        description: 'Từ Java cơ bản đến chuyên gia Backend với Spring Boot và Microservices',
        targetCareer: 'Backend Developer',
        totalDurationMonths: 6,
        relatedTopics: ['java', 'spring', 'spring boot', 'microservices', 'docker', 'kubernetes'],
        steps: [
            {
                order: 1,
                title: 'Java Core Fundamentals',
                description: 'Nền tảng Java cơ bản: OOP, Collections, Exception Handling, I/O',
                skills: ['Java SE', 'OOP', 'Collections Framework', 'Exception Handling', 'File I/O'],
                estimatedWeeks: 4,
                difficulty: 'beginner',
            },
            {
                order: 2,
                title: 'SQL & Database',
                description: 'Thiết kế CSDL, SQL queries, stored procedures, transaction',
                skills: ['SQL', 'MySQL/PostgreSQL', 'Database Design', 'ERD', 'Normalization'],
                estimatedWeeks: 3,
                difficulty: 'beginner',
            },
            {
                order: 3,
                title: 'Java Web Development',
                description: 'Servlet, JSP, MVC Pattern, RESTful API cơ bản',
                skills: ['Servlet', 'JSP', 'MVC', 'REST API', 'HTTP Protocol'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 4,
                title: 'Spring Boot Master',
                description: 'Spring Core, Spring MVC, Spring Data JPA, Spring Security',
                skills: ['Spring Boot', 'Dependency Injection', 'Spring Data JPA', 'Spring Security', 'Thymeleaf'],
                estimatedWeeks: 6,
                difficulty: 'intermediate',
            },
            {
                order: 5,
                title: 'Advanced Spring & Microservices',
                description: 'Microservices architecture, Spring Cloud, API Gateway, Circuit Breaker',
                skills: ['Microservices', 'Spring Cloud', 'Eureka', 'Zuul/Gateway', 'Feign Client', 'Hystrix'],
                estimatedWeeks: 6,
                difficulty: 'advanced',
            },
            {
                order: 6,
                title: 'DevOps & Deployment',
                description: 'Docker, Kubernetes, CI/CD, Cloud deployment (AWS/GCP)',
                skills: ['Docker', 'Kubernetes', 'Jenkins', 'GitHub Actions', 'AWS EC2/S3', 'CI/CD'],
                estimatedWeeks: 4,
                difficulty: 'advanced',
            },
        ],
    },

    // ===== BACKEND NODEJS =====
    {
        id: 'backend-nodejs',
        title: 'Lộ trình Backend Node.js Developer',
        description: 'Xây dựng backend với Node.js, Express và các công nghệ hiện đại',
        targetCareer: 'Backend Developer',
        totalDurationMonths: 5,
        relatedTopics: ['nodejs', 'express', 'javascript', 'typescript', 'mongodb', 'docker'],
        steps: [
            {
                order: 1,
                title: 'JavaScript & Node.js Basics',
                description: 'ES6+, Async/Await, Node.js runtime, npm ecosystem',
                skills: ['JavaScript ES6+', 'Node.js', 'npm', 'Async/Await', 'Promises'],
                estimatedWeeks: 3,
                difficulty: 'beginner',
            },
            {
                order: 2,
                title: 'Express.js & REST API',
                description: 'Express framework, middleware, routing, RESTful API design',
                skills: ['Express.js', 'Middleware', 'REST API', 'Authentication', 'Validation'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 3,
                title: 'Database Mastery',
                description: 'MongoDB (NoSQL), Mongoose ODM, Redis cache, SQL basics',
                skills: ['MongoDB', 'Mongoose', 'Redis', 'PostgreSQL', 'Database Design'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 4,
                title: 'Authentication & Security',
                description: 'JWT, OAuth2, bcrypt, HTTPS, Security best practices',
                skills: ['JWT', 'OAuth2', 'bcrypt', 'Helmet.js', 'CORS', 'Rate Limiting'],
                estimatedWeeks: 3,
                difficulty: 'intermediate',
            },
            {
                order: 5,
                title: 'TypeScript & Clean Architecture',
                description: 'TypeScript patterns, SOLID principles, DDD, Clean Architecture',
                skills: ['TypeScript', 'SOLID', 'Clean Architecture', 'DDD', 'Design Patterns'],
                estimatedWeeks: 4,
                difficulty: 'advanced',
            },
            {
                order: 6,
                title: 'DevOps & Cloud',
                description: 'Docker, CI/CD, Cloud deployment, Monitoring',
                skills: ['Docker', 'Kubernetes', 'AWS', 'PM2', 'CI/CD', 'Monitoring'],
                estimatedWeeks: 3,
                difficulty: 'advanced',
            },
        ],
    },

    // ===== FRONTEND REACT =====
    {
        id: 'frontend-react',
        title: 'Lộ trình Frontend React Developer',
        description: 'Từ HTML/CSS đến React Developer chuyên nghiệp',
        targetCareer: 'Frontend Developer',
        totalDurationMonths: 5,
        relatedTopics: ['react', 'javascript', 'typescript', 'html', 'css', 'nextjs'],
        steps: [
            {
                order: 1,
                title: 'Web Fundamentals',
                description: 'HTML5, CSS3, Responsive design, Flexbox, Grid',
                skills: ['HTML5', 'CSS3', 'Flexbox', 'Grid', 'Responsive Design', 'SASS/SCSS'],
                estimatedWeeks: 4,
                difficulty: 'beginner',
            },
            {
                order: 2,
                title: 'JavaScript Deep Dive',
                description: 'ES6+, DOM manipulation, Async JS, Modern JS features',
                skills: ['JavaScript ES6+', 'DOM', 'BOM', 'Async/Await', 'Fetch API', 'Modules'],
                estimatedWeeks: 4,
                difficulty: 'beginner',
            },
            {
                order: 3,
                title: 'React Fundamentals',
                description: 'Components, JSX, Props, State, Hooks cơ bản',
                skills: ['React', 'JSX', 'Props', 'useState', 'useEffect', 'Hooks'],
                estimatedWeeks: 5,
                difficulty: 'intermediate',
            },
            {
                order: 4,
                title: 'React Advanced',
                description: 'Context API, Redux/Zustand, React Router, Performance optimization',
                skills: ['Context API', 'Redux', 'React Router', 'useMemo', 'useCallback', 'Suspense'],
                estimatedWeeks: 5,
                difficulty: 'intermediate',
            },
            {
                order: 5,
                title: 'Next.js & SSR',
                description: 'Next.js, SSR, SSG, API routes, Deployment',
                skills: ['Next.js', 'SSR', 'SSG', 'API Routes', 'Deployment', 'Vercel'],
                estimatedWeeks: 4,
                difficulty: 'advanced',
            },
            {
                order: 6,
                title: 'Testing & Performance',
                description: 'Unit testing, E2E testing, Performance optimization',
                skills: ['Jest', 'React Testing Library', 'Cypress', 'Lighthouse', 'Bundle Optimization'],
                estimatedWeeks: 3,
                difficulty: 'advanced',
            },
        ],
    },

    // ===== DATA SCIENCE / AI =====
    {
        id: 'data-science-ai',
        title: 'Lộ trình Data Science & AI Engineer',
        description: 'Từ Python cơ bản đến Machine Learning và Deep Learning',
        targetCareer: 'AI Engineer / Data Scientist',
        totalDurationMonths: 8,
        relatedTopics: ['python', 'machine learning', 'deep learning', 'ai', 'data science'],
        steps: [
            {
                order: 1,
                title: 'Python Programming',
                description: 'Python cơ bản, data structures, OOP, libraries ecosystem',
                skills: ['Python', 'NumPy', 'Pandas', 'Matplotlib', 'Jupyter'],
                estimatedWeeks: 4,
                difficulty: 'beginner',
            },
            {
                order: 2,
                title: 'Statistics & Mathematics',
                description: 'Linear Algebra, Calculus, Probability, Statistics',
                skills: ['Linear Algebra', 'Calculus', 'Probability', 'Statistics', 'Hypothesis Testing'],
                estimatedWeeks: 5,
                difficulty: 'intermediate',
            },
            {
                order: 3,
                title: 'Machine Learning Fundamentals',
                description: 'Supervised learning, Unsupervised learning, Model evaluation',
                skills: ['Scikit-learn', 'Regression', 'Classification', 'Clustering', 'Model Evaluation'],
                estimatedWeeks: 6,
                difficulty: 'intermediate',
            },
            {
                order: 4,
                title: 'Deep Learning',
                description: 'Neural Networks, CNN, RNN, LSTM, Transformers',
                skills: ['TensorFlow', 'PyTorch', 'CNNs', 'RNNs', 'Transformers', 'BERT'],
                estimatedWeeks: 6,
                difficulty: 'advanced',
            },
            {
                order: 5,
                title: 'NLP & Computer Vision',
                description: 'Natural Language Processing, Computer Vision applications',
                skills: ['NLP', 'Text Processing', 'Computer Vision', 'OpenCV', 'OCR'],
                estimatedWeeks: 5,
                difficulty: 'advanced',
            },
            {
                order: 6,
                title: 'MLOps & Deployment',
                description: 'Model deployment, MLOps, MLflow, Docker',
                skills: ['MLflow', 'Docker', 'FastAPI', 'Model Serving', 'A/B Testing'],
                estimatedWeeks: 4,
                difficulty: 'advanced',
            },
        ],
    },

    // ===== DEVOPS =====
    {
        id: 'devops',
        title: 'Lộ trình DevOps Engineer',
        description: 'Từ Linux basics đến Cloud Native và Kubernetes',
        targetCareer: 'DevOps Engineer',
        totalDurationMonths: 6,
        relatedTopics: ['linux', 'docker', 'kubernetes', 'aws', 'devops', 'git'],
        steps: [
            {
                order: 1,
                title: 'Linux & Bash',
                description: 'Linux administration, Bash scripting, Command line',
                skills: ['Linux', 'Bash', 'Shell Scripting', 'SSH', 'Cron'],
                estimatedWeeks: 4,
                difficulty: 'beginner',
            },
            {
                order: 2,
                title: 'Version Control & Git',
                description: 'Git, GitHub/GitLab workflows, Branching strategies',
                skills: ['Git', 'GitHub', 'GitLab', 'Branching', 'Merge Conflicts'],
                estimatedWeeks: 2,
                difficulty: 'beginner',
            },
            {
                order: 3,
                title: 'Containers with Docker',
                description: 'Docker images, containers, Docker Compose, best practices',
                skills: ['Docker', 'Dockerfile', 'Docker Compose', 'Docker Hub', 'Multi-stage Build'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 4,
                title: 'CI/CD Pipelines',
                description: 'Jenkins, GitHub Actions, GitLab CI, Pipeline as Code',
                skills: ['Jenkins', 'GitHub Actions', 'GitLab CI', 'YAML', 'Pipeline Design'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 5,
                title: 'Kubernetes & Orchestration',
                description: 'K8s architecture, Deployments, Services, Helm',
                skills: ['Kubernetes', 'Pods', 'Services', 'Deployments', 'Helm', 'Ingress'],
                estimatedWeeks: 6,
                difficulty: 'advanced',
            },
            {
                order: 6,
                title: 'Cloud & Infrastructure',
                description: 'AWS/GCP/Azure, Terraform, Infrastructure as Code',
                skills: ['AWS', 'Terraform', 'IaC', 'VPC', 'ECS/EKS', 'CloudFormation'],
                estimatedWeeks: 5,
                difficulty: 'advanced',
            },
        ],
    },

    // ===== FULLSTACK =====
    {
        id: 'fullstack',
        title: 'Lộ trình Fullstack Developer',
        description: 'Kết hợp Frontend + Backend để trở thành Fullstack Developer',
        targetCareer: 'Fullstack Developer',
        totalDurationMonths: 7,
        relatedTopics: ['react', 'nodejs', 'javascript', 'typescript', 'sql', 'mongodb'],
        steps: [
            {
                order: 1,
                title: 'Web Fundamentals',
                description: 'HTML, CSS, JavaScript cơ bản, DOM manipulation',
                skills: ['HTML5', 'CSS3', 'JavaScript', 'DOM', 'Responsive Design'],
                estimatedWeeks: 4,
                difficulty: 'beginner',
            },
            {
                order: 2,
                title: 'Frontend Development',
                description: 'React, State management, Routing, Styling',
                skills: ['React', 'Redux/Context', 'React Router', 'Tailwind CSS', 'Axios'],
                estimatedWeeks: 6,
                difficulty: 'intermediate',
            },
            {
                order: 3,
                title: 'Backend Development',
                description: 'Node.js, Express, REST API, Authentication',
                skills: ['Node.js', 'Express', 'REST API', 'JWT', 'bcrypt'],
                estimatedWeeks: 5,
                difficulty: 'intermediate',
            },
            {
                order: 4,
                title: 'Database',
                description: 'SQL và NoSQL, Database design, ORM',
                skills: ['PostgreSQL', 'MongoDB', 'Prisma', 'Redis', 'Database Design'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 5,
                title: 'DevOps Basics',
                description: 'Docker, CI/CD, Cloud deployment',
                skills: ['Docker', 'GitHub Actions', 'Vercel', 'Railway', 'CI/CD'],
                estimatedWeeks: 3,
                difficulty: 'intermediate',
            },
            {
                order: 6,
                title: 'Advanced Topics',
                description: 'TypeScript, Testing, Performance, Security',
                skills: ['TypeScript', 'Jest', 'Security Best Practices', 'Performance', 'WebSockets'],
                estimatedWeeks: 4,
                difficulty: 'advanced',
            },
        ],
    },

    // ===== MOBILE FLUTTER =====
    {
        id: 'mobile-flutter',
        title: 'Lộ trình Mobile Developer (Flutter)',
        description: 'Xây dựng ứng dụng di động đa nền tảng với Flutter',
        targetCareer: 'Mobile Developer',
        totalDurationMonths: 5,
        relatedTopics: ['flutter', 'dart', 'mobile', 'ios', 'android'],
        steps: [
            {
                order: 1,
                title: 'Dart Programming',
                description: 'Dart language, OOP, async programming',
                skills: ['Dart', 'OOP', 'Async/Await', 'Null Safety', 'Collections'],
                estimatedWeeks: 3,
                difficulty: 'beginner',
            },
            {
                order: 2,
                title: 'Flutter Fundamentals',
                description: 'Widgets, Layouts, Navigation, State management cơ bản',
                skills: ['Flutter Widgets', 'Row/Column', 'ListView', 'Navigation', 'Provider'],
                estimatedWeeks: 5,
                difficulty: 'intermediate',
            },
            {
                order: 3,
                title: 'State Management',
                description: 'Provider, Riverpod, Bloc pattern, State management hiện quả',
                skills: ['Provider', 'Riverpod', 'Bloc', 'setState', 'InheritedWidget'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 4,
                title: 'Backend Integration',
                description: 'REST API, Firebase, Push notifications, Local storage',
                skills: ['HTTP', 'Firebase', 'Firestore', 'Push Notifications', 'SharedPreferences'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 5,
                title: 'Advanced Flutter',
                description: 'Animations, Custom painting, Platform channels, Testing',
                skills: ['Animations', 'Custom Paint', 'Platform Channels', 'Integration Testing', 'App Store'],
                estimatedWeeks: 4,
                difficulty: 'advanced',
            },
        ],
    },

    // ===== PYTHON DATA =====
    {
        id: 'python-backend',
        title: 'Lộ trình Python Backend Developer',
        description: 'Xây dựng backend với Python, Django/Flask và FastAPI',
        targetCareer: 'Backend Developer',
        totalDurationMonths: 5,
        relatedTopics: ['python', 'django', 'flask', 'fastapi', 'sql'],
        steps: [
            {
                order: 1,
                title: 'Python Advanced',
                description: 'Python OOP, Decorators, Generators, AsyncIO',
                skills: ['Python OOP', 'Decorators', 'Generators', 'AsyncIO', 'Context Managers'],
                estimatedWeeks: 4,
                difficulty: 'beginner',
            },
            {
                order: 2,
                title: 'Web Frameworks',
                description: 'Flask basics, Django fundamentals',
                skills: ['Flask', 'Django', 'Jinja2', 'URL Routing', 'Templates'],
                estimatedWeeks: 5,
                difficulty: 'intermediate',
            },
            {
                order: 3,
                title: 'Database & ORM',
                description: 'SQLAlchemy, Django ORM, Database migrations',
                skills: ['SQLAlchemy', 'Django ORM', 'Migrations', 'PostgreSQL', 'Redis'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 4,
                title: 'REST API Development',
                description: 'FastAPI, API design, Authentication, Documentation',
                skills: ['FastAPI', 'Pydantic', 'OpenAPI', 'JWT', 'Swagger'],
                estimatedWeeks: 4,
                difficulty: 'intermediate',
            },
            {
                order: 5,
                title: 'Testing & Deployment',
                description: 'Unit tests, pytest, Docker, Cloud deployment',
                skills: ['pytest', 'Docker', 'GitHub Actions', 'AWS', 'CI/CD'],
                estimatedWeeks: 3,
                difficulty: 'advanced',
            },
        ],
    },
];

// Helper functions
export function findRoadmapByTopic(topic: string): Roadmap | null {
    const lowerTopic = topic.toLowerCase();

    // Direct topic matching
    for (const roadmap of CAREER_ROADMAPS) {
        if (roadmap.relatedTopics.some(t => lowerTopic.includes(t) || t.includes(lowerTopic))) {
            return roadmap;
        }
    }

    // Keyword-based matching
    const topicMappings: Record<string, string> = {
        'java': 'backend-java',
        'spring': 'backend-java',
        'spring boot': 'backend-java',
        'nodejs': 'backend-nodejs',
        'node': 'backend-nodejs',
        'react': 'frontend-react',
        'frontend': 'frontend-react',
        'front-end': 'frontend-react',
        'ai': 'data-science-ai',
        'machine learning': 'data-science-ai',
        'ml': 'data-science-ai',
        'deep learning': 'data-science-ai',
        'data science': 'data-science-ai',
        'devops': 'devops',
        'docker': 'devops',
        'kubernetes': 'devops',
        'fullstack': 'fullstack',
        'full-stack': 'fullstack',
        'flutter': 'mobile-flutter',
        'mobile': 'mobile-flutter',
        'python': 'python-backend',
        'django': 'python-backend',
        'flask': 'python-backend',
        'fastapi': 'python-backend',
    };

    const roadmapId = topicMappings[lowerTopic];
    if (roadmapId) {
        return CAREER_ROADMAPS.find(r => r.id === roadmapId) || null;
    }

    return null;
}

export function getRoadmapsByCareer(career: string): Roadmap[] {
    const lowerCareer = career.toLowerCase();
    return CAREER_ROADMAPS.filter(r =>
        r.targetCareer.toLowerCase().includes(lowerCareer) ||
        r.title.toLowerCase().includes(lowerCareer)
    );
}
