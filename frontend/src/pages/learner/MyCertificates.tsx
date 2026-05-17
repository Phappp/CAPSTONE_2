import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Filter,
  Sparkles,
  LayoutGrid,
  Terminal,
  CalendarDays,
  Download,
  Share2,
  Lock,
  Star,
  CheckCircle2,
  Clock,
  MessagesSquare,
  Trophy,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { url } from '../../baseUrl';
import { COURSES_API } from '../../api/courses';
import { getAccessToken } from '../../utils/authStorage';
import { useAuth } from '../../contexts/Auth';
import LearnerFab from '../../components/LearnerFab';
import './MyCertificates.css';

interface EnrolledCourse {
  id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  course_thumbnail: string | null;
  completed_at?: string | null;
  status: 'active' | 'completed' | 'dropped' | 'expired';
  progress_percent: number;
}

interface EnrollmentsResponse {
  items?: EnrolledCourse[];
  total?: number;
  message?: string;
}

interface CertificateItem {
  key: string;
  title: string;
  subtitle: string;
  date: string;
  icon: React.ReactNode;
  iconTone: 'cyan' | 'teal' | 'sky';
  pattern: 'dots' | 'diagonal' | 'lines';
  courseId: number;
  slug: string;
}

interface LockedCert {
  title: string;
  description: string;
  progress: number;
  courseId?: number;
  slug?: string;
}

interface MilestoneItem {
  key: string;
  title: string;
  description: string;
  xp?: string;
  icon: React.ReactNode;
  iconTone: 'teal' | 'cyan';
  locked?: boolean;
}

const ICON_VARIANTS: Array<{
  icon: React.ReactNode;
  tone: CertificateItem['iconTone'];
  pattern: CertificateItem['pattern'];
}> = [
  { icon: <Sparkles size={48} strokeWidth={1.8} />, tone: 'cyan', pattern: 'dots' },
  { icon: <LayoutGrid size={48} strokeWidth={1.8} />, tone: 'teal', pattern: 'diagonal' },
  { icon: <Terminal size={48} strokeWidth={1.8} />, tone: 'sky', pattern: 'lines' },
];

const formatIssueDate = (dateString?: string | null): string => {
  if (!dateString) return 'Recently Issued';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recently Issued';
  return `Issued ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })}`;
};

