// CoursePublicDetailPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { PAYMENTS_API } from "../../api/payments";
import { useAuth } from "../../contexts/Auth";
import PrerequisiteGraph, { type PrerequisiteGraphData } from "../../components/PrerequisiteGraph";
import "./CoursePublicDetailPage.css";
import {
  BookOpen,
  Users,
  Layers3,
  ListChecks,
  Clock,
  DollarSign,
  Award,
  CheckCircle,
  XCircle,
  ArrowLeft,
  GraduationCap,
  Target,
  FileText,
  Play,
  Lock,
  Star,
  TrendingUp,
  Calendar,
  Globe,
  BarChart3,
  ChevronRight,
  Shield,
  Sparkles
} from 'lucide-react';

type CourseDetail = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  learning_objectives?: any;
  prerequisites?: any;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
  total_duration_minutes?: number | null;
  price?: number | null;
  is_enrolled?: boolean;
  enrollment?: { status: string; progress_percent: number } | null;
  instructors: { id: number; full_name: string; avatar_url: string | null; is_primary: boolean }[];
  modules?: { id: number; title: string; lessons: { id: number; title: string; is_free_preview?: boolean }[] }[];
};

type PrerequisiteCourseOption = {
  id: number;
  title: string;
  slug: string;
  thumbnail_url?: string | null;
};

function levelLabel(level: string) {
  if (level === "beginner") return { label: "Beginner", color: "#16a34a", bg: "#dcfce7" };
  if (level === "intermediate") return { label: "Intermediate", color: "#2563eb", bg: "#dbeafe" };
  if (level === "advanced") return { label: "Advanced", color: "#7c3aed", bg: "#f3e8ff" };
  return { label: level || "—", color: "#6b7280", bg: "#f3f4f6" };
}

function languageLabel(lang: string) {
  if (lang === "vi") return "Tiếng Việt";
  if (lang === "en") return "English";
  return lang || "—";
}

