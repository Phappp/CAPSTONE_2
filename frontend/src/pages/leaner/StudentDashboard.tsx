// StudentDashboard.tsx - Modern UI/UX Redesign with Enhanced Progress
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import AvatarMenu from '../../components/AvatarMenu';
import CoursesCatalogPage from './CoursesCatalogPage';
import { COURSES_API } from '../../api/courses';
import { url } from '../../baseUrl';
import { getAccessToken } from '../../utils/authStorage';
import { useAuth } from '../../contexts/Auth';
import './StudentDashboard.css';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Target,
  LayoutDashboard,
  Compass,
  Video,
  Trophy,
  ArrowRight,
  Clock,
  CheckCircle2,
  BarChart3,
  Calendar,
  Flame,
  Star,
  GraduationCap,
  TrendingUp
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
  completed_lessons?: number; // Mock or derived
  total_lessons?: number;     // Mock or derived
  estimated_time_left?: string; // Mock or derived
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

interface LearningActivityDay {
  date: string;
  lessons_completed: number;
}

interface LearningActivityData {
  daily_activity: LearningActivityDay[];
}

type MainTab = 'myCourses' | 'suggested';

// Helper functions
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Chưa bắt đầu';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

// Sidebar Menu Items
const menuItems = [
  { path: '/student/dashboard', search: '?tab=myCourses', label: 'Bảng điều khiển', icon: LayoutDashboard },
  { path: '/student/dashboard', search: '?tab=suggested', label: 'Khám phá khóa học', icon: BookOpen },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const displayName = user?.full_name?.trim() || user?.email || 'Học viên';
  const greeting = getGreeting();

  // UI State
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('myCourses');

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

  // Learning activity state
  const [studyHours, setStudyHours] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Refs for race condition protection
  const enrolledRequestRef = useRef(0);
  const enrolledAbortRef = useRef<AbortController | null>(null);
  const statsRequestRef = useRef(0);
  const suggestedRequestRef = useRef(0);
  const activityRequestRef = useRef(0);

  const pageSize = 9;

  const buildAuthHeaders = () => {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Helper to enhance a course with detailed progress data
  const enhanceCourseWithProgress = (course: Course): Course => {
    // Mock or derive detailed progress data if not provided by API
    // In a real app, these would come from the API
    const totalLessons = course.lessons_count || 20;
    const completedLessons = Math.floor((course.progress_percent / 100) * totalLessons);
    const remainingLessons = totalLessons - completedLessons;
    
    // Estimate time left (assuming 30 min per lesson)
    const minutesLeft = remainingLessons * 30;
    const hoursLeft = Math.floor(minutesLeft / 60);
    const minsLeft = minutesLeft % 60;
    const estimatedTimeLeft = hoursLeft > 0 
      ? `${hoursLeft} giờ ${minsLeft} phút` 
      : `${minsLeft} phút`;
    
    return {
      ...course,
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      estimated_time_left: estimatedTimeLeft
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

      // Enhance courses with detailed progress
      const enhancedItems = items.map(enhanceCourseWithProgress);
      setCourses(enhancedItems);
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

  // Fetch learning activity
  const fetchLearningActivity = async () => {
    const requestId = ++activityRequestRef.current;
    try {
      const res = await fetch(`${url}${COURSES_API.myLearningActivity}`, {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) throw new Error('Không thể tải hoạt động học tập');
      const data = (await res.json().catch(() => ({}))) as Partial<LearningActivityData>;
      if (requestId !== activityRequestRef.current) return;

      const dailyActivity = Array.isArray(data.daily_activity) ? data.daily_activity : [];
      const hours = dailyActivity.map(d => d.lessons_completed);
      setStudyHours(hours.length === 7 ? hours : [0, 0, 0, 0, 0, 0, 0]);
    } catch {
      if (requestId !== activityRequestRef.current) return;
      setStudyHours([0, 0, 0, 0, 0, 0, 0]);
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
    void fetchLearningActivity();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      enrolledAbortRef.current?.abort();
    };
  }, []);

  const maxHour = Math.max(...studyHours, 1);
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

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'suggested') {
      setActiveMainTab('suggested');
      if (visibleSuggested.length === 0) fetchSuggestedCourses();
      return;
    }
    setActiveMainTab('myCourses');
  }, [searchParams, visibleSuggested.length]);

  const handleTabChange = (tab: MainTab) => {
    setActiveMainTab(tab);
    setSearchParams({ tab });
    if (tab === 'suggested' && visibleSuggested.length === 0) {
      fetchSuggestedCourses();
    }
  };

  const getModuleLabel = (course: Course) => {
    const currentModule = Math.ceil((course.progress_percent / 100) * (course.modules_count || 10));
    return `Chương ${currentModule}/${course.modules_count || 10}`;
  };

  const openLearningHub = (courseId: number, slug: string) => {
    navigate(`/my-courses/${courseId}/${slug}`);
  };

  const openCoursePublicDetail = (slug: string) => {
    navigate(`/courses/${slug}`);
  };

  const location = useLocation();

  const navItems = [
    { path: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/courses", label: "Khám phá", icon: Compass },
    { path: "/live-sessions", label: "Buổi Live", icon: Video },
  ];

  const showNavSidebar = activeMainTab !== 'suggested';

  // Get active courses for the "Continue Learning" section
  const activeCourses = courses.filter(c => c.status === 'active' && c.progress_percent < 100);
  const displayCourses = activeCourses.slice(0, 6);

  // Helper to get progress color
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600';
    if (percent >= 50) return 'text-primary';
    if (percent >= 20) return 'text-yellow-600';
    return 'text-gray-500';
  };

  return (
    <div className="app-layout">
      {showNavSidebar && (
        <nav className="catalog__nav">
          <div className="catalog__navBrand">
            <span className="catalog__navLogo">M</span>
          </div>
          <div className="catalog__navItems">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path === "/courses" && location.pathname === "/courses") ||
                (item.path === "/student/dashboard" && location.pathname === "/student/dashboard");
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`catalog__navItem ${isActive ? "catalog__navItem--active" : ""}`}
                  title={item.label}
                >
                  <item.icon size={22} />
                  <span className="catalog__navLabel">{item.label}</span>
                </a>
              );
            })}
          </div>
        </nav>
      )}
      <main className="main-content">
        {activeMainTab === 'suggested' ? (
          <CoursesCatalogPage />
        ) : (
          <>
            {/* Header Section with Welcome Message */}
            <section id="section-header">
              <div className="container header-container">
                <div className="header-top">
                  <AvatarMenu />
                </div>
                <div className="welcome-section">
                  <h1 className="welcome-title">
                    {greeting}, {displayName.split(' ').slice(-1)[0]}!
                  </h1>
                  <p className="welcome-subtitle">
                    Hôm nay bạn muốn học gì? Hãy tiếp tục hành trình chinh phục tri thức.
                  </p>
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
                          <Target size={24} strokeWidth={1.5} />
                        </div>
                        {stats.overallProgress > 70 && <span className="pro-badge">🔥 Đang bùng nổ</span>}
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
                          <BookOpen size={24} strokeWidth={1.5} />
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
                          <Trophy size={24} strokeWidth={1.5} />
                        </div>
                      </div>
                      <div className="metric-content">
                        <span className="metric-label">Chứng chỉ đạt được</span>
                        <span className="metric-value">{stats.certificatesEarned}</span>
                      </div>
                    </div>
                  </div>

                  {/* Learning Activity Chart */}
                  <div className="chart-card">
                    <div className="chart-header">
                      <div className="chart-title-group">
                        <h3 className="chart-title">Hoạt động học tập</h3>
                        <p className="chart-subtitle">Số bài học hoàn thành trong 7 ngày qua</p>
                      </div>
                      <div className="chart-legend">
                        <span className="legend-dot"></span>
                        <span className="legend-label">Bài học</span>
                      </div>
                    </div>
                    <div className="chart-body">
                      <div className="x-axis">
                        {studyHours.map((value, idx) => {
                          const date = new Date();
                          date.setDate(date.getDate() - (6 - idx));
                          const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                          const dayName = dayNames[date.getDay()];
                          return (
                            <div key={idx} className="day-col">
                              <div 
                                className={`bar ${value === 0 ? 'empty' : ''}`} 
                                style={{ 
                                  height: `${(value / maxHour) * chartHeight}px`,
                                }}
                              />
                              <span>{dayName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Sidebar - Deadlines & Promo */}
                <div className="sidebar-column">
                  <div className="sidebar-card">
                    <div className="sidebar-header">
                      <h3 className="sidebar-title">Hạn nộp sắp tới</h3>
                      <button type="button" className="view-all" onClick={() => navigate('/courses')}>
                        Xem tất cả <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="deadline-list">
                      {courses.filter(c => c.status === 'active' && c.progress_percent < 100).slice(0, 3).map((course, idx) => (
                        <div 
                          key={course.id} 
                          className={`deadline-item ${idx === 0 ? 'deadline-red' : idx === 1 ? 'deadline-blue' : 'deadline-teal'}`}
                          onClick={() => openLearningHub(course.course_id, course.course_slug)}
                          role="button"
                          tabIndex={0}
                        >
                          <span className={`deadline-date ${idx === 0 ? 'text-red' : idx === 1 ? 'text-blue' : 'text-teal'}`}>
                            {idx === 0 ? '⚠️ Sắp đến hạn' : `📅 ${formatDate(course.last_accessed_at) || 'Đang học'}`}
                          </span>
                          <h4 className="deadline-title">{course.course_title}</h4>
                          <p className="deadline-course">Tiến độ: {course.progress_percent}%</p>
                        </div>
                      ))}
                      {courses.filter(c => c.status === 'active').length === 0 && (
                        <div className="deadline-item deadline-teal">
                          <span className="deadline-date text-teal">✨ Không có hạn nộp</span>
                          <h4 className="deadline-title">Bạn đang theo kịp tiến độ!</h4>
                          <p className="deadline-course">Khám phá thêm khóa học để tiếp tục học</p>
                        </div>
                      )}
                    </div>

                    <div className="promo-box">
                      <div className="promo-blur"></div>
                      <div className="promo-content">
                        <h4 className="promo-title">🚀 Nâng cấp gói Plus</h4>
                        <p className="promo-desc">Mở khóa quyền truy cập không giới hạn vào tất cả chứng chỉ chuyên nghiệp.</p>
                        <button className="promo-btn">Tìm hiểu thêm →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Continue Learning Section - Enhanced with Detailed Progress */}
            <section id="section-continue-learning">
              <div className="container continue-learning-container">
                <div className="section-header">
                  <h2 className="section-title">
                    <TrendingUp size={28} strokeWidth={1.5} />
                    Tiếp tục học
                  </h2>
                  {activeCourses.length > 6 && (
                    <div className="nav-buttons">
                      <button 
                        className="nav-btn" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button 
                        className="nav-btn"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
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

                {/* Enhanced My Courses Grid with Detailed Progress */}
                {activeMainTab === 'myCourses' && !loading && !error && displayCourses.length > 0 && (
                  <div className="courses-grid">
                    {displayCourses.map((course) => (
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
                          
                          {/* Detailed Progress Stats */}
                          <div className="course-detail-stats">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 size={14} />
                              {course.completed_lessons || 0}/{course.total_lessons || 20} bài học
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {course.estimated_time_left || '~5 giờ'} còn lại
                            </span>
                          </div>

                          {/* Main Progress Bar */}
                          <div className="course-progress">
                            <div className="progress-header">
                              <span>Tiến độ học tập</span>
                              <span className="progress-percent">{course.progress_percent}%</span>
                            </div>
                            <div className="progress-bar-bg">
                              <div className="progress-bar-fill" style={{ width: `${course.progress_percent}%` }} />
                            </div>
                          </div>

                          {/* Additional Motivation Stats */}
                          <div className="course-additional-stats">
                            <span className="flex items-center gap-1">
                              <Flame size={12} />
                              {course.progress_percent >= 80 ? 'Bùng nổ!' : course.progress_percent >= 50 ? 'Nửa chặng đường' : 'Mới bắt đầu'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star size={12} />
                              {Math.floor(course.progress_percent / 20)}/5 sao
                            </span>
                          </div>

                          <button className="resume-btn">
                            {course.progress_percent === 0 ? 'Bắt đầu học' : 'Tiếp tục học'} 
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State for My Courses */}
                {activeMainTab === 'myCourses' && !loading && !error && displayCourses.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <GraduationCap size={56} strokeWidth={1} />
                    </div>
                    <h3>🌟 Chưa có khóa học nào đang học</h3>
                    <p>Bạn chưa bắt đầu khóa học nào. Hãy khám phá và bắt đầu hành trình học tập ngay hôm nay!</p>
                    <button onClick={() => navigate('/courses')} className="btn-primary">
                      Khám phá khóa học →
                    </button>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}