const MyCertificates: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completedCourses, setCompletedCourses] = useState<EnrolledCourse[]>([]);
  const [activeCourses, setActiveCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const avatarUrl = user?.avatar_url || undefined;
  const initial = (user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'L').toUpperCase();

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
        const completedParams = new URLSearchParams({
          page: '1',
          page_size: '12',
          status: 'completed',
        });
        const activeParams = new URLSearchParams({
          page: '1',
          page_size: '12',
          status: 'active',
        });
        const [completedRes, activeRes] = await Promise.all([
          fetch(`${url}${COURSES_API.myEnrollments}?${completedParams.toString()}`, { headers }),
          fetch(`${url}${COURSES_API.myEnrollments}?${activeParams.toString()}`, { headers }),
        ]);
        const completedJson = (await completedRes.json().catch(() => ({}))) as EnrollmentsResponse;
        const activeJson = (await activeRes.json().catch(() => ({}))) as EnrollmentsResponse;
        if (cancelled) return;
        setCompletedCourses(Array.isArray(completedJson.items) ? completedJson.items : []);
        setActiveCourses(Array.isArray(activeJson.items) ? activeJson.items : []);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load achievements');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const certificates: CertificateItem[] = useMemo(
    () =>
      completedCourses.slice(0, 6).map((c, idx) => {
        const variant = ICON_VARIANTS[idx % ICON_VARIANTS.length];
        return {
          key: `cert-${c.id || c.course_id}`,
          title: c.course_title,
          subtitle: 'Certified Professional',
          date: formatIssueDate(c.completed_at),
          icon: variant.icon,
          iconTone: variant.tone,
          pattern: variant.pattern,
          courseId: c.course_id,
          slug: c.course_slug,
        };
      }),
    [completedCourses]
  );

  const lockedCert: LockedCert | null = useMemo(() => {
    const candidate = [...activeCourses]
      .filter((c) => c.progress_percent > 0 && c.progress_percent < 100)
      .sort((a, b) => b.progress_percent - a.progress_percent)[0];
    if (!candidate) return null;
    return {
      title: candidate.course_title,
      description: `Complete this course to unlock the certificate (${Math.round(
        100 - candidate.progress_percent
      )}% remaining).`,
      progress: Math.round(candidate.progress_percent),
      courseId: candidate.course_id,
      slug: candidate.course_slug,
    };
  }, [activeCourses]);

  const milestones: MilestoneItem[] = useMemo(() => {
    const finished = completedCourses.length;
    const inFlight = activeCourses.length;
    return [
      {
        key: 'm1',
        title: 'First Course Completed',
        description: finished > 0 ? 'Your very first finish — well done!' : 'Complete your first course to unlock.',
        xp: finished > 0 ? '+50 XP' : undefined,
        icon: <CheckCircle2 size={22} strokeWidth={2.1} />,
        iconTone: 'teal',
        locked: finished === 0,
      },
      {
        key: 'm2',
        title: 'Consistent Learner',
        description:
          inFlight > 0
            ? `You're actively pursuing ${inFlight} course${inFlight === 1 ? '' : 's'}.`
            : 'Stay enrolled in a course to maintain momentum.',
        xp: inFlight > 0 ? '+100 XP' : undefined,
        icon: <Clock size={22} strokeWidth={2.1} />,
        iconTone: 'cyan',
        locked: inFlight === 0,
      },
      {
        key: 'm3',
        title: 'Community Contributor',
        description: 'Comment on a lesson discussion to earn this badge.',
        xp: '+25 XP',
        icon: <MessagesSquare size={22} strokeWidth={2.1} />,
        iconTone: 'teal',
      },
      {
        key: 'm4',
        title: 'Course Finisher x5',
        description: finished >= 5 ? `${finished} courses completed!` : `${finished}/5 courses — keep going.`,
        icon: <Trophy size={22} strokeWidth={2.1} />,
        iconTone: 'cyan',
        locked: finished < 5,
      },
    ];
  }, [completedCourses.length, activeCourses.length]);

  const totalXp = completedCourses.length * 50 + activeCourses.length * 100;
  const targetXp = 3000;
  const xpPercent = Math.min(100, Math.round((totalXp / targetXp) * 100));
  const level = Math.max(1, Math.floor(totalXp / 250) + 1);

  return (
    <div className="mcrt-page">
      <main className="mcrt-main">
        <section className="mcrt-page-head">
          <div>
            <h2 className="mcrt-page-title">Achievements &amp; Certificates</h2>
            <p className="mcrt-page-sub">
              Celebrate your milestones and download your verified credentials.
            </p>
          </div>
          <div className="mcrt-actions">
            <button type="button" className="mcrt-filter-btn">
              <Filter size={16} strokeWidth={2.2} />
              Filter
            </button>
          </div>
        </section>

        {error && (
          <div className="mcrt-error-banner">{error}</div>
        )}

        <div className="mcrt-grid">
          <div className="mcrt-col-main">
            {loading ? (
              <div className="mcrt-loading">
                <Loader2 size={20} strokeWidth={2.2} className="mcrt-spin" />
                <span>Loading certificates…</span>
              </div>
            ) : certificates.length === 0 && !lockedCert ? (
              <div className="mcrt-empty">
                <div className="mcrt-empty-icon">
                  <Award size={28} strokeWidth={1.8} />
                </div>
                <h3 className="mcrt-empty-title">No certificates yet</h3>
                <p className="mcrt-empty-sub">
                  Complete a course to earn your first verified credential.
                </p>
                <button
                  type="button"
                  className="mcrt-empty-btn"
                  onClick={() => navigate('/learner/my-courses')}
                >
                  View My Courses
                </button>
              </div>
            ) : (
              <div className="mcrt-cert-grid">
                {certificates.map((cert) => (
                  <article key={cert.key} className="mcrt-cert-card">
                    <div className="mcrt-cert-frame">
                      <div className={`mcrt-cert-pattern mcrt-pattern--${cert.pattern}`} />
                      <span className={`mcrt-cert-icon mcrt-cert-icon--${cert.iconTone}`}>
                        {cert.icon}
                      </span>
                      <div className="mcrt-cert-title-on-frame">{cert.title}</div>
                      <div className="mcrt-cert-subtitle">{cert.subtitle}</div>
                      <div className="mcrt-cert-stamp">
                        Verified by MindBridge Academy
                      </div>
                      <span className="mcrt-cert-glow" />
                    </div>

                    <h3 className="mcrt-cert-title">{cert.title}</h3>
                    <p className="mcrt-cert-date">
                      <CalendarDays size={14} strokeWidth={2.1} />
                      {cert.date}
                    </p>

                    <div className="mcrt-cert-actions">
                      <button
                        type="button"
                        className="mcrt-download-btn"
                        onClick={() =>
                          window.print()
                        }
                      >
                        <Download size={16} strokeWidth={2.2} />
                        Download PDF
                      </button>
                      <button
                        type="button"
                        className="mcrt-share-btn"
                        aria-label="View course"
                        onClick={() => navigate(`/my-courses/${cert.courseId}/${cert.slug}`)}
                      >
                        <Share2 size={16} strokeWidth={2.1} />
                      </button>
                    </div>
                  </article>
                ))}

                {lockedCert && (
                  <div
                    className="mcrt-locked"
                    onClick={() =>
                      lockedCert.courseId && lockedCert.slug
                        ? navigate(`/my-courses/${lockedCert.courseId}/${lockedCert.slug}`)
                        : undefined
                    }
                    style={{ cursor: lockedCert.courseId ? 'pointer' : 'default' }}
                  >
                    <div className="mcrt-locked-icon">
                      <Lock size={26} strokeWidth={1.8} />
                    </div>
                    <h3 className="mcrt-locked-title">{lockedCert.title}</h3>
                    <p className="mcrt-locked-sub">{lockedCert.description}</p>
                    <div className="mcrt-locked-track">
                      <div
                        className="mcrt-locked-fill"
                        style={{ width: `${lockedCert.progress}%` }}
                      />
                    </div>
                    <span className="mcrt-locked-percent">
                      {lockedCert.progress}% complete
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="mcrt-col-side">
            <div className="mcrt-milestones">
              <div className="mcrt-milestones-glow" />

              <h3 className="mcrt-milestones-title">
                <Star size={18} strokeWidth={2.1} className="mcrt-milestones-star" />
                Recent Milestones
              </h3>

              <div className="mcrt-milestones-list">
                {milestones.map((m) => (
                  <div
                    key={m.key}
                    className={`mcrt-milestone ${m.locked ? 'mcrt-milestone--locked' : ''}`}
                  >
                    <div className={`mcrt-milestone-icon mcrt-milestone-icon--${m.iconTone}`}>
                      {m.icon}
                    </div>
                    <div className="mcrt-milestone-content">
                      <h4 className="mcrt-milestone-title">{m.title}</h4>
                      <p className="mcrt-milestone-desc">{m.description}</p>
                      {m.xp && <span className="mcrt-milestone-xp">{m.xp}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="mcrt-milestones-btn"
                onClick={() => navigate('/learner/dashboard')}
              >
                View All Achievements
              </button>
            </div>

            <div className="mcrt-xp-card">
              <div className="mcrt-xp-head">
                <span className="mcrt-xp-level">Level {level} Learner</span>
                <span className="mcrt-xp-value">
                  {totalXp.toLocaleString()} / {targetXp.toLocaleString()} XP
                </span>
              </div>
              <div className="mcrt-xp-track">
                <div className="mcrt-xp-fill" style={{ width: `${xpPercent}%` }} />
              </div>

              <div className="mcrt-xp-goal">
                {avatarUrl ? (
                  <img
                    className="mcrt-xp-avatar"
                    alt="Profile"
                    src={avatarUrl}
                  />
                ) : (
                  <div className="mcrt-xp-avatar mcrt-xp-avatar-fallback">{initial}</div>
                )}
                <div className="mcrt-xp-goal-text">
                  <p className="mcrt-xp-goal-label">Next Goal</p>
                  <p className="mcrt-xp-goal-name">
                    {completedCourses.length >= 5 ? 'Expert Strategist' : 'Course Finisher x5'}
                  </p>
                </div>
                <span className="mcrt-xp-trend">
                  <TrendingUp size={18} strokeWidth={2.2} />
                </span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <LearnerFab onClick={() => navigate('/courses')} />
    </div>
  );
};

export default MyCertificates;
