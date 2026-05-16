import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  BookMarked,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
} from 'lucide-react';
import { url } from '../../baseUrl';
import { COURSES_API } from '../../api/courses';
import { getAccessToken } from '../../utils/authStorage';
import { useAuth } from '../../contexts/Auth';
import './LearnerDashboard.css';

interface MetricCard {
  key: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'teal' | 'sky' | 'indigo';
  badge?: string;
}

interface DeadlineItem {
  key: string;
  tag: string;
  title: string;
  subtitle: string;
  variant: 'danger' | 'info' | 'success';
}

interface ChartBar {
  day: string;
  height: number;
  active?: boolean;
}

interface CourseCardItem {
  key: string;
  module: string;
  title: string;
  instructor: string;
  progress: number;
  image: string;
  courseId: number;
  slug: string;
}

interface EnrolledCourse {
  id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  course_thumbnail: string | null;
  progress_percent: number;
  status: 'active' | 'completed' | 'dropped' | 'expired';
  instructor_name?: string;
  modules_count?: number;
  lessons_count?: number;
}

interface EnrollmentsResponse {
  items?: EnrolledCourse[];
  total?: number;
  message?: string;
}

interface LearningActivityDay {
  date: string;
  lessons_completed: number;
}

interface LearningActivityResponse {
  daily_activity?: LearningActivityDay[];
}

