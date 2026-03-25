import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarMenu from "../components/AvatarMenu";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";
import "./CoursesCatalogPage.css";

type PublishedCourse = {
  id: number;
  title: string;
  slug: string;
  short_description: string | null;
  thumbnail_url: string | null;
  level: string;
  language: string;
  published_at: string | null;
  learners_count: number;
  modules_count: number;
  lessons_count: number;
  total_duration_minutes?: number | null;
  is_enrolled?: boolean;
};

type CatalogResponse = {
  items: PublishedCourse[];
  page: number;
  page_size: number;
  total: number;
};

function levelBadge(level: string) {
  if (level === "beginner") return { label: "Cơ bản", className: "badge badge--green" };
  if (level === "intermediate") return { label: "Trung cấp", className: "badge badge--blue" };
  if (level === "advanced") return { label: "Nâng cao", className: "badge badge--purple" };
  return { label: level, className: "badge" };
}

export default function CoursesCatalogPage() {
  const navigate = useNavigate();
  const token = useMemo(() => getAccessToken(), []);

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CatalogResponse | null>(null);

  const fetchCatalog = async (opts?: { nextPage?: number; nextQ?: string; nextLevel?: string }) => {
    const nextPage = opts?.nextPage ?? page;
    const nextQ = opts?.nextQ ?? q;
    const nextLevel = opts?.nextLevel ?? level;

    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextLevel) params.set("level", nextLevel);
    params.set("page", String(nextPage));
    params.set("page_size", String(pageSize));
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
      page: typeof json.page === "number" ? json.page : nextPage,
      page_size: typeof json.page_size === "number" ? json.page_size : pageSize,
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
      await fetchCatalog({ nextPage: 1 });
      setPage(1);
      window.alert("Đăng ký thành công. Khóa học sẽ hiển thị trong Dashboard học viên.");
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
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
    fetchCatalog({ nextPage: 1 })
      .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, level]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const visibleItems = useMemo(() => {
    const items = data?.items || [];
    return items.filter((c) => !c.is_enrolled);
  }, [data]);

  return (
    <div className="catalog">
      <div className="catalog__container">
        <div className="catalog__headerRow">
          <div style={{ minWidth: 0 }}>
            <h1 className="catalog__title">Khám phá khóa học</h1>
            <p className="catalog__subtitle">Các khóa học đã xuất bản dành cho học viên.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => navigate("/student/dashboard")}
              disabled={loading}
            >
              ← Dashboard
            </button>
            <AvatarMenu />
          </div>
        </div>

        <div className="catalog__filters">
          <div className="catalog__filtersRow">
            <input
              className="input"
              placeholder="Tìm theo tên..."
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              disabled={loading}
            />
            <select
              className="select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              disabled={loading}
            >
              <option value="">Tất cả cấp độ</option>
              <option value="beginner">Cơ bản</option>
              <option value="intermediate">Trung cấp</option>
              <option value="advanced">Nâng cao</option>
            </select>
          </div>
        </div>

        {error ? <div className="errorBox">{error}</div> : null}

        <div className="catalog__grid">
          {visibleItems.map((c) => {
            const lb = levelBadge(c.level);
            return (
              <div key={c.id} className="card">
                <div className="card__thumb">
                  {c.thumbnail_url ? <img src={c.thumbnail_url} alt={c.title} /> : null}
                </div>
                <div className="card__body">
                  <div style={{ marginBottom: 8 }}>
                    <span className={lb.className}>{lb.label}</span>
                  </div>
                  <h3 className="card__title">{c.title}</h3>
                  <p className="card__desc">{c.short_description || "—"}</p>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => navigate(`/courses/${c.slug}`)}
                      disabled={loading}
                    >
                      Xem chi tiết
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => enroll(c.id)}
                      disabled={loading}
                      title="Đăng ký khóa học"
                    >
                      Đăng ký
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && !error && visibleItems.length === 0 ? (
          <div className="errorBox" style={{ background: "#fff", borderColor: "#e5e7eb", color: "#374151" }}>
            Không có khóa học mới để đăng ký (các khóa học trong danh sách này bạn đã đăng ký hết).
          </div>
        ) : null}

        <div className="catalog__footerRow">
          <div className="muted">
            {loading ? "Đang tải..." : `Tổng: ${data?.total ?? 0}`}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                setLoading(true);
                fetchCatalog({ nextPage: next })
                  .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
                  .finally(() => setLoading(false));
              }}
              disabled={loading || page <= 1}
            >
              Trước
            </button>
            <div className="muted">
              Trang {page} / {totalPages}
            </div>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                setLoading(true);
                fetchCatalog({ nextPage: next })
                  .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
                  .finally(() => setLoading(false));
              }}
              disabled={loading || page >= totalPages}
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

