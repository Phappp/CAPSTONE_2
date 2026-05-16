import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Search,
  CalendarDays,
  Users,
  Clock,
  PlayCircle,
  BellRing,
  MoreVertical,
  Share2,
  Sparkles,
  Download,
  Terminal,
  Loader2,
} from 'lucide-react';
import {
  apiListLiveSessions,
  LiveSession,
  LiveSessionStatus,
} from '../../services/liveSessionClient';
import { useAuth } from '../../contexts/Auth';
import './LiveSessionsSchedule.css';

interface SessionCard {
  key: string;
  id: number;
  status: LiveSessionStatus;
  title: string;
  instructor: string;
  schedule: string;
  scheduleIcon: 'clock' | 'calendar';
  attendees?: number;
  primaryLabel: string;
  primaryIcon: React.ReactNode;
  secondaryIcon: React.ReactNode;
}

const formatSchedule = (session: LiveSession): { label: string; icon: 'clock' | 'calendar' } => {
  const dateStr = session.scheduledAt || session.startedAt;
  if (!dateStr) return { label: 'Schedule TBA', icon: 'calendar' };
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return { label: 'Schedule TBA', icon: 'calendar' };

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (sameDay) return { label: `Today, ${time}`, icon: 'clock' };
  if (isTomorrow) return { label: `Tomorrow, ${time}`, icon: 'calendar' };
  return {
    label: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`,
    icon: 'calendar',
  };
};

const LiveSessionsSchedule: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiListLiveSessions({ page_size: 20 }, accessToken);
        if (!cancelled) {
          setSessions(result.items || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load live sessions');
          setSessions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSessions();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const sessionCards: SessionCard[] = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        (s.courseTitle || '').toLowerCase().includes(q) ||
        (s.hostName || '').toLowerCase().includes(q)
      );
    });
    return filtered.slice(0, 6).map((s) => {
      const { label, icon } = formatSchedule(s);
      const isLive = s.status === 'live';
      return {
        key: `session-${s.id}`,
        id: s.id,
        status: s.status,
        title: s.title,
        instructor: s.hostName || s.courseTitle || 'Instructor',
        schedule: label,
        scheduleIcon: icon,
        primaryLabel: isLive ? 'Join Session' : 'Set Reminder',
        primaryIcon: isLive ? <PlayCircle size={18} strokeWidth={2.2} /> : <BellRing size={18} strokeWidth={2.1} />,
        secondaryIcon: isLive ? <MoreVertical size={18} strokeWidth={2.1} /> : <Share2 size={18} strokeWidth={2.1} />,
      };
    });
  }, [sessions, searchTerm]);

  const handleSessionAction = (card: SessionCard) => {
    if (card.status === 'live') {
      navigate(`/live-session/${card.id}`);
    } else {
      // Stub reminder action — toast on a real build.
      window.alert(`Reminder set for "${card.title}".`);
    }
  };

  return (
    <div className="ls-page">
      <div className="ls-page-search">
        <Search size={16} strokeWidth={2.2} className="ls-search-icon" />
        <input
          type="text"
          placeholder="Search sessions, topics..."
          className="ls-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <main className="ls-main">
        <div className="ls-container">
          <section className="ls-page-head">
            <div className="ls-page-text">
              <h1 className="ls-page-title">Live Sessions</h1>
              <p className="ls-page-sub">
                Join your upcoming interactive classes and AI-assisted workshops.
              </p>
            </div>
            <div className="ls-page-actions">
              <button
                type="button"
                className="ls-ghost-btn"
                onClick={() => navigate('/live-sessions')}
              >
                <CalendarDays size={16} strokeWidth={2.2} />
                Calendar View
              </button>
            </div>
          </section>

          {loading ? (
            <div className="ls-status">
              <Loader2 size={20} strokeWidth={2.2} className="ls-spin" />
              <span>Loading sessions…</span>
            </div>
          ) : error ? (
            <div className="ls-status ls-status--error">{error}</div>
          ) : (
            <section className="ls-grid">
              {sessionCards.map((s) => (
                <article
                  key={s.key}
                  className={`ls-card ${s.status === 'live' ? 'ls-card--live' : ''}`}
                >
                  <div className="ls-card-head">
                    <span
                      className={`ls-status-pill ${
                        s.status === 'live' ? 'ls-status-pill--live' : 'ls-status-pill--upcoming'
                      }`}
                    >
                      {s.status === 'live' && <span className="ls-status-dot" />}
                      {s.status === 'live'
                        ? 'Live Now'
                        : s.status === 'ended'
                        ? 'Ended'
                        : 'Upcoming'}
                    </span>

                    {s.attendees != null && (
                      <span className="ls-attendees">
                        <Users size={14} strokeWidth={2.2} />
                        {s.attendees} Students Joined
                      </span>
                    )}
                  </div>

                  <div className="ls-card-body">
                    <h3 className="ls-card-title">{s.title}</h3>
                    <div className="ls-card-instructor">
                      <span className="ls-instructor-icon">
                        <User size={14} strokeWidth={2.2} />
                      </span>
                      <span className="ls-instructor-name">{s.instructor}</span>
                    </div>

                    <div className="ls-schedule">
                      <span className="ls-schedule-icon">
                        {s.scheduleIcon === 'clock' ? (
                          <Clock size={16} strokeWidth={2.2} />
                        ) : (
                          <CalendarDays size={16} strokeWidth={2.2} />
                        )}
                      </span>
                      <span className="ls-schedule-text">{s.schedule}</span>
                    </div>
                  </div>

                  <div className="ls-card-foot">
                    <button
                      type="button"
                      className={`ls-primary-btn ${
                        s.status === 'live'
                          ? 'ls-primary-btn--live'
                          : 'ls-primary-btn--outline'
                      }`}
                      onClick={() => handleSessionAction(s)}
                      disabled={s.status === 'ended'}
                    >
                      {s.primaryIcon}
                      {s.status === 'ended' ? 'Recording soon' : s.primaryLabel}
                    </button>
                    <button
                      type="button"
                      className="ls-secondary-btn"
                      aria-label="More options"
                    >
                      {s.secondaryIcon}
                    </button>
                  </div>
                </article>
              ))}

              <article className="ls-featured">
                <div className="ls-featured-veil" />

                <div className="ls-featured-body">
                  <span className="ls-featured-tag">
                    <Sparkles size={12} strokeWidth={2.4} />
                    Premium Workshop
                  </span>
                  <h2 className="ls-featured-title">
                    AI-Assisted Code Refactoring
                  </h2>
                  <p className="ls-featured-sub">
                    Join our hands-on weekend workshop where we explore the
                    latest LLM-integrated development environments.
                  </p>
                  <div className="ls-featured-row">
                    <button
                      type="button"
                      className="ls-featured-btn"
                      onClick={() => navigate('/courses')}
                    >
                      Enroll Now
                    </button>
                    <span className="ls-featured-meta">
                      Starts Oct 28 • Limited Seats
                    </span>
                  </div>
                </div>
              </article>

              {sessionCards.length === 0 && (
                <div className="ls-empty-spot">
                  <p>No live sessions scheduled yet.</p>
                </div>
              )}
            </section>
          )}

          <section className="ls-workspace">
            <div className="ls-workspace-text">
              <h3 className="ls-workspace-title">Ready your workspace?</h3>
              <p className="ls-workspace-sub">
                Download necessary datasets and environments before the sessions
                start to ensure a seamless learning experience.
              </p>
            </div>
            <div className="ls-workspace-actions">
              <button type="button" className="ls-ghost-btn ls-ghost-btn--lg">
                <Download size={16} strokeWidth={2.2} />
                Resource Pack
              </button>
              <button
                type="button"
                className="ls-dark-btn"
                onClick={() => navigate('/learner/workspace')}
              >
                <Terminal size={16} strokeWidth={2.2} />
                Launch Lab
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default LiveSessionsSchedule;
