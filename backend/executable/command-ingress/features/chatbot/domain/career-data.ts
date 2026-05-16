export interface Skill {
    name: string;
    level: 'required' | 'preferred' | 'nice-to-have';
}

export interface CareerPath {
    id: string;
    title: string;
    description: string;
    averageSalary: {
        junior: string;
        mid: string;
        senior: string;
    };
    demand: 'high' | 'medium' | 'low';
    requiredSkills: Skill[];
    preferredSkills: Skill[];
    courses?: string[]; // Related course topics
    roadmapId: string;
}

export const CAREER_PATHS: CareerPath[] = [
    {
        id: 'frontend-developer',
        title: 'Frontend Developer',
        description: 'Xây dựng giao diện người dùng cho web và ứng dụng di động. Làm việc với HTML, CSS, JavaScript và các framework như React, Vue, Angular.',
        averageSalary: {
            junior: '8-12 triệu/tháng',
            mid: '15-25 triệu/tháng',
            senior: '30-50 triệu/tháng',
        },
        demand: 'high',
        requiredSkills: [
            { name: 'HTML/CSS', level: 'required' },
            { name: 'JavaScript', level: 'required' },
            { name: 'Responsive Design', level: 'required' },
            { name: 'React/Vue/Angular', level: 'required' },
        ],
        preferredSkills: [
            { name: 'TypeScript', level: 'preferred' },
            { name: 'Next.js/Nuxt', level: 'preferred' },
            { name: 'Testing (Jest, Cypress)', level: 'preferred' },
            { name: 'CSS Frameworks (Tailwind, Bootstrap)', level: 'nice-to-have' },
        ],
        courses: ['react', 'javascript', 'html', 'css', 'typescript', 'nextjs'],
        roadmapId: 'frontend-react',
    },
    {
        id: 'backend-developer',
        title: 'Backend Developer',
        description: 'Phát triển server-side logic, APIs, và database. Làm việc với các ngôn ngữ như Java, Python, Node.js, Go để xây dựng hệ thống backend.',
        averageSalary: {
            junior: '10-15 triệu/tháng',
            mid: '18-30 triệu/tháng',
            senior: '35-60 triệu/tháng',
        },
        demand: 'high',
        requiredSkills: [
            { name: 'Ít nhất 1 ngôn ngữ backend (Java/Python/Node.js/Go)', level: 'required' },
            { name: 'SQL & Database Design', level: 'required' },
            { name: 'REST API / GraphQL', level: 'required' },
            { name: 'Git & Version Control', level: 'required' },
        ],
        preferredSkills: [
            { name: 'Microservices Architecture', level: 'preferred' },
            { name: 'Docker & Kubernetes', level: 'preferred' },
            { name: 'Cloud Services (AWS/GCP)', level: 'preferred' },
            { name: 'Redis/Memcached', level: 'nice-to-have' },
        ],
        courses: ['java', 'python', 'nodejs', 'spring', 'sql', 'docker'],
        roadmapId: 'backend-java',
    },
    {
        id: 'fullstack-developer',
        title: 'Fullstack Developer',
        description: 'Làm việc được cả frontend lẫn backend. Có khả năng xây dựng ứng dụng hoàn chỉnh từ giao diện đến server.',
        averageSalary: {
            junior: '10-18 triệu/tháng',
            mid: '20-35 triệu/tháng',
            senior: '40-70 triệu/tháng',
        },
        demand: 'high',
        requiredSkills: [
            { name: 'Frontend (HTML/CSS/JS + Framework)', level: 'required' },
            { name: 'Backend (Node.js/Python/Java)', level: 'required' },
            { name: 'Database', level: 'required' },
            { name: 'Git & CI/CD', level: 'required' },
        ],
        preferredSkills: [
            { name: 'TypeScript', level: 'preferred' },
            { name: 'React + Node.js stack', level: 'preferred' },
            { name: 'Docker', level: 'preferred' },
            { name: 'Testing', level: 'nice-to-have' },
        ],
        courses: ['react', 'nodejs', 'javascript', 'typescript', 'sql', 'mongodb'],
        roadmapId: 'fullstack',
    },
    {
        id: 'ai-ml-engineer',
        title: 'AI/ML Engineer',
        description: 'Xây dựng và triển khai các mô hình Machine Learning và Deep Learning. Làm việc với dữ liệu lớn, TensorFlow, PyTorch để giải quyết các bài toán AI.',
        averageSalary: {
            junior: '15-25 triệu/tháng',
            mid: '25-45 triệu/tháng',
            senior: '50-100 triệu/tháng',
        },
        demand: 'high',
        requiredSkills: [
            { name: 'Python', level: 'required' },
            { name: 'Machine Learning Algorithms', level: 'required' },
            { name: 'Deep Learning (Neural Networks)', level: 'required' },
            { name: 'Data Processing & Analysis', level: 'required' },
        ],
        preferredSkills: [
            { name: 'TensorFlow/PyTorch', level: 'preferred' },
            { name: 'NLP/Computer Vision', level: 'preferred' },
            { name: 'Cloud ML Services', level: 'preferred' },
            { name: 'MLOps', level: 'nice-to-have' },
        ],
        courses: ['python', 'machine learning', 'deep learning', 'ai', 'data science'],
        roadmapId: 'data-science-ai',
    },
    {
        id: 'data-scientist',
        title: 'Data Scientist',
        description: 'Phân tích dữ liệu để trích xuất insights và xây dựng mô hình dự đoán. Kết hợp statistics, programming và domain knowledge.',
        averageSalary: {
            junior: '12-20 triệu/tháng',
            mid: '22-40 triệu/tháng',
            senior: '45-80 triệu/tháng',
        },
        demand: 'high',
        requiredSkills: [
            { name: 'Python/R', level: 'required' },
            { name: 'Statistics', level: 'required' },
            { name: 'SQL', level: 'required' },
            { name: 'Data Visualization', level: 'required' },
        ],
        preferredSkills: [
            { name: 'Machine Learning', level: 'preferred' },
            { name: 'Big Data (Spark, Hadoop)', level: 'preferred' },
            { name: 'Deep Learning', level: 'nice-to-have' },
            { name: 'A/B Testing', level: 'nice-to-have' },
        ],
        courses: ['python', 'data science', 'machine learning', 'sql', 'excel'],
        roadmapId: 'data-science-ai',
    },
    {
        id: 'devops-engineer',
        title: 'DevOps Engineer',
        description: 'Xây dựng và duy trì hạ tầng CI/CD, automation, monitoring. Kết nối development với operations để đảm bảo deployment suôn sẻ.',
        averageSalary: {
            junior: '12-20 triệu/tháng',
            mid: '25-40 triệu/tháng',
            senior: '45-80 triệu/tháng',
        },
        demand: 'medium',
        requiredSkills: [
            { name: 'Linux Administration', level: 'required' },
            { name: 'Docker/Containers', level: 'required' },
            { name: 'CI/CD Tools', level: 'required' },
            { name: 'Scripting (Bash/Python)', level: 'required' },
        ],
        preferredSkills: [
            { name: 'Kubernetes', level: 'preferred' },
            { name: 'Cloud Platforms (AWS/GCP)', level: 'preferred' },
            { name: 'Terraform/Infrastructure as Code', level: 'preferred' },
            { name: 'Monitoring Tools', level: 'nice-to-have' },
        ],
        courses: ['linux', 'docker', 'kubernetes', 'devops', 'aws', 'git'],
        roadmapId: 'devops',
    },
    {
        id: 'mobile-developer',
        title: 'Mobile Developer',
        description: 'Phát triển ứng dụng di động cho iOS và Android. Sử dụng React Native, Flutter, hoặc Swift/Kotlin native.',
        averageSalary: {
            junior: '10-18 triệu/tháng',
            mid: '20-35 triệu/tháng',
            senior: '40-70 triệu/tháng',
        },
        demand: 'high',
        requiredSkills: [
            { name: 'iOS (Swift) hoặc Android (Kotlin)', level: 'required' },
            { name: 'React Native / Flutter', level: 'required' },
            { name: 'REST API Integration', level: 'required' },
            { name: 'UI/UX Principles', level: 'required' },
        ],
        preferredSkills: [
            { name: 'Cả iOS và Android', level: 'preferred' },
            { name: 'Firebase/Backend Services', level: 'preferred' },
            { name: 'State Management', level: 'preferred' },
            { name: 'App Store Deployment', level: 'nice-to-have' },
        ],
        courses: ['flutter', 'swift', 'kotlin', 'react native', 'mobile'],
        roadmapId: 'mobile-flutter',
    },
    {
        id: 'data-engineer',
        title: 'Data Engineer',
        description: 'Xây dựng và duy trì các pipeline dữ liệu, data warehouses, và ETL processes. Đảm bảo dữ liệu sạch và có thể truy cập được.',
        averageSalary: {
            junior: '12-20 triệu/tháng',
            mid: '25-40 triệu/tháng',
            senior: '45-75 triệu/tháng',
        },
        demand: 'medium',
        requiredSkills: [
            { name: 'SQL & Database', level: 'required' },
            { name: 'Python', level: 'required' },
            { name: 'ETL/ELT Processes', level: 'required' },
            { name: 'Data Modeling', level: 'required' },
        ],
        preferredSkills: [
            { name: 'Apache Spark', level: 'preferred' },
            { name: 'Airflow/Dagster', level: 'preferred' },
            { name: 'Cloud Data Services', level: 'preferred' },
            { name: 'Kafka/Stream Processing', level: 'nice-to-have' },
        ],
        courses: ['python', 'sql', 'data science', 'docker'],
        roadmapId: 'data-science-ai',
    },
];