const deadlines: DeadlineItem[] = [
  {
    key: 'd1',
    tag: 'Due Today',
    title: 'Quiz: AI Ethics Foundations',
    subtitle: 'Introduction to Artificial Intelligence',
    variant: 'danger',
  },
  {
    key: 'd2',
    tag: 'Oct 24, 2023',
    title: 'Project Proposal Draft',
    subtitle: 'UX Research Masterclass',
    variant: 'info',
  },
  {
    key: 'd3',
    tag: 'Oct 28, 2023',
    title: 'Final Assessment',
    subtitle: 'Advanced Project Management',
    variant: 'success',
  },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FALLBACK_THUMB =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAuZHK_1as0p3iK3Vya7PWldwkBpCA6Aocycr5rCZVHotymC882jcZMXmNR9bkhl5ZTHGSXHebk-UU9hDqQjhpv2WeR7dePUcaTNxLYnikRda2AAWR2GL2iPRmAER14-d7R1ImMNdfWV6TYeYMAEeqO3UdYLWON1dHik0wtUAPo4twRuFu1zxVkw1Ft0CvEyR9Fdt7rTWMAAIZ2hzo0_k3a0B-Xaa35ILZ0uBYJwUIxFbs-X08JgPow7sUthofSB9iLdnIFrwGlBQ';

const LearnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [stats, setStats] = useState({
    inProgress: 0,
    completed: 0,
    overallProgress: 0,
  });
  const [studyHours, setStudyHours] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const courseRowRef = useRef<HTMLDivElement | null>(null);

  const displayName = useMemo(() => {
    const name = user?.full_name?.trim();
    if (name) return name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'Learner';
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const activeParams = new URLSearchParams({
          page: '1',
          page_size: '12',
          status: 'active',
        });
        const completedParams = new URLSearchParams({
          page: '1',
          page_size: '1',
          status: 'completed',
        });
        const [activeRes, completedRes, activityRes] = await Promise.all([
          fetch(`${url}${COURSES_API.myEnrollments}?${activeParams.toString()}`, { headers }),
          fetch(`${url}${COURSES_API.myEnrollments}?${completedParams.toString()}`, { headers }),
          fetch(`${url}${COURSES_API.myLearningActivity}`, { headers }),
        ]);

        const activeJson = (await activeRes.json().catch(() => ({}))) as EnrollmentsResponse;
        const completedJson = (await completedRes.json().catch(() => ({}))) as EnrollmentsResponse;
        const activityJson = (await activityRes.json().catch(() => ({}))) as LearningActivityResponse;

        if (cancelled) return;

        const activeItems = Array.isArray(activeJson.items) ? activeJson.items : [];
        const completedTotal =
          typeof completedJson.total === 'number' ? completedJson.total : 0;

        const inProgress = activeItems.filter(
          (c) => c.progress_percent > 0 && c.progress_percent < 100
        ).length;
        const avgProgress =
          activeItems.length > 0
            ? Math.round(
                activeItems.reduce((sum, c) => sum + (c.progress_percent || 0), 0) /
                  activeItems.length
              )
            : 0;

        setCourses(activeItems);
        setStats({
          inProgress: inProgress || activeItems.length,
          completed: completedTotal,
          overallProgress: avgProgress,
        });

        const dailyActivity = Array.isArray(activityJson.daily_activity)
          ? activityJson.daily_activity
          : [];
        const hours = dailyActivity.map((d) => Number(d?.lessons_completed) || 0);
        if (hours.length === 7) {
          setStudyHours(hours);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics: MetricCard[] = useMemo(
    () => [
      {
        key: 'progress',
        label: 'Overall Progress',
        value: `${stats.overallProgress}%`,
        icon: <TrendingUp size={18} strokeWidth={2.2} />,
        tone: 'teal',
        badge: 'PRO',
      },
      {
        key: 'courses',
        label: 'Courses in Progress',
        value: String(stats.inProgress),
        icon: <BookMarked size={18} strokeWidth={2.2} />,
        tone: 'sky',
      },
      {
        key: 'certs',
        label: 'Certificates Earned',
        value: String(stats.completed),
        icon: <BadgeCheck size={18} strokeWidth={2.2} />,
        tone: 'indigo',
      },
    ],
    [stats]
  );

  const chartData: ChartBar[] = useMemo(() => {
    const max = Math.max(...studyHours, 1);
    const peakIdx = studyHours.indexOf(max);
    return DAY_LABELS.map((day, idx) => ({
      day,
      height: max > 0 ? Math.max(8, Math.round((studyHours[idx] / max) * 100)) : 8,
      active: idx === peakIdx && max > 0,
    }));
  }, [studyHours]);

  const courseCards: CourseCardItem[] = useMemo(
    () =>
      courses.slice(0, 8).map((c) => {
        const modules = c.modules_count || 10;
        const currentModule = Math.max(
          1,
          Math.ceil((c.progress_percent / 100) * modules)
        );
        return {
          key: `course-${c.id || c.course_id}`,
          module: `Module ${currentModule}/${modules}`,
          title: c.course_title,
          instructor: c.instructor_name || 'Course Instructor',
          progress: Math.round(c.progress_percent || 0),
          image: c.course_thumbnail || FALLBACK_THUMB,
          courseId: c.course_id,
          slug: c.course_slug,
        };
      }),
    [courses]
  );

  const handleScrollCourses = (dir: 'prev' | 'next') => {
    const el = courseRowRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === 'next' ? 360 : -360,
      behavior: 'smooth',
    });
  };

  const handleResume = (c: CourseCardItem) => {
    navigate(`/my-courses/${c.courseId}/${c.slug}`);
  };

  return (
    <div className="ld-page">
      <main className="ld-main">
        <section className="ld-welcome">
          <div>
            <h2 className="ld-welcome-title">Welcome back, {displayName}</h2>
            <p className="ld-welcome-sub">
              {loading
                ? 'Loading your learning snapshot…'
                : error
                ? error
                : `You're tracking ${courses.length} active ${
                    courses.length === 1 ? 'course' : 'courses'
                  }. Keep the momentum going!`}
            </p>
          </div>
        </section>

        <div className="ld-grid">
          <div className="ld-col-main">
            <div className="ld-metrics">
              {metrics.map((m) => (
                <div key={m.key} className="ld-metric-card">
                  <div className="ld-metric-head">
                    <span className={`ld-metric-icon ld-metric-icon--${m.tone}`}>
                      {m.icon}
                    </span>
                    {m.badge && <span className="ld-metric-badge">{m.badge}</span>}
                  </div>
                  <div className="ld-metric-body">
                    <p className="ld-metric-label">{m.label}</p>
                    <h3 className="ld-metric-value">
                      {loading ? '—' : m.value}
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            <div className="ld-activity-card">
              <div className="ld-activity-head">
                <div>
                  <h4 className="ld-activity-title">Learning Activity</h4>
                  <p className="ld-activity-sub">
                    Lessons completed over the last 7 days
                  </p>
                </div>
                <div className="ld-activity-legend">
                  <span className="ld-activity-dot" /> Lessons
                </div>
              </div>

              <div className="ld-chart">
                {chartData.map((bar) => (
                  <div key={bar.day} className="ld-chart-col">
                    <div
                      className={`ld-chart-bar ${bar.active ? 'ld-chart-bar--active' : ''}`}
                      style={{ height: `${bar.height}%` }}
                    />
                    <span className="ld-chart-label">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="ld-col-side">
            <div className="ld-deadlines-head">
              <h4 className="ld-deadlines-title">Upcoming Deadlines</h4>
              <Link className="ld-deadlines-all" to="/learner/assignments">
                View All
              </Link>
            </div>

            <div className="ld-deadlines-list">
              {deadlines.map((d) => (
                <div
                  key={d.key}
                  className={`ld-deadline ld-deadline--${d.variant}`}
                >
                  <p className="ld-deadline-tag">{d.tag}</p>
                  <h5 className="ld-deadline-title">{d.title}</h5>
                  <p className="ld-deadline-sub">{d.subtitle}</p>
                </div>
              ))}

              <div className="ld-upsell">
                <div className="ld-upsell-content">
                  <h5 className="ld-upsell-title">Upgrade to Plus</h5>
                  <p className="ld-upsell-sub">
                    Get unlimited access to all professional certificates.
                  </p>
                  <button
                    type="button"
                    className="ld-upsell-btn"
                    onClick={() => navigate('/courses')}
                  >
                    Learn More
                  </button>
                </div>
                <span className="ld-upsell-glow" />
              </div>
            </div>
          </aside>

          <section className="ld-continue">
            <div className="ld-continue-head">
              <h4 className="ld-continue-title">Continue Learning</h4>
              <div className="ld-continue-controls">
                <button
                  type="button"
                  className="ld-round-btn"
                  aria-label="Previous"
                  onClick={() => handleScrollCourses('prev')}
                >
                  <ChevronLeft size={16} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  className="ld-round-btn"
                  aria-label="Next"
                  onClick={() => handleScrollCourses('next')}
                >
                  <ChevronRight size={16} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="ld-empty-row">
                <Loader2 size={20} className="ld-spin" strokeWidth={2.2} />
                <span>Loading your courses…</span>
              </div>
            ) : courseCards.length === 0 ? (
              <div className="ld-empty-row">
                <span>You haven't enrolled in any courses yet.</span>
                <button
                  type="button"
                  className="ld-empty-cta"
                  onClick={() => navigate('/courses')}
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="ld-course-row" ref={courseRowRef}>
                {courseCards.map((c) => (
                  <article key={c.key} className="ld-course-card">
                    <div className="ld-course-media">
                      <img src={c.image} alt={c.title} className="ld-course-img" />
                      <span className="ld-course-pill">{c.module}</span>
                    </div>

                    <div className="ld-course-body">
                      <h5 className="ld-course-title">{c.title}</h5>
                      <p className="ld-course-instructor">
                        Instructor: {c.instructor}
                      </p>

                      <div className="ld-course-progress">
                        <div className="ld-progress-meta">
                          <span className="ld-progress-label">Progress</span>
                          <span className="ld-progress-value">{c.progress}%</span>
                        </div>
                        <div className="ld-progress-track">
                          <div
                            className="ld-progress-fill"
                            style={{ width: `${c.progress}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="ld-course-btn"
                        onClick={() => handleResume(c)}
                      >
                        Resume
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <button
        type="button"
        className="ld-fab"
        aria-label="Add"
        onClick={() => navigate('/courses')}
      >
        <Plus size={22} strokeWidth={2.6} />
      </button>
    </div>
  );
};

export default LearnerDashboard;
