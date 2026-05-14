import { BookOpen, ExternalLink, GraduationCap, TrendingUp } from 'lucide-react';

type CourseRef = {
    id: number;
    slug?: string;
    title?: string;
    level?: string;
    price?: number;
    has_certificate?: boolean;
    progress_percent?: number;
};

type CourseCardInlineProps = {
    course: CourseRef;
    onClick: () => void;
};

export function CourseCardInline({ course, onClick }: CourseCardInlineProps) {
    const displayTitle = course.title || 'Khóa học';
    const hasProgress = typeof course.progress_percent === 'number';

    return (
        <button className="chatbot-course-card" onClick={onClick}>
            <div className="chatbot-course-icon">
                <GraduationCap size={20} />
            </div>
            <div className="chatbot-course-content">
                <span className="chatbot-course-title">{displayTitle}</span>
                {hasProgress ? (
                    <div className="chatbot-course-progress">
                        <div className="chatbot-course-progress-bar">
                            <div
                                className="chatbot-course-progress-fill"
                                style={{ width: `${course.progress_percent}%` }}
                            />
                        </div>
                        <span className="chatbot-course-progress-text">
                            <TrendingUp size={12} /> {course.progress_percent}%
                        </span>
                    </div>
                ) : (
                    <div className="chatbot-course-meta">
                        {course.level && <span className="chatbot-course-badge">{course.level}</span>}
                        {course.price === 0 && <span className="chatbot-course-free">Miễn phí</span>}
                        {course.has_certificate && <span className="chatbot-course-cert">Có chứng chỉ</span>}
                    </div>
                )}
            </div>
            <div className="chatbot-course-arrow">
                <ExternalLink size={16} />
            </div>
        </button>
    );
}