// Helper functions
export function findCareerByKeyword(keyword: string): CareerPath | null {
    const lowerKeyword = keyword.toLowerCase();

    // Direct match
    for (const career of CAREER_PATHS) {
        if (career.title.toLowerCase().includes(lowerKeyword) ||
            career.id.includes(lowerKeyword)) {
            return career;
        }
    }

    // Keyword mapping
    const keywordMappings: Record<string, string> = {
        'frontend': 'frontend-developer',
        'front-end': 'frontend-developer',
        'frontend developer': 'frontend-developer',
        'backend': 'backend-developer',
        'back-end': 'backend-developer',
        'backend developer': 'backend-developer',
        'fullstack': 'fullstack-developer',
        'full-stack': 'fullstack-developer',
        'fullstack developer': 'fullstack-developer',
        'ai': 'ai-ml-engineer',
        'ai engineer': 'ai-ml-engineer',
        'machine learning': 'ai-ml-engineer',
        'ml': 'ai-ml-engineer',
        'data scientist': 'data-scientist',
        'devops': 'devops-engineer',
        'mobile': 'mobile-developer',
        'mobile developer': 'mobile-developer',
        'app mobile': 'mobile-developer',
        'data engineer': 'data-engineer',
    };

    const careerId = keywordMappings[lowerKeyword];
    if (careerId) {
        return CAREER_PATHS.find(c => c.id === careerId) || null;
    }

    return null;
}

