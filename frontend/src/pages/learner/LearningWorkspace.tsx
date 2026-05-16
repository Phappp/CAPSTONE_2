import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Award,
  User,
  Terminal,
  ClipboardList,
  Video,
  Bell,
  Settings,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  Captions,
  Maximize,
  CheckSquare,
  BrainCircuit,
  MoreVertical,
  Bot,
  FileText,
  ListTodo,
  HelpCircle,
  Send,
  School,
  Sparkles,
} from 'lucide-react';
import { url } from '../../baseUrl';
import { COURSES_API } from '../../api/courses';
import { getAccessToken } from '../../utils/authStorage';
import { useAuth } from '../../contexts/Auth';
import './LearningWorkspace.css';

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  to: string;
  active?: boolean;
}

interface TabItem {
  key: string;
  label: string;
}

interface ChatMessage {
  key: string;
  role: 'ai' | 'user';
  time: string;
  body: React.ReactNode;
}

interface QuickAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

interface EnrolledCourse {
  id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  progress_percent: number;
  modules_count?: number;
  lessons_count?: number;
  instructor_name?: string;
}

interface ProgressResponse {
  progress_percent?: number;
  completed_lessons?: number;
  total_lessons?: number;
  current_module?: string;
  current_lesson?: string;
  lesson_title?: string;
  message?: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={2.1} />, to: '/learner/dashboard' },
  { key: 'my-courses', label: 'My Courses', icon: <GraduationCap size={20} strokeWidth={2.1} />, to: '/learner/my-courses' },
  { key: 'certificates', label: 'Certificates', icon: <Award size={20} strokeWidth={2.1} />, to: '/learner/certificates' },
  { key: 'profile', label: 'Profile', icon: <User size={20} strokeWidth={2.1} />, to: '/learner/settings' },
  { key: 'workspace', label: 'Learning Workspace', icon: <Terminal size={20} strokeWidth={2.1} />, to: '/learner/workspace', active: true },
  { key: 'assignments', label: 'Assignments', icon: <ClipboardList size={20} strokeWidth={2.1} />, to: '/learner/assignments' },
  { key: 'live', label: 'Live Session', icon: <Video size={20} strokeWidth={2.1} />, to: '/learner/schedule' },
];

const tabs: TabItem[] = [
  { key: 'content', label: 'Lesson Content' },
  { key: 'resources', label: 'Resources (4)' },
  { key: 'discussion', label: 'Discussion' },
];

const defaultTags: string[] = ['CSS Grid', 'Flexbox', 'UX Principles', 'Accessibility'];

const seedMessages = (lessonTitle: string): ChatMessage[] => [
  {
    key: 'm1',
    role: 'ai',
    time: '11:04 AM',
    body: (
      <>
        Hello! I'm tracking the lesson content for{' '}
        <strong>{lessonTitle}</strong>. Ask me anything about the material, or
        try one of the quick actions below.
      </>
    ),
  },
];

const quickActions: QuickAction[] = [
  {
    key: 'summarize',
    label: 'Summarize Lesson',
    icon: <FileText size={14} strokeWidth={2.2} />,
    prompt: 'Summarize the key points of this lesson for me.',
  },
  {
    key: 'terms',
    label: 'Key Terms',
    icon: <ListTodo size={14} strokeWidth={2.2} />,
    prompt: 'List the key terms and definitions in this lesson.',
  },
  {
    key: 'quiz',
    label: 'Practice Quiz',
    icon: <HelpCircle size={14} strokeWidth={2.2} />,
    prompt: 'Generate 5 practice quiz questions for this lesson.',
  },
];

const LearningWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryCourseId = Number(searchParams.get('courseId'));
  const queryLessonId = Number(searchParams.get('lessonId'));

  const [activeTab, setActiveTab] = useState<string>('content');
  const [activeEnrollment, setActiveEnrollment] = useState<EnrolledCourse | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  const avatarUrl = user?.avatar_url || undefined;
  const initial = (user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'L').toUpperCase();

  const courseTitle = activeEnrollment?.course_title || 'Advanced UI Design';
  const lessonTitle = progress?.lesson_title || 'Mastering Responsive Pivots';
  const moduleLabel = useMemo(() => {
    if (progress?.current_module) return progress.current_module;
    if (activeEnrollment?.modules_count) {
      const mods = activeEnrollment.modules_count || 10;
      const current = Math.max(
        1,
        Math.ceil(((activeEnrollment.progress_percent || 0) / 100) * mods)
      );
      return `Module ${current}: ${current === mods ? 'Final' : 'In Progress'}`;
    }
    return 'Module 4: Responsive Ecosystems';
  }, [progress, activeEnrollment]);

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchContext = async () => {
      setLoading(true);
      setError(null);
      try {
        // Identify the active enrollment to render breadcrumbs & lesson context
        const params = new URLSearchParams({
          page: '1',
          page_size: '12',
          status: 'active',
        });
        const enrollRes = await fetch(
          `${url}${COURSES_API.myEnrollments}?${params.toString()}`,
          { headers }
        );
        const enrollJson = await enrollRes.json().catch(() => ({}));
        const items: EnrolledCourse[] = Array.isArray((enrollJson as any).items)
          ? (enrollJson as any).items
          : [];

        const target =
          (queryCourseId &&
            items.find((c) => c.course_id === queryCourseId)) ||
          items.sort(
            (a, b) => (b.progress_percent || 0) - (a.progress_percent || 0)
          )[0] ||
          null;

        if (cancelled) return;
        setActiveEnrollment(target);

        if (target && queryLessonId) {
          const progRes = await fetch(
            `${url}${COURSES_API.lessonSummary(target.course_id, queryLessonId)}`,
            { headers }
          );
          if (progRes.ok) {
            const progJson = (await progRes.json().catch(() => ({}))) as ProgressResponse;
            if (!cancelled) setProgress(progJson);
          }
        } else if (target) {
          const progRes = await fetch(
            `${url}${COURSES_API.progress(target.course_id)}`,
            { headers }
          );
          if (progRes.ok) {
            const progJson = (await progRes.json().catch(() => ({}))) as ProgressResponse;
            if (!cancelled) setProgress(progJson);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load workspace context.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchContext();
    return () => {
      cancelled = true;
    };
  }, [queryCourseId, queryLessonId]);

  useEffect(() => {
    setChatHistory(seedMessages(lessonTitle));
  }, [lessonTitle]);

  const quizProgress = useMemo(() => {
    if (!progress) return 0;
    if (typeof progress.progress_percent === 'number') {
      return Math.round(progress.progress_percent);
    }
    if (progress.total_lessons && progress.completed_lessons) {
      return Math.round((progress.completed_lessons / progress.total_lessons) * 100);
    }
    if (activeEnrollment) {
      return Math.round(activeEnrollment.progress_percent || 0);
    }
    return 0;
  }, [progress, activeEnrollment]);

  const watchedLessons = progress?.completed_lessons ?? 0;
  const totalLessons = progress?.total_lessons ?? activeEnrollment?.lessons_count ?? 0;
  const remainingLessons = Math.max(0, totalLessons - watchedLessons);

  const submitChat = (prompt?: string) => {
    const text = (prompt ?? chatInput).trim();
    if (!text) return;
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setChatHistory((prev) => [
      ...prev,
      { key: `u-${prev.length}-${now.getTime()}`, role: 'user', time, body: text },
      {
        key: `a-${prev.length + 1}-${now.getTime()}`,
        role: 'ai',
        time,
        body: (
          <>
            That's a great question! AI tutoring will be available once the
            study-guide service is connected to this workspace.
          </>
        ),
      },
    ]);
    setChatInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitChat();
    }
  };

  return (
    <div className="lw-root">
      <header className="lw-topbar">
        <div className="lw-topbar-left">
          <span className="lw-brand-name">EduFlow LMS</span>
          <nav className="lw-topnav">
            <a className="lw-topnav-link" href="#">Help</a>
            <a className="lw-topnav-link" href="#">Resources</a>
          </nav>
        </div>

        <div className="lw-topbar-right">
          <button type="button" className="lw-icon-btn" aria-label="Notifications">
            <Bell size={18} strokeWidth={2.1} />
            <span className="lw-icon-dot" />
          </button>
          <button
            type="button"
            className="lw-icon-btn"
            aria-label="Settings"
            onClick={() => navigate('/learner/settings')}
          >
            <Settings size={18} strokeWidth={2.1} />
          </button>
          <div
            className="lw-avatar"
            onClick={() => navigate('/learner/settings')}
          >
            {avatarUrl ? (
              <img alt="User Profile" src={avatarUrl} />
            ) : (
              <div className="lw-avatar-fallback">{initial}</div>
            )}
          </div>
        </div>
      </header>

      <aside className="lw-sidebar">
        <div className="lw-brand">
          <div className="lw-brand-mark">
            <School size={18} strokeWidth={2.2} />
          </div>
          <div className="lw-brand-text">
            <h2 className="lw-brand-title">EduFlow</h2>
            <p className="lw-brand-sub">Learning Portal</p>
          </div>
        </div>

        <nav className="lw-nav">
          {navItems.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`lw-nav-link ${item.active ? 'lw-nav-link--active' : ''}`}
            >
              <span className="lw-nav-icon">{item.icon}</span>
              <span className="lw-nav-label">{item.label}</span>
              {item.active && <span className="lw-nav-indicator" />}
            </Link>
          ))}
        </nav>

        <div className="lw-upsell">
          <span className="lw-upsell-tag">Professional Track</span>
          <p className="lw-upsell-headline">
            Unlock advanced lessons &amp; AI tutoring
          </p>
          <button
            type="button"
            className="lw-upsell-btn"
            onClick={() => navigate('/courses')}
          >
            Upgrade Plan
          </button>
          <span className="lw-upsell-glow" />
        </div>
      </aside>

      <main className="lw-main">
        <section className="lw-canvas">
          <div className="lw-crumbs">
            <span className="lw-crumb">{courseTitle}</span>
            <ChevronRight size={14} strokeWidth={2.2} className="lw-crumb-sep" />
            <span className="lw-crumb">{moduleLabel}</span>
            <ChevronRight size={14} strokeWidth={2.2} className="lw-crumb-sep" />
            <span className="lw-crumb lw-crumb--active">{lessonTitle}</span>
          </div>

          {error && <div className="lw-error-banner">{error}</div>}

          <div className="lw-video">
            <div className="lw-video-thumb lw-video-thumb--placeholder" />

            <button
              type="button"
              className="lw-play-btn"
              aria-label="Play"
              onClick={() => {
                if (activeEnrollment) {
                  navigate(
                    `/learning/${activeEnrollment.course_id}/${activeEnrollment.course_slug}`
                  );
                }
              }}
            >
              <Play size={36} strokeWidth={2.6} fill="currentColor" />
            </button>

            <div className="lw-video-controls">
              <div className="lw-video-track">
                <div
                  className="lw-video-fill"
                  style={{ width: `${Math.min(100, Math.max(2, quizProgress))}%` }}
                />
                <span
                  className="lw-video-thumb-dot"
                  style={{ left: `${Math.min(100, Math.max(2, quizProgress))}%` }}
                />
              </div>
              <div className="lw-video-bar">
                <div className="lw-video-bar-left">
                  <button type="button" className="lw-video-iconbtn" aria-label="Pause">
                    <Pause size={18} strokeWidth={2.2} />
                  </button>
                  <button type="button" className="lw-video-iconbtn" aria-label="Volume">
                    <Volume2 size={18} strokeWidth={2.2} />
                  </button>
                  <span className="lw-video-time">
                    {watchedLessons}/{totalLessons || '—'} lessons
                  </span>
                </div>
                <div className="lw-video-bar-right">
                  <button type="button" className="lw-video-iconbtn" aria-label="Captions">
                    <Captions size={18} strokeWidth={2.2} />
                  </button>
                  <button type="button" className="lw-video-iconbtn" aria-label="Settings">
                    <Settings size={18} strokeWidth={2.2} />
                  </button>
                  <button type="button" className="lw-video-iconbtn" aria-label="Fullscreen">
                    <Maximize size={18} strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <section className="lw-tabs-section">
            <div className="lw-tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`lw-tab ${activeTab === tab.key ? 'lw-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="lw-content-grid">
              <div className="lw-lesson">
                <h1 className="lw-lesson-title">{lessonTitle}</h1>
                <p className="lw-lesson-body">
                  {loading
                    ? 'Loading lesson context…'
                    : 'In this lesson, we explore the concept of "Responsive Pivots"—the strategic moment when a UI component must fundamentally change its structural behavior rather than just scaling. We cover adaptive navigation, content reorganization, and the technical implementation using modern CSS Grid and Flexbox techniques.'}
                </p>

                <div className="lw-tags">
                  {defaultTags.map((t) => (
                    <span key={t} className="lw-tag">{t}</span>
                  ))}
                </div>
              </div>

              <aside className="lw-progress-card">
                <h4 className="lw-progress-title">
                  <CheckSquare size={18} strokeWidth={2.2} className="lw-progress-icon" />
                  Lesson Progress
                </h4>

                <div className="lw-progress-row">
                  <span className="lw-progress-label">Course Completion</span>
                  <span className="lw-progress-value">{quizProgress}%</span>
                </div>
                <div className="lw-progress-track">
                  <div
                    className="lw-progress-fill"
                    style={{ width: `${quizProgress}%` }}
                  />
                </div>
                <p className="lw-progress-hint">
                  {quizProgress >= 100
                    ? 'Course complete — your certificate is ready.'
                    : 'Complete every lesson to unlock the final assessment.'}
                </p>

                <div className="lw-progress-meta">
                  <div className="lw-progress-meta-item">
                    <span className="lw-progress-meta-value">{watchedLessons}</span>
                    <span className="lw-progress-meta-label">Done</span>
                  </div>
                  <span className="lw-progress-divider" />
                  <div className="lw-progress-meta-item">
                    <span className="lw-progress-meta-value">{remainingLessons}</span>
                    <span className="lw-progress-meta-label">Left</span>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </section>

        <aside className="lw-chat">
          <div className="lw-chat-head">
            <div className="lw-chat-head-left">
              <div className="lw-chat-avatar">
                <BrainCircuit size={20} strokeWidth={2.2} />
              </div>
              <div className="lw-chat-meta">
                <h3 className="lw-chat-title">AI Study Guide</h3>
                <p className="lw-chat-status">
                  <span className="lw-chat-status-dot" />
                  Live Analysis Active
                </p>
              </div>
            </div>
            <button type="button" className="lw-chat-more" aria-label="More options">
              <MoreVertical size={18} strokeWidth={2.1} />
            </button>
          </div>

          <div className="lw-chat-history">
            {chatHistory.map((msg) => (
              <div
                key={msg.key}
                className={`lw-msg ${msg.role === 'user' ? 'lw-msg--user' : 'lw-msg--ai'}`}
              >
                <div className="lw-msg-avatar">
                  {msg.role === 'ai' ? (
                    <Bot size={14} strokeWidth={2.4} />
                  ) : (
                    <User size={14} strokeWidth={2.4} />
                  )}
                </div>
                <div className="lw-msg-body">
                  <div className="lw-msg-bubble">{msg.body}</div>
                  <span className="lw-msg-time">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lw-chat-foot">
            <div className="lw-quick-actions">
              {quickActions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className="lw-quick"
                  onClick={() => submitChat(a.prompt)}
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>

            <div className="lw-chat-input-wrap">
              <Sparkles size={16} strokeWidth={2.2} className="lw-chat-input-icon" />
              <input
                type="text"
                className="lw-chat-input"
                placeholder="Ask a question about this lesson..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                className="lw-chat-send"
                aria-label="Send"
                onClick={() => submitChat()}
              >
                <Send size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default LearningWorkspace;
