// StudentDashboard.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import AvatarMenu from '../../components/AvatarMenu';
import { COURSES_API } from '../../api/courses';
import { url } from '../../baseUrl';
import { getAccessToken } from '../../utils/authStorage';
import { useAuth } from '../../contexts/Auth';
import './StudentDashboard.css';
import {
  BookOpen,
  TrendingUp,
  Award,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Sparkles,
  Users,
  Layers3,
  Target,
  LayoutDashboard,
  Menu,
  X
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
  instructor_name?: string;
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
  instructor_name?: string;
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
  overallProgress: number;
  certificatesEarned: number;
}

type MainTab = 'myCourses' | 'suggested';

// Helper: format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Chưa bắt đầu';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Sidebar Menu Items
const menuItems = [
  { path: '/student/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
  { path: '/courses', label: 'Khám phá khóa học', icon: BookOpen },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.full_name?.trim() || user?.email || 'Học viên';

  // UI State
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('myCourses');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // States for enrolled courses
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stats state
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    completed: 0,
    inProgress: 0,
    overallProgress: 0,
    certificatesEarned: 0
  });

  // Suggested courses state
  const [suggested, setSuggested] = useState<SuggestedCourse[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [suggestedError, setSuggestedError] = useState<string | null>(null);

  // Refs for race condition protection
  const enrolledRequestRef = useRef(0);
  const enrolledAbortRef = useRef<AbortController | null>(null);
  const statsRequestRef = useRef(0);
  const suggestedRequestRef = useRef(0);

  const pageSize = 9;

  const buildAuthHeaders = () => {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Fetch enrolled courses
  const fetchEnrolledCourses = async (opts?: {
    nextPage?: number;
    nextStatus?: string;
    nextSearch?: string;
    silent?: boolean;
  }) => {
    const nextPage = opts?.nextPage ?? currentPage;
    const nextStatus = opts?.nextStatus ?? statusFilter;
    const nextSearch = opts?.nextSearch ?? debouncedSearchTerm;
    const requestId = ++enrolledRequestRef.current;
    enrolledAbortRef.current?.abort();
    const controller = new AbortController();
    enrolledAbortRef.current = controller;
    try {
      if (!opts?.silent) setLoading(true);

      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('page_size', String(pageSize));
      if (nextStatus !== 'all') params.set('status', nextStatus);
      if (nextSearch.trim()) params.set('q', nextSearch.trim());

      const res = await fetch(`${url}${COURSES_API.myEnrollments}?${params.toString()}`, {
        headers: buildAuthHeaders(),
        signal: controller.signal,
      });

      const data = (await res.json().catch(() => ({}))) as Partial<ApiResponse> & { message?: string };
      if (!res.ok) {
        throw new Error(data?.message || 'Không thể tải danh sách khóa học');
      }
      if (requestId !== enrolledRequestRef.current) return;

      const items = Array.isArray(data.items) ? (data.items as Course[]) : [];
      const total = typeof data.total === 'number' ? data.total : 0;

      setCourses(items);
      setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
      setError(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      if (requestId !== enrolledRequestRef.current) return;
      setError(err?.message || 'Không thể tải danh sách khóa học');
    } finally {
      if (requestId === enrolledRequestRef.current && !opts?.silent) {
        setLoading(false);
      }
    }
  };

  // Fetch enrollment stats
  const fetchEnrollmentStats = async () => {
    const requestId = ++statsRequestRef.current;
    try {
      const headers = buildAuthHeaders();
      const totalParams = new URLSearchParams({ page: '1', page_size: '1' });
      const completedParams = new URLSearchParams({ page: '1', page_size: '1', status: 'completed' });
      const activeParams = new URLSearchParams({ page: '1', page_size: '500', status: 'active' });

      const [totalRes, completedRes, activeRes] = await Promise.all([
        fetch(`${url}${COURSES_API.myEnrollments}?${totalParams.toString()}`, { headers }),
        fetch(`${url}${COURSES_API.myEnrollments}?${completedParams.toString()}`, { headers }),
        fetch(`${url}${COURSES_API.myEnrollments}?${activeParams.toString()}`, { headers }),
      ]);

      if (!totalRes.ok || !completedRes.ok || !activeRes.ok) {
        throw new Error('Không thể tải thống kê học tập');
      }

      const [totalData, completedData, activeData] = await Promise.all([
        totalRes.json().catch(() => ({} as Partial<ApiResponse>)),
        completedRes.json().catch(() => ({} as Partial<ApiResponse>)),
        activeRes.json().catch(() => ({} as Partial<ApiResponse>)),
      ]);
      if (requestId !== statsRequestRef.current) return;
      
      const total = typeof totalData.total === 'number' ? totalData.total : 0;
      const completed = typeof completedData.total === 'number' ? completedData.total : 0;
      const activeItems = Array.isArray(activeData.items) ? (activeData.items as Course[]) : [];
      const active = activeItems.length;
      const inProgress = activeItems.filter(
        (c) => c.progress_percent > 0 && c.progress_percent < 100
      ).length;
      
      const allItems = activeItems;
      const avgProgress = allItems.length > 0 
        ? Math.round(allItems.reduce((sum, c) => sum + c.progress_percent, 0) / allItems.length)
        : 0;
      
      const certificatesEarned = completed;
      
      setStats({ total, active, completed, inProgress, overallProgress: avgProgress, certificatesEarned });
    } catch {
      if (requestId !== statsRequestRef.current) return;
      setStats({ total: 0, active: 0, completed: 0, inProgress: 0, overallProgress: 0, certificatesEarned: 0 });
    }
  };

  // Fetch suggested courses
  const fetchSuggestedCourses = async () => {
    const requestId = ++suggestedRequestRef.current;
    try {
      setSuggestedLoading(true);
      setSuggestedError(null);
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', '6');
      params.set('sort_by', 'learners_count');
      params.set('sort_dir', 'desc');

      const res = await fetch(`${url}${COURSES_API.catalog}?${params.toString()}`, {
        headers: buildAuthHeaders(),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<CatalogResponse> & { message?: string };
      if (!res.ok) throw new Error(data?.message || 'Không thể tải gợi ý khóa học');
      const items = Array.isArray(data.items) ? (data.items as SuggestedCourse[]) : [];
      if (requestId !== suggestedRequestRef.current) return;
      setSuggested(items.filter((course) => !course.is_enrolled));
    } catch (err: any) {
      if (requestId !== suggestedRequestRef.current) return;
      setSuggestedError(err?.message || 'Không thể tải gợi ý khóa học');
      setSuggested([]);
    } finally {
      if (requestId === suggestedRequestRef.current) {
        setSuggestedLoading(false);
      }
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearchTerm]);

  // Fetch courses when dependency changes
  useEffect(() => {
    void fetchEnrolledCourses({
      nextPage: currentPage,
      nextStatus: statusFilter,
      nextSearch: debouncedSearchTerm,
    });
  }, [currentPage, statusFilter, debouncedSearchTerm]);

  // Initial stats and suggestions
  useEffect(() => {
    void fetchEnrollmentStats();
    fetchSuggestedCourses();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      enrolledAbortRef.current?.abort();
    };
  }, []);

  // Navigation handlers
  const openLearningHub = (courseId: number, slug: string) => {
    navigate(`/my-courses/${courseId}/${slug}`);
  };

  const openCoursePublicDetail = (slug: string) => {
    navigate(`/courses/${slug}`);
  };

  // Helper: get level text
  const getLevelText = (level: string): string => {
    switch (level) {
      case 'beginner': return 'Cơ bản';
      case 'intermediate': return 'Trung cấp';
      case 'advanced': return 'Nâng cao';
      default: return level;
    }
  };

  // Helper: get deadline class
  const getDeadlineClass = (index: number): string => {
    const classes = ['deadline-red', 'deadline-blue', 'deadline-teal'];
    return classes[index % classes.length];
  };

  const getDeadlineColorClass = (index: number): string => {
    const colors = ['text-red', 'text-blue', 'text-teal'];
    return colors[index % colors.length];
  };

  // Study hours mock data
  const getStudyHours = (): number[] => [2, 3, 1.5, 4, 2.5, 3.5, 1];
  const studyHours = getStudyHours();
  const maxHour = Math.max(...studyHours, 5);
  const chartHeight = 120;

  // Filter suggested courses
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

  const handleTabChange = (tab: MainTab) => {
    setActiveMainTab(tab);
    if (tab === 'suggested' && visibleSuggested.length === 0) {
      fetchSuggestedCourses();
    }
  };

  const getModuleLabel = (course: Course) => {
    const currentModule = Math.ceil((course.progress_percent / 100) * (course.modules_count || 10));
    return `Chương ${currentModule}/${course.modules_count || 10}`;
  };

  return (
    <div className="app-layout">
      {isMobileSidebarOpen && (
        <button
          type="button"
          className="mobile-sidebar-overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-label="Đóng menu điều hướng"
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <h1 className="brand-name">MindBridge</h1>
          <p className="brand-subtitle">CỔNG HỌC VIÊN</p>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={`${item.path}-${item.label}`}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="view-progress-btn" onClick={() => navigate('/student/dashboard')}>
            <TrendingUp size={16} />
            Xem tiến độ
          </button>
          
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header Section */}
        <section id="section-header">
          <div className="container header-container">
            <div className="header-top">
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
                aria-label={isMobileSidebarOpen ? 'Đóng menu' : 'Mở menu'}
                aria-expanded={isMobileSidebarOpen}
              >
                {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <AvatarMenu />
            </div>
            
          </div>
        </section>

        {/* Overview Section */}
        <section id="section-overview">
          <div className="container overview-container">
            <div className="metrics-column">
              <div className="metrics-grid">
                {/* Card 1: Overall Progress */}
                <div className="metric-card">
                  <div className="metric-header">
                    <div className="metric-icon-wrapper">
                      <Target size={24} strokeWidth={1.5} color="#006b5f" />
                    </div>
                    {stats.overallProgress > 70 && <span className="pro-badge">PRO</span>}
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Tiến độ tổng quan</span>
                    <span className="metric-value">{stats.overallProgress}%</span>
                  </div>
                </div>
                {/* Card 2: Courses in Progress */}
                <div className="metric-card">
                  <div className="metric-header">
                    <div className="metric-icon-wrapper">
                      <BookOpen size={24} strokeWidth={1.5} color="#006b5f" />
                    </div>
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Khóa học đang học</span>
                    <span className="metric-value">{stats.active}</span>
                  </div>
                </div>
                {/* Card 3: Certificates Earned */}
                <div className="metric-card">
                  <div className="metric-header">
                    <div className="metric-icon-wrapper">
                      <Award size={24} strokeWidth={1.5} color="#006b5f" />
                    </div>
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">Chứng chỉ đạt được</span>
                    <span className="metric-value">{stats.certificatesEarned}</span>
                  </div>
                </div>
              </div>

              {/* Chart Card */}
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title-group">
                    <h3 className="chart-title">Hoạt động học tập</h3>
                    <p className="chart-subtitle">Số giờ học trong 7 ngày gần nhất</p>
                  </div>
                  <div className="chart-legend">
                    <span className="legend-dot"></span>
                    <span className="legend-label">Giờ</span>
                  </div>
                </div>
                <div className="chart-body">
                  <div className="x-axis">
                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
                      <div key={day} className="day-col">
                        <div 
                          className="bar" 
                          style={{ 
                            height: `${(studyHours[idx] / maxHour) * chartHeight}px`,
                            width: '24px',
                            backgroundColor: '#006b5f',
                            borderRadius: '4px 4px 0 0',
                            marginBottom: '8px'
                          }}
                        ></div>
                        <span>{day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Section */}
              <div className="filter-section">
                <div className="search-field">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm khóa học..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <div className="filter-actions">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Đang học</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="dropped">Đã dừng</option>
                    <option value="expired">Hết hạn</option>
                  </select>
                  <button onClick={() => navigate('/courses')} className="explore-btn">
                    <Sparkles size={16} />
                    Khám phá thêm
                  </button>
                </div>

                {/* Tabs */}
                <div className="main-tabs">
                  <button
                    type="button"
                    className={`tab-btn ${activeMainTab === 'myCourses' ? 'active' : ''}`}
                    onClick={() => handleTabChange('myCourses')}
                  >
                    <BookOpen size={16} />
                    Khóa học của tôi
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${activeMainTab === 'suggested' ? 'active' : ''}`}
                    onClick={() => handleTabChange('suggested')}
                  >
                    <Sparkles size={16} />
                    Gợi ý cho bạn
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Column - Deadlines & Promo */}
            <div className="sidebar-column">
              <div className="sidebar-card">
                <div className="sidebar-header">
                  <h3 className="sidebar-title">Hạn nộp sắp tới</h3>
                  <button type="button" className="view-all" onClick={() => navigate('/courses')}>Xem tất cả</button>
                </div>
                <div className="deadline-list">
                  {courses.filter(c => c.status === 'active' && c.progress_percent < 100).slice(0, 3).map((course, idx) => (
                    <div key={course.id} className={`deadline-item ${getDeadlineClass(idx)}`}>
                      <span className={`deadline-date ${getDeadlineColorClass(idx)}`}>
                        {idx === 0 ? 'Sắp đến hạn' : formatDate(course.last_accessed_at) || 'Đang học'}
                      </span>
                      <h4 className="deadline-title">{course.course_title}</h4>
                      <p className="deadline-course">Tiến độ: {course.progress_percent}%</p>
                    </div>
                  ))}
                  {courses.filter(c => c.status === 'active').length === 0 && (
                    <div className="deadline-item deadline-teal">
                      <span className="deadline-date text-teal">Không có hạn nộp</span>
                      <h4 className="deadline-title">Bạn đang theo kịp tiến độ!</h4>
                      <p className="deadline-course">Khám phá thêm khóa học để tiếp tục học</p>
                    </div>
                  )}
                </div>

                <div className="promo-box">
                  <div className="promo-blur"></div>
                  <div className="promo-content">
                    <h4 className="promo-title">Nâng cấp gói Plus</h4>
                    <p className="promo-desc">Mở khóa quyền truy cập không giới hạn vào các chứng chỉ chuyên nghiệp.</p>
                    <button className="promo-btn">Tìm hiểu thêm</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Continue Learning Section */}
        <section id="section-continue-learning">
          <div className="container continue-learning-container">
            <div className="section-header">
              <h2 className="section-title">Tiếp tục học</h2>
              <div className="nav-buttons">
                <button 
                  className="nav-btn" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  className="nav-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && activeMainTab === 'myCourses' && (
              <div className="loading-center">
                <Loader2 className="spinner" />
              </div>
            )}

            {/* Error State */}
            {error && activeMainTab === 'myCourses' && !loading && (
              <div className="error-card">
                <AlertCircle size={20} />
                <div>
                  <p className="error-title">Đã xảy ra lỗi</p>
                  <p className="error-msg">{error}</p>
                  <button onClick={() => fetchEnrolledCourses()} className="retry-btn">Thử lại</button>
                </div>
              </div>
            )}

            {/* My Courses Grid */}
            {activeMainTab === 'myCourses' && !loading && !error && courses.length > 0 && (
              <div className="courses-grid">
                {courses.slice(0, 6).map((course) => (
                  <div 
                    key={course.id} 
                    className="course-card"
                    onClick={() => openLearningHub(course.course_id, course.course_slug)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openLearningHub(course.course_id, course.course_slug);
                      }
                    }}
                    aria-label={`Mở khóa học ${course.course_title}`}
                  >
                    <div className="course-image-wrapper">
                      {course.course_thumbnail ? (
                        <img src={course.course_thumbnail} alt={course.course_title} className="course-image" />
                      ) : (
                        <div className="course-image-placeholder">
                          <BookOpen size={40} strokeWidth={1} />
                        </div>
                      )}
                      <span className="course-badge">{getModuleLabel(course)}</span>
                    </div>
                    <div className="course-info">
                      <h4 className="course-title">{course.course_title}</h4>
                      <p className="course-instructor">{course.instructor_name || 'Giảng viên khóa học'}</p>
                      <div className="course-progress">
                        <div className="progress-header">
                          <span>Tiến độ</span>
                          <span className="progress-percent">{course.progress_percent}%</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${course.progress_percent}%` }}></div>
                        </div>
                      </div>
                      <button className="resume-btn">Học tiếp</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {activeMainTab === 'myCourses' && !loading && !error && courses.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><BookOpen size={48} strokeWidth={1} /></div>
                <h3>Chưa có khóa học nào</h3>
                <p>Bạn chưa đăng ký khóa học nào. Bắt đầu hành trình học ngay hôm nay!</p>
                <button onClick={() => navigate('/courses')} className="btn-primary">Khám phá khóa học</button>
              </div>
            )}

            {/* Suggested Courses Tab */}
            {activeMainTab === 'suggested' && (
              <div className="suggested-section">
                {suggestedLoading ? (
                  <div className="loading-center">
                    <Loader2 className="spinner" />
                  </div>
                ) : suggestedError ? (
                  <div className="error-card">
                    <AlertCircle size={20} />
                    <div>
                      <p className="error-title">Không thể tải gợi ý</p>
                      <p className="error-msg">{suggestedError}</p>
                      <button onClick={fetchSuggestedCourses} className="retry-btn">Thử lại</button>
                    </div>
                  </div>
                ) : visibleSuggested.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><Sparkles size={48} strokeWidth={1} /></div>
                    <h3>Chưa có gợi ý nào</h3>
                    <p>Quay lại sau để xem các gợi ý khóa học phù hợp hơn.</p>
                    <button onClick={() => navigate('/courses')} className="btn-primary">Xem tất cả khóa học</button>
                  </div>
                ) : (
                  <div className="courses-grid">
                    {visibleSuggested.slice(0, 6).map((course) => (
                      <div 
                        key={course.id} 
                        className="course-card"
                        onClick={() => openCoursePublicDetail(course.slug)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openCoursePublicDetail(course.slug);
                          }
                        }}
                        aria-label={`Xem chi tiết khóa học ${course.title}`}
                      >
                        <div className="course-image-wrapper">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt={course.title} className="course-image" />
                          ) : (
                            <div className="course-image-placeholder">
                              <BookOpen size={40} strokeWidth={1} />
                            </div>
                          )}
                          <span className="course-badge">{getLevelText(course.level)}</span>
                        </div>
                        <div className="course-info">
                          <h4 className="course-title">{course.title}</h4>
                          <p className="course-instructor">{course.instructor_name || 'Khóa học nổi bật'}</p>
                          <div className="course-stats">
                            <span className="stat-badge"><Users size={12} /> {course.learners_count || 0} học viên</span>
                            <span className="stat-badge"><Layers3 size={12} /> {course.modules_count || 0} chương</span>
                          </div>
                          <button className="resume-btn">Xem chi tiết</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {activeMainTab === 'myCourses' && totalPages > 1 && !loading && !error && courses.length > 0 && (
              <div className="pagination">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="page-btn">
                  <ChevronLeft size={16} />
                  Trước
                </button>
                <span className="page-info">Trang {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="page-btn">
                  Sau
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}