import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Bookmark,
  Compass,
  Loader2,
} from 'lucide-react';
import { url } from '../../baseUrl';
import { COURSES_API } from '../../api/courses';
import { getAccessToken } from '../../utils/authStorage';
import { DEFAULT_COURSE_THUMB } from '../../utils/imageFallback';
import LearnerFab from '../../components/LearnerFab';
import './MyCoursePage.css';

interface FilterTab {
  key: string;
  label: string;
  status: 'all' | 'active' | 'completed' | 'saved';
}

interface EnrolledCourse {
  id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  course_thumbnail: string | null;
  course_level?: string | null;
  progress_percent: number;
  status: 'active' | 'completed' | 'dropped' | 'expired';
  instructor_name?: string;
}

interface EnrollmentsResponse {
  items?: EnrolledCourse[];
  total?: number;
  message?: string;
}

const filterTabs: FilterTab[] = [
  { key: 'all', label: 'Tất cả', status: 'all' },
  { key: 'active', label: 'Đang học', status: 'active' },
  { key: 'completed', label: 'Hoàn thành', status: 'completed' },
  { key: 'saved', label: 'Đã lưu', status: 'saved' },
];

const MyCoursePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const currentTab = filterTabs.find((t) => t.key === activeTab) || filterTabs[0];

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => window.clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    if (currentTab.status === 'saved') {
      setCourses([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: '1',
          page_size: '24',
        });
        if (currentTab.status !== 'all') {
          params.set('status', currentTab.status);
        }
        if (debouncedSearch) {
          params.set('q', debouncedSearch);
        }
        const res = await fetch(
          `${url}${COURSES_API.myEnrollments}?${params.toString()}`,
          { headers }
        );
        const data = (await res.json().catch(() => ({}))) as EnrollmentsResponse;
        if (!res.ok) {
          throw new Error(data?.message || 'Unable to load your courses.');
        }
        if (cancelled) return;
        setCourses(Array.isArray(data.items) ? data.items : []);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load your courses.');
          setCourses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCourses();
    return () => {
      cancelled = true;
    };
  }, [currentTab.status, debouncedSearch]);

  const visibleCourses = useMemo(() => courses, [courses]);

  const openCourse = (c: EnrolledCourse) => {
    navigate(`/my-courses/${c.course_id}/${c.course_slug}`);
  };

  const renderCategory = (c: EnrolledCourse) => {
    if (c.course_level) return c.course_level;
    if (c.status === 'completed') return 'Completed';
    return 'In Progress';
  };

  return (
    <div className="mc-page">
      <div className="mc-page-search">
        <Search size={16} strokeWidth={2.2} className="mc-search-icon" />
        <input
          type="text"
          placeholder="Search courses..."
          className="mc-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <main className="mc-main">
        <div className="mc-container">
          <section className="mc-page-head">
            <div className="mc-page-head-text">
              <h1 className="mc-page-title">My Courses</h1>
              <p className="mc-page-sub">
                Continue where you left off or explore your achievements.
              </p>
            </div>

            <div className="mc-tabs" role="tablist">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`mc-tab ${activeTab === tab.key ? 'mc-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          {loading ? (
            <div className="mc-status mc-status--loading">
              <Loader2 size={20} strokeWidth={2.2} className="mc-spin" />
              <span>Loading courses…</span>
            </div>
          ) : error ? (
            <div className="mc-status mc-status--error">{error}</div>
          ) : visibleCourses.length === 0 ? (
            <section className="mc-empty">
              <div className="mc-empty-icon">
                <Bookmark size={36} strokeWidth={1.6} />
              </div>
              <h3 className="mc-empty-title">
                {currentTab.status === 'saved'
                  ? 'No Saved Courses Yet'
                  : currentTab.status === 'completed'
                  ? "You haven't completed a course yet"
                  : currentTab.status === 'active'
                  ? 'No active enrollments'
                  : "You haven't enrolled in any course yet"}
              </h3>
              <p className="mc-empty-sub">
                {currentTab.status === 'saved'
                  ? "When you find a course you're interested in, save it to your library to access it later."
                  : 'Browse the catalog and enroll in your first course to start tracking progress here.'}
              </p>
              <button
                type="button"
                className="mc-empty-btn"
                onClick={() => navigate('/courses')}
              >
                <Compass size={16} strokeWidth={2.2} />
                Explore Catalog
              </button>
            </section>
          ) : (
            <section className="mc-grid">
              {visibleCourses.map((course) => {
                const progress = Math.round(course.progress_percent || 0);
                return (
                  <article
                    key={`course-${course.id || course.course_id}`}
                    className="mc-card"
                    onClick={() => openCourse(course)}
                  >
                    <div className="mc-card-media">
                      <img
                        className="mc-card-img"
                        src={course.course_thumbnail || DEFAULT_COURSE_THUMB}
                        alt={course.course_title}
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COURSE_THUMB; }}
                      />
                      <span className="mc-card-tag">{renderCategory(course)}</span>
                    </div>

                    <div className="mc-card-body">
                      <h2 className="mc-card-title">{course.course_title}</h2>

                      <div className="mc-progress">
                        <div className="mc-progress-meta">
                          <span className="mc-progress-label">Progress</span>
                          <span className="mc-progress-value">{progress}%</span>
                        </div>
                        <div className="mc-progress-track">
                          <div
                            className="mc-progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mc-card-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCourse(course);
                        }}
                      >
                        Go to Course
                        <ArrowRight size={16} strokeWidth={2.4} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>

      <LearnerFab onClick={() => navigate('/my-courses')} />
    </div>
  );
};

export default MyCoursePage;