export function getCareersByDemand(demand: 'high' | 'medium' | 'low'): CareerPath[] {
    return CAREER_PATHS.filter(c => c.demand === demand);
}

export function getCareerById(id: string): CareerPath | null {
    return CAREER_PATHS.find(c => c.id === id) || null;
}

// Format career info for chatbot response
export function formatCareerInfo(career: CareerPath): string {
    const skillLevels: Record<Skill['level'], string> = {
        'required': 'BẮT BUỘC',
        'preferred': 'ƯU TIÊN',
        'nice-to-have': 'CÓ THÊM'
    };

    let info = `**${career.title}**\n\n`;
    info += `${career.description}\n\n`;
    info += `📊 **Mức lương trung bình:**\n`;
    info += `- Junior: ${career.averageSalary.junior}\n`;
    info += `- Mid-level: ${career.averageSalary.mid}\n`;
    info += `- Senior: ${career.averageSalary.senior}\n\n`;
    info += `🔥 **Nhu cầu tuyển dụng:** ${career.demand === 'high' ? 'Rất cao' : career.demand === 'medium' ? 'Trung bình' : 'Thấp'}\n\n`;
    info += `🛠️ **Kỹ năng cần có:**\n`;
    for (const skill of career.requiredSkills) {
        info += `- ${skill.name}\n`;
    }
    info += `\n💡 **Kỹ năng ưu tiên:**\n`;
    for (const skill of career.preferredSkills.slice(0, 3)) {
        info += `- ${skill.name}\n`;
    }

    return info;
}
