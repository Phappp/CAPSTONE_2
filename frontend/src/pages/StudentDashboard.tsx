import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarMenu from '../components/AvatarMenu';
import { COURSES_API } from '../api/courses';
import { url } from '../baseUrl';
import { getAccessToken } from '../utils/authStorage';
import { useAuth } from '../contexts/Auth';
import './StudentDashboard.css';
import {
  Clock,
  BookOpen,
  Search,
  GraduationCap,
  Award,
  TrendingUp,
  Loader2,
  AlertCircle,
  Sparkles,
  Users,
  Layers3,
  ListChecks,
  ChevronRight
} from 'lucide-react';

// Types
interface Course {
  id: number;
  course_id: number;
  course_title: string;
  course_slug: string;
  course_thumbnail: string | null;
  course_level: string;
  enrolled_at: string;
  last_accessed_at: string | null;
  status: 'active' | 'completed' | 'dropped' | 'expired';
  progress_percent: number;
  completed_at: string | null;
  learners_count?: number;
  modules_count?: number;
  lessons_count?: number;
}

interface SuggestedCourse {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  level: string;
  is_enrolled?: boolean;
  learners_count?: number;
  modules_count?: number;
  lessons_count?: number;
}

interface ApiResponse {
  items: Course[];
  page: number;
  page_size: number;
  total: number;
}

interface CatalogResponse {
  items: SuggestedCourse[];
  page: number;
  page_size: number;
  total: number;
}

interface Stats {
  total: number;
  active: number;
  completed: number;
  inProgress: number;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.full_name?.trim() || user?.email || 'bạn';

  // States cho khóa học của tôi
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [quizIdToJoin, setQuizIdToJoin] = useState('');

