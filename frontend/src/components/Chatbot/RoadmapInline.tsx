import { Map, CheckCircle, Clock, TrendingUp } from 'lucide-react';

type RoadmapStep = {
    order: number;
    title: string;
    description: string;
    skills: string[];
    estimatedWeeks: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
};

type RoadmapInlineProps = {
    roadmap: {
        id: string;
        title: string;
        description: string;
        targetCareer: string;
        totalDurationMonths: number;
        steps: RoadmapStep[];
    };
    onStepClick?: (step: RoadmapStep) => void;
};

const difficultyColors = {
    beginner: {
        bg: 'rgba(34, 197, 94, 0.1)',
        border: '#22c55e',
        text: '#16a34a',
    },
    intermediate: {
        bg: 'rgba(251, 191, 36, 0.1)',
        border: '#fbbf24',
        text: '#d97706',
    },
    advanced: {
        bg: 'rgba(239, 68, 68, 0.1)',
        border: '#ef4444',
        text: '#dc2626',
    },
};

const difficultyLabels = {
    beginner: 'Người mới',
    intermediate: 'Trung cấp',
    advanced: 'Nâng cao',
};

export function RoadmapInline({ roadmap, onStepClick }: RoadmapInlineProps) {
    return (
        <div className="roadmap-inline">
            <div className="roadmap-header">
                <Map size={18} className="roadmap-icon" />
                <div className="roadmap-info">
                    <h4 className="roadmap-title">{roadmap.title}</h4>
                    <p className="roadmap-description">{roadmap.description}</p>
                    <div className="roadmap-meta">
                        <span className="roadmap-meta-item">
                            <TrendingUp size={14} />
                            {roadmap.targetCareer}
                        </span>
                        <span className="roadmap-meta-item">
                            <Clock size={14} />
                            ~{roadmap.totalDurationMonths} tháng
                        </span>
                    </div>
                </div>
            </div>

            <div className="roadmap-steps">
                {roadmap.steps.map((step, index) => {
                    const colors = difficultyColors[step.difficulty];
                    const isLast = index === roadmap.steps.length - 1;

                    return (
                        <div key={step.order} className="roadmap-step-wrapper">
                            <div
                                className="roadmap-step"
                                style={{
                                    borderLeftColor: colors.border,
                                    backgroundColor: colors.bg,
                                }}
                                onClick={() => onStepClick?.(step)}
                            >
                                <div className="roadmap-step-header">
                                    <div className="roadmap-step-number">
                                        <CheckCircle size={16} />
                                        <span>{step.order}</span>
                                    </div>
                                    <h5 className="roadmap-step-title">{step.title}</h5>
                                    <span
                                        className="roadmap-step-level"
                                        style={{ color: colors.text, backgroundColor: colors.bg }}
                                    >
                                        {difficultyLabels[step.difficulty]}
                                    </span>
                                </div>
                                <p className="roadmap-step-description">{step.description}</p>
                                <div className="roadmap-step-footer">
                                    <div className="roadmap-step-skills">
                                        {step.skills.slice(0, 3).map((skill, i) => (
                                            <span key={i} className="roadmap-skill-tag">
                                                {skill}
                                            </span>
                                        ))}
                                        {step.skills.length > 3 && (
                                            <span className="roadmap-skill-more">
                                                +{step.skills.length - 3}
                                            </span>
                                        )}
                                    </div>
                                    <span className="roadmap-step-duration">
                                        <Clock size={12} />
                                        {step.estimatedWeeks} tuần
                                    </span>
                                </div>
                            </div>
                            {!isLast && <div className="roadmap-connector" />}
                        </div>
                    );
                })}
            </div>

            <div className="roadmap-footer">
                <p className="roadmap-tip">
                    💡 Click vào mỗi bước để xem khóa học liên quan
                </p>
            </div>
        </div>
    );
}
