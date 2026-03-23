// CoursePublicDetailPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import "./CoursePublicDetailPage.css";

type CourseDetail = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
  total_duration_minutes?: number | null;
  is_enrolled?: boolean;
  enrollment?: { status: string; progress_percent: number } | null;
  instructors: { id: number; full_name: string; avatar_url: string | null; is_primary: boolean }[];
  modules?: { id: number; title: string; lessons: { id: number; title: string; is_free_preview?: boolean }[] }[];
};

export default function CoursePublicDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const slug = String(params.slug || "");
  const token = useMemo(() => getAccessToken(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);

  const fetchDetail = async () => {
    const res = await fetch(`${url}${COURSES_API.catalogDetail(slug)}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as Partial<CourseDetail> & { message?: string };
    if (!res.ok) throw new Error(json?.message || "Không thể tải chi tiết khóa học.");
    setCourse(json as CourseDetail);
  };

  const enroll = async () => {
    if (!course) return;
    const ok = window.confirm("Đăng ký khóa học này?");
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
      if (!res.ok) throw new Error((json as any)?.message || "Không thể đăng ký khóa học.");
      await fetchDetail();
      window.alert("Đăng ký thành công. Vào Dashboard học viên để xem khóa học của bạn.");
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug) {
      navigate("/courses");
      return;
    }
    setLoading(true);
    setError(null);
    fetchDetail()
      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const getLevelBadge = (level: string) => {
    const levels: Record<string, { label: string; class: string }> = {
      beginner: { label: "Sơ cấp", class: "level-beginner" },
      intermediate: { label: "Trung cấp", class: "level-intermediate" },
      advanced: { label: "Nâng cao", class: "level-advanced" },
    };
    const defaultLevel = { label: level || "Chung", class: "level-default" };
    return levels[level?.toLowerCase()] || defaultLevel;
  };

  const levelInfo = course ? getLevelBadge(course.level) : null;

  return (
    <div className="course-detail-page">
      <div className="course-detail-container">
        <div className="course-detail-header">
          <button
            type="button"
            onClick={() => navigate("/courses")}
            className="back-button"
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Quay lại
          </button>
          <AvatarMenu />
        </div>

        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {course ? (
          <div className="course-card">
            <div className="course-hero">
              {course.thumbnail_url ? (
                <div className="course-thumbnail-wrapper">
                  <img 
                    src={course.thumbnail_url} 
                    alt={course.title} 
                    className="course-thumbnail" 
                  />
                  <div className="thumbnail-overlay" />
                </div>
              ) : (
                <div className="course-thumbnail-placeholder">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6V12M12 12V18M12 12H18M12 12H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
              )}
              
              <div className="hero-content">
                <div className="course-badges">
                  {levelInfo && (
                    <span className={`level-badge ${levelInfo.class}`}>
                      {levelInfo.label}
                    </span>
                  )}
                  {course.language && (
                    <span className="language-badge">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M2 12H22M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2617 12 22C9.49872 19.2617 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      {course.language === "vi" ? "Tiếng Việt" : course.language === "en" ? "English" : course.language}
                    </span>
                  )}
                </div>
                
                <h1 className="course-title">{course.title}</h1>
                
                {course.short_description && (
                  <p className="course-short-description">{course.short_description}</p>
                )}

                <div className="course-stats">
                  <div className="stat-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M5 20V19C5 15.134 8.13401 12 12 12C15.866 12 19 15.134 19 19V20" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <span>{formatNumber(course.learners_count ?? 0)} học viên</span>
                  </div>
                  <div className="stat-divider" />
                  <div className="stat-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278M3 19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M3 19.2528V6.25278M21 19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528M21 19.2528V6.25278" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <span>{course.modules_count ?? 0} chương</span>
                  </div>
                  <div className="stat-divider" />
                  <div className="stat-item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 6V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <span>{course.lessons_count ?? 0} bài học</span>
                  </div>
                  {course.total_duration_minutes && (
                    <>
                      <div className="stat-divider" />
                      <div className="stat-item">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 6V12L16 14M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                        <span>{Math.floor(course.total_duration_minutes / 60)}h {course.total_duration_minutes % 60}m</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="course-content">
              <div className="course-actions">
                <button
                  type="button"
                  onClick={enroll}
                  disabled={loading || !!course.is_enrolled}
                  className={`enroll-button ${course.is_enrolled ? "enrolled" : ""}`}
                >
                  {loading ? (
                    <div className="button-spinner" />
                  ) : course.is_enrolled ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Đã đăng ký
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Đăng ký ngay
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/student/dashboard")}
                  disabled={loading}
                  className="dashboard-button"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9L12 3L21 9L12 15L3 9Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9 12L12 14L15 12" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 21V15" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  Dashboard
                </button>
              </div>

              {course.instructors && course.instructors.length > 0 && (
                <div className="instructors-section">
                  <h3 className="section-title">Giảng viên</h3>
                  <div className="instructors-list">
                    {course.instructors.map((instructor) => (
                      <div key={instructor.id} className="instructor-card">
                        {instructor.avatar_url ? (
                          <img src={instructor.avatar_url} alt={instructor.full_name} className="instructor-avatar" />
                        ) : (
                          <div className="instructor-avatar-placeholder">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M5 20V19C5 15.134 8.13401 12 12 12C15.866 12 19 15.134 19 19V20" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                          </div>
                        )}
                        <span className="instructor-name">{instructor.full_name}</span>
                        {instructor.is_primary && (
                          <span className="instructor-badge">Chính</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {course.full_description && (
                <div className="description-section">
                  <h3 className="section-title">Mô tả khóa học</h3>
                  <div className="course-full-description">
                    {course.full_description}
                  </div>
                </div>
              )}

              {course.modules && course.modules.length > 0 && (
                <div className="modules-section">
                  <h3 className="section-title">Nội dung khóa học</h3>
                  <div className="modules-list">
                    {course.modules.map((module, index) => (
                      <div key={module.id} className="module-item">
                        <div className="module-header">
                          <span className="module-number">{String(index + 1).padStart(2, '0')}</span>
                          <span className="module-title">{module.title}</span>
                          <span className="module-lesson-count">{module.lessons?.length || 0} bài học</span>
                        </div>
                        {module.lessons && module.lessons.length > 0 && (
                          <div className="lessons-list">
                            {module.lessons.slice(0, 3).map((lesson) => (
                              <div key={lesson.id} className="lesson-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 6V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5"/>
                                </svg>
                                <span>{lesson.title}</span>
                                {lesson.is_free_preview && (
                                  <span className="preview-badge">Xem thử</span>
                                )}
                              </div>
                            ))}
                            {module.lessons.length > 3 && (
                              <div className="more-lessons">
                                + {module.lessons.length - 3} bài học khác
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            {loading ? (
              <div className="loading-spinner" />
            ) : (
              <>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <p>Không có dữ liệu</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}