  // States cho thống kê
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    completed: 0,
    inProgress: 0
  });

  // States cho gợi ý khóa học
  const [suggested, setSuggested] = useState<SuggestedCourse[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [suggestedError, setSuggestedError] = useState<string | null>(null);

  const pageSize = 9;

  // Fetch enrolled courses
  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();

      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('page_size', String(pageSize));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('q', searchTerm.trim());

      const res = await fetch(`${url}${COURSES_API.myEnrollments}?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = (await res.json().catch(() => ({}))) as Partial<ApiResponse> & { message?: string };
      if (!res.ok) {
        throw new Error(data?.message || 'Không thể tải danh sách khóa học');
      }

      const items = Array.isArray(data.items) ? (data.items as Course[]) : [];
      const total = typeof data.total === 'number' ? data.total : 0;

      setCourses(items);
      setTotalPages(Math.ceil(total / pageSize));

      // Calculate stats
      setStats({
        total,
        active: items.filter(c => c.status === 'active').length,
        completed: items.filter(c => c.status === 'completed').length,
        inProgress: items.filter(c => c.status === 'active' && c.progress_percent > 0 && c.progress_percent < 100).length
      });

      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  };

  // Fetch suggested courses
  const fetchSuggestedCourses = async () => {
    try {
      setSuggestedLoading(true);
      setSuggestedError(null);
      const token = getAccessToken();
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', '6');
      params.set('sort_by', 'learners_count');
      params.set('sort_dir', 'desc');

      const res = await fetch(`${url}${COURSES_API.catalog}?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = (await res.json().catch(() => ({}))) as Partial<CatalogResponse> & { message?: string };
      if (!res.ok) throw new Error(data?.message || 'Không thể tải gợi ý khóa học');
      const items = Array.isArray(data.items) ? (data.items as SuggestedCourse[]) : [];
      setSuggested(items.filter((course) => !course.is_enrolled));
    } catch (err: any) {
      setSuggestedError(err?.message || 'Không thể tải gợi ý khóa học');
      setSuggested([]);
    } finally {
      setSuggestedLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, [currentPage, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        setCurrentPage(1);
        fetchEnrolledCourses();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchSuggestedCourses();
  }, []);

  const openLearningHub = (courseId: number, slug: string) => {
    navigate(`/my-courses/${courseId}/${slug}`);
  };

  const openCoursePublicDetail = (slug: string) => {
    navigate(`/courses/${slug}`);
  };

  const getLevelBadge = (level: string) => {
    const levels: Record<string, { label: string; className: string }> = {
      beginner: { label: 'Cơ bản', className: 'badge badge--green' },
      intermediate: { label: 'Trung cấp', className: 'badge badge--blue' },
      advanced: { label: 'Nâng cao', className: 'badge badge--purple' }
    };
    return levels[level] || { label: level, className: 'badge badge--gray' };
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; className: string }> = {
      active: { label: 'Đang học', className: 'badge badge--green' },
      completed: { label: 'Hoàn thành', className: 'badge badge--blue' },
      dropped: { label: 'Đã dừng', className: 'badge badge--red' },
      expired: { label: 'Hết hạn', className: 'badge badge--gray' }
    };
    return statuses[status] || { label: status, className: 'badge badge--gray' };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa học';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const toDisplayCount = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '--';
    return String(value);
  };

  const visibleSuggested = useMemo(() => {
    const enrolledIds = new Set(courses.map((c) => c.course_id));
    const enrolledSlugs = new Set(courses.map((c) => c.course_slug));
    return suggested.filter((course) => {
      if (course.is_enrolled) return false;
      if (enrolledIds.has(course.id)) return false;
      if (enrolledSlugs.has(course.slug)) return false;
      return true;
    });
  }, [suggested, courses]);

  return (
    <div className="studentDash">
      {/* Header */}
      <div className="studentDash__topbar">
        <div className="studentDash__container">
          <div className="studentDash__topbarInner">
            <div className="studentDash__brand">
              <GraduationCap className="studentDash__brandIcon" />
              <h1 className="studentDash__title">Học viên Dashboard</h1>
            </div>
            <AvatarMenu />
          </div>
        </div>
      </div>

      <div className="studentDash__container studentDash__content">
        {/* Welcome Section */}
        <div className="studentDash__hero">
        </div>

        {/* Student quiz quick entry */}
        <div className="studentDash__quizEntry" style={{ marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            placeholder="Nhập ID bài kiểm tra"
            value={quizIdToJoin}
            onChange={(e) => setQuizIdToJoin(e.target.value)}
            style={{ width: 200 }}
          />
          <button
            className="btn btn--primary"
            onClick={() => {
              if (quizIdToJoin.trim()) {
                navigate(`/quizzes/${quizIdToJoin.trim()}`);
              }
            }}
          >
            Mở quiz
          </button>
        </div>

        {/* Stats Cards */}
        <div className="studentDash__stats">
          <div className="statCard">
            <div className="statCard__row">
              <div>
                <p className="statCard__label">Tổng khóa học</p>
                <p className="statCard__value">{stats.total}</p>
              </div>
              <div className="statCard__iconBox iconBox--blue" aria-hidden="true">
                <BookOpen />
              </div>
            </div>
          </div>

          <div className="statCard">
            <div className="statCard__row">
              <div>
                <p className="statCard__label">Đang học</p>
                <p className="statCard__value">{stats.active}</p>
              </div>
              <div className="statCard__iconBox iconBox--green" aria-hidden="true">
                <TrendingUp />
              </div>
            </div>
          </div>

          <div className="statCard">
            <div className="statCard__row">
              <div>
                <p className="statCard__label">Đang tiến hành</p>
                <p className="statCard__value">{stats.inProgress}</p>
              </div>
              <div className="statCard__iconBox iconBox--yellow" aria-hidden="true">
                <Clock />
              </div>
            </div>
          </div>

          <div className="statCard">
            <div className="statCard__row">
              <div>
                <p className="statCard__label">Hoàn thành</p>
                <p className="statCard__value">{stats.completed}</p>
              </div>
              <div className="statCard__iconBox iconBox--purple" aria-hidden="true">
                <Award />
              </div>
            </div>
          </div>
        </div>

        {/* PHẦN 1: KHÓA HỌC CỦA TÔI */}
        <div className="studentDash__myCourses">
          {/* Filters */}
          <div className="studentDash__filters">
            <div className="studentDash__filtersRow">
              <div className="searchField">
                <Search className="searchField__icon" />
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                />
              </div>
              <div className="studentDash__filtersActions">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="select"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang học</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="dropped">Đã dừng</option>
                  <option value="expired">Hết hạn</option>
                </select>
                <button
                  onClick={() => navigate('/courses')}
                  className="btn btn--primary"
                >
                  <BookOpen width={16} height={16} />
                  Khám phá thêm
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="studentDash__center">
              <Loader2 className="studentDash__brandIcon" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="studentDash__error">
              <AlertCircle width={20} height={20} />
              <div>
                <p className="studentDash__errorTitle">Có lỗi xảy ra</p>
                <p className="studentDash__errorMsg">{error}</p>
                <button
                  onClick={fetchEnrolledCourses}
                  className="btn btn--link"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && courses.length === 0 && (
            <div className="studentDash__empty">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: '#9ca3af' }}>
                <BookOpen width={64} height={64} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px 0' }}>Chưa có khóa học nào</h3>
              <p style={{ color: '#6b7280', margin: '0 0 18px 0' }}>
                Bạn chưa đăng ký khóa học nào. Hãy khám phá và đăng ký ngay!
              </p>
              <button
                onClick={() => navigate('/courses')}
                className="btn btn--primary"
              >
                <BookOpen width={18} height={18} />
                Khám phá khóa học
              </button>
            </div>
          )}

          {/* Course Grid */}
          {!loading && !error && courses.length > 0 && (
            <>
              <div className="studentDash__grid">
                {courses.map((course) => {
                  const level = getLevelBadge(course.course_level);
                  const status = getStatusBadge(course.status);

                  return (
                    <div
                      key={course.id}
                      className="courseCard courseCard--clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => openLearningHub(course.course_id, course.course_slug)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        openLearningHub(course.course_id, course.course_slug);
                      }}
                      aria-label={`Mở khóa học: ${course.course_title}`}
                    >
                      {/* Thumbnail */}
                      <div className="courseCard__thumb">
                        {course.course_thumbnail ? (
                          <img
                            src={course.course_thumbnail}
                            alt={course.course_title}
                          />
                        ) : (
                          <div className="courseCard__thumbPlaceholder">
                            <BookOpen width={48} height={48} />
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="badgePosTopRight">
                          <span className={status.className}>
                            {status.label}
                          </span>
                        </div>

                        {/* Level Badge */}
                        <div className="badgePosBottomLeft">
                          <span className={level.className}>
                            {level.label}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="courseCard__body">
                        <h3 className="courseCard__title">
                          {course.course_title}
                        </h3>

                        {/* Progress */}
                        <div className="courseCard__progress">
                          <div className="courseCard__progressRow">
                            <span>Tiến độ</span>
                            <span className="courseCard__progressPct">{course.progress_percent}%</span>
                          </div>
                          <div className="progressBar" role="progressbar" aria-valuenow={course.progress_percent} aria-valuemin={0} aria-valuemax={100}>
                            <div
                              className="progressBar__fill"
                              style={{ width: `${course.progress_percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Course stats */}
                        <div className="courseCard__quickStats">
                          <div className="quickStat">
                            <Users size={14} />
                            <span>{toDisplayCount(course.learners_count)}</span>
                          </div>
                          <div className="quickStat">
                            <Layers3 size={14} />
                            <span>{toDisplayCount(course.modules_count)}</span>
                          </div>
                          <div className="quickStat">
                            <ListChecks size={14} />
                            <span>{toDisplayCount(course.lessons_count)}</span>
                          </div>
                        </div>

                        {/* Completed badge */}
                        {course.status === 'completed' && (
                          <div className="courseCard__completed">
                            <Award width={16} height={16} />
                            <span>Hoàn thành: {formatDate(course.completed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="studentDash__pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn btn--secondary"
                  >
                    Trước
                  </button>
                  <span className="studentDash__pageLabel">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn btn--secondary"
                  >
                    Sau
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* PHẦN 2: GỢI Ý KHÓA HỌC - RIÊNG BIỆT */}
        {!suggestedLoading && !suggestedError && visibleSuggested.length > 0 && (
          <div className="studentDash__suggested">
            <div className="studentDash__suggestedHeader">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={24} color="#2563eb" />
                <h3 className="studentDash__suggestedTitle">Gợi ý khóa học</h3>
                <span className="studentDash__suggestedBadge">Phổ biến nhất</span>
              </div>
              <button
                className="btn btn--secondary"
                type="button"
                onClick={() => navigate('/courses')}
              >
                Xem tất cả
                <ChevronRight width={16} height={16} />
              </button>
            </div>

            {suggestedLoading ? (
              <div className="studentDash__center" style={{ padding: '24px 0' }}>
                <Loader2 className="studentDash__brandIcon" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : suggestedError ? (
              <div className="studentDash__error" style={{ marginTop: 16 }}>
                <AlertCircle width={20} height={20} />
                <div>
                  <p className="studentDash__errorTitle">Không thể tải gợi ý</p>
                  <p className="studentDash__errorMsg">{suggestedError}</p>
                  <button
                    onClick={fetchSuggestedCourses}
                    className="btn btn--link"
                  >
                    Thử lại
                  </button>
                </div>
              </div>
            ) : (
              <div className="studentDash__grid">
                {visibleSuggested.map((course) => {
                  const level = getLevelBadge(course.level);
                  return (
                    <div
                      key={course.id}
                      className="courseCard courseCard--clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => openCoursePublicDetail(course.slug)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        openCoursePublicDetail(course.slug);
                      }}
                      aria-label={`Xem khóa học: ${course.title}`}
                    >
                      <div className="courseCard__thumb">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt={course.title} />
                        ) : (
                          <div className="courseCard__thumbPlaceholder">
                            <BookOpen width={48} height={48} />
                          </div>
                        )}
                        <div className="badgePosBottomLeft">
                          <span className={level.className}>{level.label}</span>
                        </div>
                      </div>
                      <div className="courseCard__body">
                        <h3 className="courseCard__title">{course.title}</h3>
                        <div className="courseCard__quickStats">
                          <div className="quickStat">
                            <Users size={14} />
                            <span>{toDisplayCount(course.learners_count)}</span>
                          </div>
                          <div className="quickStat">
                            <Layers3 size={14} />
                            <span>{toDisplayCount(course.modules_count)}</span>
                          </div>
                          <div className="quickStat">
                            <ListChecks size={14} />
                            <span>{toDisplayCount(course.lessons_count)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}