function formatVnd(amount: number): string {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} VND`;
  }
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} mins`;
  if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${hours}h ${mins}m`;
}

function toStringList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((x) => String(x)).filter(Boolean);
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    } catch {
      // ignore
    }
    return s.split(/\r?\n|•|\u2022|-/g).map((x) => x.trim()).filter(Boolean);
  }
  return [String(value)];
}

export default function CoursePublicDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const slug = String(params.slug || "");
  const { accessToken: token } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [prerequisiteCatalog, setPrerequisiteCatalog] = useState<PrerequisiteCourseOption[]>([]);
  const [myEnrollmentStatusByCourseId, setMyEnrollmentStatusByCourseId] = useState<Record<number, string>>({});
  const [prerequisiteGraph, setPrerequisiteGraph] = useState<PrerequisiteGraphData | null>(null);
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});

  const fetchDetail = async () => {
    const res = await fetch(`${url}${COURSES_API.catalogDetail(slug)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as Partial<CourseDetail> & { message?: string };
    if (!res.ok) throw new Error(json?.message || "Cannot load course details.");
    setCourse(json as CourseDetail);
  };

  const fetchPrerequisiteCatalog = async () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "200");
    params.set("sort_by", "title");
    params.set("sort_dir", "asc");
    const res = await fetch(`${url}${COURSES_API.catalog}?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as { items?: any[] };
    if (!res.ok) return;
    const items = Array.isArray(json.items) ? json.items : [];
    setPrerequisiteCatalog(
      items.map((x) => ({
        id: Number(x.id),
        title: String(x.title || ""),
        slug: String(x.slug || ""),
        thumbnail_url: x?.thumbnail_url ? String(x.thumbnail_url) : null,
      }))
    );
  };

  const fetchMyEnrollmentStatus = async () => {
    if (!token) {
      setMyEnrollmentStatusByCourseId({});
      return;
    }
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "200");
    const res = await fetch(`${url}${COURSES_API.myEnrollments}?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const json = (await res.json().catch(() => ({}))) as { items?: any[] };
    if (!res.ok) return;
    const items = Array.isArray(json.items) ? json.items : [];
    const next: Record<number, string> = {};
    for (const item of items) {
      const id = Number(item?.course_id);
      if (Number.isInteger(id) && id > 0) {
        next[id] = String(item?.status || "");
      }
    }
    setMyEnrollmentStatusByCourseId(next);
  };

  const fetchPrerequisiteGraph = async () => {
    const res = await fetch(`${url}${COURSES_API.catalogPrerequisiteGraph(slug)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => null)) as PrerequisiteGraphData | null;
    if (!res.ok || !json) return;
    setPrerequisiteGraph(json);
  };

  const prerequisiteItems = useMemo(() => {
    const raw = toStringList(course?.prerequisites);
    if (!raw.length) return [];
    const byId = new Map<number, PrerequisiteCourseOption>();
    for (const c of prerequisiteCatalog) byId.set(c.id, c);
    return raw.map((value) => {
      const id = Number(String(value).trim());
      if (Number.isInteger(id) && id > 0 && byId.has(id)) {
        const c = byId.get(id)!;
        const status = myEnrollmentStatusByCourseId[id] || "";
        return {
          id,
          label: c.title,
          slug: c.slug,
          thumbnail_url: c.thumbnail_url || null,
          isLinkedCourse: true,
          status,
          isCompleted: status === "completed",
        };
      }
      return { id: 0, label: value, slug: "", thumbnail_url: null, isLinkedCourse: false, status: "", isCompleted: false };
    });
  }, [course?.prerequisites, prerequisiteCatalog, myEnrollmentStatusByCourseId]);

  const hasUnfinishedPrerequisites = useMemo(() => {
    return prerequisiteItems.some((x) => x.isLinkedCourse && !x.isCompleted);
  }, [prerequisiteItems]);

  const enroll = async () => {
    if (!course) return;
    const ok = window.confirm("Enroll in this course?");
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.enroll(course.id)}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Cannot enroll in course.");
      await fetchDetail();
      window.alert("Successfully enrolled! Go to Student Dashboard to view your courses.");
    } catch (e: any) {
      setError(e?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const checkoutPaidCourse = async () => {
    if (!course) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${PAYMENTS_API.createMomoOrder}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: course.id }),
      });
      const json = (await res.json().catch(() => ({}))) as { payment_url?: string; message?: string; status?: string };
      if (!res.ok) throw new Error(json?.message || "Cannot create payment order.");
      if (json?.status === "paid") {
        window.alert("You have already paid for this course. Go to Dashboard to continue learning.");
        navigate(`/my-courses/${course.id}/${course.slug}`);
        return;
      }
      if (!json?.payment_url) throw new Error("No payment URL received from MoMo.");
      window.location.href = json.payment_url;
    } catch (e: any) {
      setError(e?.message || "Cannot start payment process.");
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: number) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  useEffect(() => {
    if (!slug) {
      navigate("/courses");
      return;
    }
    setLoading(true);
    setError(null);
    fetchDetail()
      .catch((e: any) => setError(e?.message || "An error occurred."))
      .finally(() => setLoading(false));
    void fetchPrerequisiteCatalog();
    void fetchMyEnrollmentStatus();
    void fetchPrerequisiteGraph();
  }, [slug]);

  const level = levelLabel(course?.level || "");
  const isFree = (course?.price ?? 0) === 0;

  return (
    <div className="course-detail-page">
      {/* Header */}
      <div className="course-detail-header-bg">
        <div className="container">
          <div className="course-detail-header">
            <button type="button" onClick={() => navigate("/courses")} className="back-button" disabled={loading}>
              <ArrowLeft size={18} />
              Back to Courses
            </button>
            <AvatarMenu />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      {course && !loading && (
        <div className="course-hero" style={{ backgroundImage: course.thumbnail_url ? `url(${course.thumbnail_url})` : undefined }}>
          <div className="course-hero-overlay">
            <div className="container">
              <div className="course-hero-content">
                <div className="course-badges">
                  <span className="badge-level" style={{ backgroundColor: level.bg, color: level.color }}>
                    {level.label}
                  </span>
                  <span className="badge-status">
                    {isFree ? "FREE" : "PAID"}
                  </span>
                  {course.is_enrolled && (
                    <span className="badge-enrolled">
                      <CheckCircle size={14} />
                      Enrolled
                    </span>
                  )}
                </div>
                <h1 className="course-hero-title">{course.title}</h1>
                <p className="course-hero-description">{course.short_description || "No description provided."}</p>
                
                <div className="course-hero-stats">
                  <div className="hero-stat">
                    <Users size={16} />
                    <span>{course.learners_count?.toLocaleString() || 0} learners</span>
                  </div>
                  <div className="hero-stat">
                    <Layers3 size={16} />
                    <span>{course.modules_count || 0} modules</span>
                  </div>
                  <div className="hero-stat">
                    <ListChecks size={16} />
                    <span>{course.lessons_count || 0} lessons</span>
                  </div>
                  <div className="hero-stat">
                    <Clock size={16} />
                    <span>{formatDuration(course.total_duration_minutes)}</span>
                  </div>
                  <div className="hero-stat">
                    <Globe size={16} />
                    <span>{languageLabel(course.language)}</span>
                  </div>
                </div>

                <div className="course-hero-actions">
                  {course.is_enrolled ? (
                    <button 
                      className="btn-continue"
                      onClick={() => navigate(`/my-courses/${course.id}/${course.slug}`)}
                    >
                      <Play size={18} />
                      Continue Learning
                    </button>
                  ) : (
                    <button
                      className={`btn-enroll ${hasUnfinishedPrerequisites ? "disabled" : ""}`}
                      onClick={() => {
                        if (hasUnfinishedPrerequisites) return;
                        if (!isFree) {
                          void checkoutPaidCourse();
                        } else {
                          void enroll();
                        }
                      }}
                      disabled={loading || hasUnfinishedPrerequisites}
                    >
                      {hasUnfinishedPrerequisites ? (
                        <>
                          <Lock size={18} />
                          Prerequisites Required
                        </>
                      ) : !isFree ? (
                        <>
                          <DollarSign size={18} />
                          {formatVnd(course.price || 0)}
                        </>
                      ) : (
                        <>
                          <GraduationCap size={18} />
                          Enroll for Free
                        </>
                      )}
                    </button>
                  )}
                  <button className="btn-dashboard" onClick={() => navigate("/student/dashboard")}>
                    Go to Dashboard
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Loading course details...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="container">
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <h3>Unable to load course</h3>
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="btn-retry">Try Again</button>
            </div>
          </div>
        </div>
      )}

      {/* Course Content */}
      {course && !loading && (
        <div className="container">
          <div className="course-layout">
            {/* Main Content */}
            <div className="course-main">
              {/* What You'll Learn */}
              {toStringList(course.learning_objectives).length > 0 && (
                <div className="content-card">
                  <div className="card-header">
                    <Target size={22} className="card-icon" />
                    <h2>What You'll Learn</h2>
                  </div>
                  <div className="objectives-grid">
                    {toStringList(course.learning_objectives).map((item, idx) => (
                      <div key={idx} className="objective-item">
                        <CheckCircle size={16} className="check-icon" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Content / Modules */}
              {Array.isArray(course.modules) && course.modules.length > 0 && (
                <div className="content-card">
                  <div className="card-header">
                    <BookOpen size={22} className="card-icon" />
                    <h2>Course Content</h2>
                  </div>
                  <div className="modules-list">
                    {course.modules.map((module, idx) => (
                      <div key={module.id} className="module-item">
                        <button className="module-header" onClick={() => toggleModule(module.id)}>
                          <div className="module-left">
                            <span className="module-number">{String(idx + 1).padStart(2, '0')}</span>
                            <span className="module-title">{module.title}</span>
                          </div>
                          <div className="module-right">
                            <span className="module-lesson-count">{module.lessons?.length || 0} lessons</span>
                            <ChevronRight size={18} className={`module-chevron ${expandedModules[module.id] ? 'expanded' : ''}`} />
                          </div>
                        </button>
                        {expandedModules[module.id] && (
                          <div className="module-lessons">
                            {(module.lessons || []).map((lesson, lidx) => (
                              <div key={lesson.id} className="lesson-item">
                                <div className="lesson-left">
                                  <div className="lesson-icon">
                                    {lesson.is_free_preview ? <Play size={14} className="preview-icon" /> : <Lock size={14} className="lock-icon" />}
                                  </div>
                                  <span className="lesson-title">
                                    {lidx + 1}. {lesson.title}
                                  </span>
                                </div>
                                {lesson.is_free_preview && (
                                  <span className="preview-badge">Preview</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prerequisites */}
              {prerequisiteItems.length > 0 && (
                <div className="content-card">
                  <div className="card-header">
                    <Shield size={22} className="card-icon" />
                    <h2>Prerequisites</h2>
                  </div>
                  <div className="prerequisites-grid">
                    {prerequisiteItems.map((item, idx) => (
                      <div key={idx} className="prerequisite-card-new">
                        <div className="prereq-image">
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt={item.label} />
                          ) : (
                            <div className="prereq-placeholder">
                              <BookOpen size={24} />
                            </div>
                          )}
                        </div>
                        <div className="prereq-info">
                          {item.isLinkedCourse ? (
                            <button className="prereq-title-btn" onClick={() => navigate(`/courses/${item.slug}`)}>
                              {item.label}
                            </button>
                          ) : (
                            <span className="prereq-title">{item.label}</span>
                          )}
                          {item.isLinkedCourse && (
                            <div className={`prereq-status ${item.isCompleted ? "completed" : "pending"}`}>
                              {item.isCompleted ? <CheckCircle size={14} /> : <XCircle size={14} />}
                              <span>{item.isCompleted ? "Completed" : "Not Completed"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {hasUnfinishedPrerequisites && (
                    <div className="prereq-warning">
                      <Lock size={16} />
                      <span>Complete all prerequisite courses before enrolling in this course.</span>
                    </div>
                  )}

                  <button className="btn-view-graph" onClick={() => setGraphModalOpen(true)}>
                    <TrendingUp size={16} />
                    View Prerequisite Graph
                  </button>
                </div>
              )}

              {/* Full Description */}
              {course.full_description && (
                <div className="content-card">
                  <div className="card-header">
                    <FileText size={22} className="card-icon" />
                    <h2>Full Description</h2>
                  </div>
                  <div className="full-description" dangerouslySetInnerHTML={{ __html: course.full_description }} />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="course-sidebar">
              {/* Instructor Card */}
              {Array.isArray(course.instructors) && course.instructors.length > 0 && (
                <div className="sidebar-card">
                  <h3 className="sidebar-card-title">
                    <GraduationCap size={18} />
                    Instructor{course.instructors.length > 1 ? 's' : ''}
                  </h3>
                  <div className="instructors-list">
                    {course.instructors.map((instructor) => (
                      <div key={instructor.id} className="instructor-item">
                        <div className="instructor-avatar">
                          {instructor.avatar_url ? (
                            <img src={instructor.avatar_url} alt={instructor.full_name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {instructor.full_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="instructor-info">
                          <div className="instructor-name">
                            {instructor.full_name}
                            {instructor.is_primary && <span className="primary-badge">Primary</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Stats Card */}
              <div className="sidebar-card">
                <h3 className="sidebar-card-title">
                  <BarChart3 size={18} />
                  Course Statistics
                </h3>
                <div className="stats-list">
                  <div className="stat-item">
                    <Users size={16} />
                    <span>{course.learners_count?.toLocaleString() || 0} total learners</span>
                  </div>
                  <div className="stat-item">
                    <Layers3 size={16} />
                    <span>{course.modules_count || 0} modules</span>
                  </div>
                  <div className="stat-item">
                    <ListChecks size={16} />
                    <span>{course.lessons_count || 0} lessons</span>
                  </div>
                  <div className="stat-item">
                    <Clock size={16} />
                    <span>{formatDuration(course.total_duration_minutes)} total</span>
                  </div>
                  <div className="stat-item">
                    <Globe size={16} />
                    <span>{languageLabel(course.language)}</span>
                  </div>
                </div>
              </div>

              {/* Price Card (if not enrolled) */}
              {!course.is_enrolled && !isFree && (
                <div className="sidebar-card price-card">
                  <div className="price-amount">{formatVnd(course.price || 0)}</div>
                  <div className="price-features">
                    <div className="price-feature">
                      <CheckCircle size={16} />
                      <span>Full lifetime access</span>
                    </div>
                    <div className="price-feature">
                      <CheckCircle size={16} />
                      <span>Certificate of completion</span>
                    </div>
                    <div className="price-feature">
                      <CheckCircle size={16} />
                      <span>30-day money-back guarantee</span>
                    </div>
                  </div>
                  <button
                    className={`price-enroll-btn ${hasUnfinishedPrerequisites ? "disabled" : ""}`}
                    onClick={() => {
                      if (hasUnfinishedPrerequisites) return;
                      void checkoutPaidCourse();
                    }}
                    disabled={hasUnfinishedPrerequisites}
                  >
                    {hasUnfinishedPrerequisites ? "Complete Prerequisites First" : `Buy Now - ${formatVnd(course.price || 0)}`}
                  </button>
                </div>
              )}

              {/* Free Badge */}
              {!course.is_enrolled && isFree && (
                <div className="sidebar-card free-card">
                  <Sparkles size={32} />
                  <h4>Free Course</h4>
                  <p>Enroll now and start learning today at no cost!</p>
                  <button
                    className="free-enroll-btn"
                    onClick={() => void enroll()}
                    disabled={hasUnfinishedPrerequisites}
                  >
                    {hasUnfinishedPrerequisites ? "Complete Prerequisites First" : "Enroll for Free"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prerequisite Graph Modal */}
      {graphModalOpen && (
        <div className="modal-overlay" onClick={() => setGraphModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Prerequisite Graph</h3>
              <button className="modal-close" onClick={() => setGraphModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <PrerequisiteGraph data={prerequisiteGraph} onOpenCourse={(s) => navigate(`/courses/${s}`)} />
            </div>
            <div className="modal-footer">
              <button className="modal-btn-close" onClick={() => setGraphModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}