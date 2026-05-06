import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { PAYMENTS_API } from "../../api/payments";
import { useAuth } from "../../contexts/Auth";
import { Search, BookOpen, Users, Clock, BookMarked, Filter, X, GraduationCap, Sparkles, Layers, LayoutDashboard, Compass } from "lucide-react";
import "./CoursesCatalogPage.css";

type PublishedCourse = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  level: string;
  category: string;
  language: string;
  published_at: string | null;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
  total_duration_minutes?: number | null;
  price?: number | null;
  is_enrolled?: boolean;
  can_enroll?: boolean;
  instructor_name?: string;
};

type CatalogResponse = {
  items: PublishedCourse[];
  page: number;
  page_size: number;
  total: number;
};

const CATEGORY_GROUPS = [
  "Công nghệ thông tin (IT)",
  "Kinh doanh - Quản trị",
  "Tài chính - Kế toán - Ngân hàng",
  "Marketing - Truyền thông",
  "Y tế - Sức khỏe",
  "Giáo dục - Đào tạo",
  "Kỹ thuật - Xây dựng",
  "Luật - Hành chính",
  "Logistics - Xuất nhập khẩu",
  "Du lịch - Nhà hàng - Khách sạn",
  "Nghệ thuật - Thiết kế",
  "Nông nghiệp - Môi trường",
  "Lao động tay nghề - Dịch vụ",
  "Khác",
];

function levelBadge(level: string) {
  if (level === "beginner") return { label: "Cơ bản", className: "badge badge--green" };
  if (level === "intermediate") return { label: "Trung cấp", className: "badge badge--blue" };
  if (level === "advanced") return { label: "Nâng cao", className: "badge badge--purple" };
  return { label: level, className: "badge" };
}

function getCategoryGroup(category: string): string {
  if (!category) return "Khác";
  const idx = category.indexOf(":");
  const group = idx > -1 ? category.substring(0, idx).trim() : category.trim();
  return CATEGORY_GROUPS.includes(group) ? group : "Khác";
}

function formatVnd(amount: number): string {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
      amount
    );
  } catch {
    return `${amount} VND`;
  }
}

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}g ${mins}p` : `${hours}g`;
}

export default function CoursesCatalogPage() {
  const navigate = useNavigate();
  const { accessToken: token } = useAuth();

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchCatalog = async (opts?: { nextQ?: string }) => {
    const nextQ = opts?.nextQ ?? q;

    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    params.set("page", "1");
    params.set("page_size", "200");
    params.set("sort_by", "learners_count");
    params.set("sort_dir", "desc");

    const res = await fetch(`${url}${COURSES_API.catalog}?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as Partial<CatalogResponse> & { message?: string };
    if (!res.ok) throw new Error(json?.message || "Không thể tải danh sách khóa học.");
    setData({
      items: Array.isArray(json.items) ? (json.items as PublishedCourse[]) : [],
      page: 1,
      page_size: typeof json.page_size === "number" ? json.page_size : 200,
      total: typeof json.total === "number" ? json.total : 0,
    });
  };

  const enroll = async (courseId: number) => {
    const ok = window.confirm("Đăng ký khóa học này?");
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.enroll(courseId)}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || "Không thể đăng ký khóa học.");
      await fetchCatalog();
      setPage(1);
      window.alert("Đăng ký thành công. Khóa học sẽ hiển thị trong Dashboard học viên.");
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const checkoutPaidCourse = async (courseId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${PAYMENTS_API.createMomoOrder}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ course_id: courseId }),
      });
      const json = (await res.json().catch(() => ({}))) as { payment_url?: string; message?: string; status?: string };
      if (!res.ok) throw new Error(json?.message || "Không thể tạo đơn thanh toán.");
      if (json?.status === "paid") {
        window.alert("Bạn đã thanh toán khóa học này trước đó. Vào Dashboard để tiếp tục học.");
        navigate("/student/dashboard");
        return;
      }
      if (!json?.payment_url) throw new Error("Không nhận được liên kết thanh toán từ MoMo.");
      window.location.href = json.payment_url;
    } catch (e: any) {
      setError(e?.message || "Không thể bắt đầu thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput), 450);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPage(1);
    fetchCatalog()
      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);


  const filteredItems = useMemo(() => {
    const items = data?.items || [];
    return items.filter((c) => {
      if (c.is_enrolled) return false;
      if (selectedLevels.length > 0 && !selectedLevels.includes(c.level)) return false;
      const categoryGroup = getCategoryGroup(c.category);
      if (selectedCategories.length > 0 && !selectedCategories.includes(categoryGroup)) return false;
      const lang = String(c.language || "").trim();
      if (selectedLanguages.length > 0 && !selectedLanguages.includes(lang)) return false;
      return true;
    });
  }, [data, selectedLevels, selectedCategories, selectedLanguages]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [selectedLevels, selectedCategories, selectedLanguages, q]);

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedLevels([]);
    setSelectedLanguages([]);
    setQInput("");
    setQ("");
  };

  const location = useLocation();

  const hasActiveFilters = selectedCategories.length > 0 || selectedLevels.length > 0 || selectedLanguages.length > 0 || q.trim() !== "";

  const navItems = [
    { path: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/courses", label: "Khám phá", icon: Compass },
  ];

  return (
    <div className="catalog">
      {/* Decorative background */}
      <div className="catalog__decoration catalog__decoration--1" />
      <div className="catalog__decoration catalog__decoration--2" />

      <div className="catalog__wrapper">
        {/* Navigation Sidebar */}
        <nav className="catalog__nav">
          <div className="catalog__navBrand">
            <span className="catalog__navLogo">M</span>
          </div>
          <div className="catalog__navItems">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === "/courses" && location.pathname === "/courses");
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

        <div className="catalog__main">
          {/* Header */}
          <div className="catalog__headerRow">
            <div style={{ minWidth: 0 }}>
              <h1 className="catalog__title">Khám phá khóa học</h1>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <AvatarMenu />
            </div>
          </div>

        {/* Stats Bar */}
        {data && data.total > 0 && (
          <div className="catalog__stats">
            <div className="catalog__stat">
              <BookOpen size={18} />
              <span className="catalog__statValue">{data.total}</span> khóa học
            </div>
            <div className="catalog__stat">
              <Users size={18} />
              <span className="catalog__statValue">{data.items.reduce((acc, c) => acc + c.learners_count, 0).toLocaleString()}</span> học viên
            </div>
          </div>
        )}

        {error ? (
          <div className="errorBox">
            <Sparkles size={20} />
            {error}
          </div>
        ) : null}

        <div className="catalog__layout">
          {/* Mobile Filter Toggle */}
          <div className="catalog__mobileFilter">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <Filter size={18} />
              Bộ lọc {hasActiveFilters && `(${selectedCategories.length + selectedLevels.length + selectedLanguages.length})`}
            </button>
          </div>

          {/* Main Content */}
          <main className="catalog__content">
            {/* Course Grid */}
            <div className="catalog__grid">
              {pagedItems.map((c) => {
                const lb = levelBadge(c.level);
                return (
                  <div key={c.id} className="card">
                    <div className="card__thumb">
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt={c.title} />
                      ) : (
                        <div style={{ 
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: 'var(--cat-text-muted)'
                        }}>
                          <GraduationCap size={48} />
                        </div>
                      )}
                    </div>
                    <div className="card__body">
                      <span className={lb.className}>{lb.label}</span>
                      
                      <h3 className="card__title">{c.title}</h3>
                      <p className="card__desc">{c.short_description || "Chưa có mô tả"}</p>

                      {/* Course Meta */}
                      <div style={{ 
                        display: 'flex', 
                        gap: 16, 
                        marginBottom: 12,
                        fontSize: '0.8rem',
                        color: 'var(--cat-text-muted)'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={14} /> {c.learners_count.toLocaleString()}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <BookMarked size={14} /> {c.modules_count} module
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={14} /> {c.lessons_count} bài
                        </span>
                      </div>

                      {/* Price */}
                      <div className="card__price">
                        {Number(c.price ?? 0) > 0 ? (
                          formatVnd(Number(c.price))
                        ) : (
                          <span className="card__price--free">Miễn phí</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="card__actions">
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => navigate(`/courses/${c.slug}`)}
                          disabled={loading}
                        >
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => {
                            if (Number(c.price ?? 0) > 0) {
                              void checkoutPaidCourse(c.id);
                              return;
                            }
                            void enroll(c.id);
                          }}
                          disabled={loading || c.can_enroll === false}
                        >
                          {c.can_enroll === false 
                            ? "Chưa đủ điều kiện" 
                            : Number(c.price ?? 0) > 0 
                              ? "Mua ngay" 
                              : "Đăng ký"}
                        </button>
                      </div>

                      {c.can_enroll === false && (
                        <div className="errorBox errorBox--info" style={{ marginTop: 10, padding: '8px 12px', fontSize: '0.8rem' }}>
                          Cần hoàn tất khóa tiên quyết trước khi đăng ký.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {!loading && !error && filteredItems.length === 0 && (
              <div className="catalog__empty">
                <div className="catalog__empty-icon">
                  <BookOpen size={40} />
                </div>
                <h3 className="catalog__empty-title">Không tìm thấy khóa học</h3>
                <p className="catalog__empty-text">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
              </div>
            )}

            {/* Pagination */}
            {filteredItems.length > 0 && (
              <div className="catalog__footerRow">
                <div className="muted">
                  {loading ? "Đang tải..." : `Hiển thị ${pagedItems.length} / ${filteredItems.length} khóa học`}
                </div>
                <div className="pagination">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={loading || page <= 1}
                  >
                    Trước
                  </button>
                  <span className="pagination__info">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={loading || page >= totalPages}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Sidebar Filters */}
          <aside className={`catalog__sidebar ${showMobileFilters ? 'catalog__sidebar--open' : ''}`}>
            <div className="catalog__sidebar-header">
              <div className="catalog__sidebar-icon">
                <Filter size={20} />
              </div>
              <h3 className="catalog__sidebar-title">Bộ lọc</h3>
              {showMobileFilters && (
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cat-text-muted)' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Search */}
            <div className="catalog__filterBlock">
              <div className="catalog__filterTitle">Tìm kiếm</div>
              <div className="catalog__search">
                <Search className="catalog__searchIcon" size={18} />
                <input
                  className="input"
                  placeholder="Tìm theo tên..."
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="catalog__filterBlock">
              <div className="catalog__filterTitle">
                <Layers size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Danh mục
              </div>
              <div className="catalog__filterList">
                {CATEGORY_GROUPS.map((cat) => (
                  <label key={cat} className="catalog__filterItem">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories((prev) => [...prev, cat]);
                        } else {
                          setSelectedCategories((prev) => prev.filter((x) => x !== cat));
                        }
                      }}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="catalog__filterBlock">
              <div className="catalog__filterTitle">Ngôn ngữ</div>
              <div className="catalog__filterList">
                {[
                  { value: "vi", label: "Tiếng Việt" },
                  { value: "en", label: "English" },
                ].map((lang) => (
                  <label key={lang.value} className="catalog__filterItem">
                    <input
                      type="checkbox"
                      checked={selectedLanguages.includes(lang.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLanguages((prev) => [...prev, lang.value]);
                        } else {
                          setSelectedLanguages((prev) => prev.filter((x) => x !== lang.value));
                        }
                      }}
                    />
                    <span>{lang.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Levels */}
            <div className="catalog__filterBlock">
              <div className="catalog__filterTitle">Cấp độ</div>
              <div className="catalog__filterList">
                {[
                  { value: "beginner", label: "Cơ bản" },
                  { value: "intermediate", label: "Trung cấp" },
                  { value: "advanced", label: "Nâng cao" },
                ].map((lv) => (
                  <label key={lv.value} className="catalog__filterItem">
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(lv.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLevels((prev) => [...prev, lv.value]);
                        } else {
                          setSelectedLevels((prev) => prev.filter((x) => x !== lv.value));
                        }
                      }}
                    />
                    <span>{lv.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="catalog__filterActions">
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={clearFilters}
                  disabled={loading}
                >
                  <X size={16} />
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </aside>
        </div>
        </div>
      </div>
    </div>
  );
}
