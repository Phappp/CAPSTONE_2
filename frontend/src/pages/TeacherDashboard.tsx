import AvatarMenu from "../components/AvatarMenu";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { url } from "../baseUrl";
import { COURSES_API } from "../api/courses";
import { getAccessToken } from "../utils/authStorage";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const TAB_STORAGE_KEY = "teacher_courses_tab";
  const SORT_STORAGE_KEY = "teacher_courses_sort";
  const [openMenuCourseId, setOpenMenuCourseId] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    published: number;
    draft: number;
    archived: number;
  } | null>(null);
  const [tab, setTab] = useState<"all" | "published" | "draft" | "archived">(() => {
    try {
      const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
      if (
        saved === "all" ||
        saved === "published" ||
        saved === "draft" ||
        saved === "archived"
      ) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    return "all";
  });
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{
    sort_by: "updated_at" | "created_at" | "title" | "learners_count";
    sort_dir: "asc" | "desc";
  }>(() => {
    try {
      const raw = window.localStorage.getItem(SORT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const sb = parsed?.sort_by;
        const sd = parsed?.sort_dir;
        const okBy =
          sb === "updated_at" ||
          sb === "created_at" ||
          sb === "title" ||
          sb === "learners_count";
        const okDir = sd === "asc" || sd === "desc";
        if (okBy && okDir) return { sort_by: sb, sort_dir: sd };
      }
    } catch {
      // ignore
    }
    return { sort_by: "updated_at", sort_dir: "desc" };
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    items: any[];
    page: number;
    page_size: number;
    total: number;
  } | null>(null);

  const token = useMemo(() => getAccessToken(), []);

  const fetchStats = async () => {
    const res = await fetch(`${url}${COURSES_API.myStats}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không thể tải thống kê.");
    setStats(data);
  };

  const fetchList = async (opts?: { nextPage?: number; nextQ?: string }) => {
    const nextPage = opts?.nextPage ?? page;
    const nextQ = opts?.nextQ ?? q;
    const params = new URLSearchParams();
    params.set("status", tab);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    params.set("page", String(nextPage));
    params.set("page_size", String(pageSize));
    params.set("sort_by", sort.sort_by);
    params.set("sort_dir", sort.sort_dir);

    const res = await fetch(`${url}${COURSES_API.myList}?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không thể tải danh sách khóa học.");
    setResult(data);
  };

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStats(), fetchList()]);
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  // Persist tab across refresh (F5)
  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // ignore storage errors
    }
  }, [tab]);

  // Persist sort across refresh (F5)
  useEffect(() => {
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sort));
    } catch {
      // ignore storage errors
    }
  }, [sort]);

  // Debounce search input -> q (query thực tế)
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(searchInput);
    }, 450);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Click outside the action menu closes it
      if (!target.closest('[data-course-actions-menu="root"]')) {
        setOpenMenuCourseId(null);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    setPage(1);
    setError(null);
    const t = window.setTimeout(() => {
      (async () => {
        setLoading(true);
        try {
          await Promise.all([fetchStats(), fetchList({ nextPage: 1 })]);
        } catch (e: any) {
          setError(e?.message || "Đã xảy ra lỗi.");
        } finally {
          setLoading(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, sort.sort_by, sort.sort_dir]);

  const handleSetStatus = async (
    courseId: number,
    status: "draft" | "published" | "archived"
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.setStatus(courseId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể cập nhật trạng thái.");
      }
      await refetch();
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = async (courseId: number) => {
    const ok = window.confirm(
      "Bỏ xuất bản khóa học này?\n\nKhóa học sẽ không còn hiển thị cho học viên."
    );
    if (!ok) return;
    await handleSetStatus(courseId, "draft");
  };

  const handleDelete = async (courseId: number) => {
    if (!window.confirm("Xóa khóa học? Thao tác sẽ đưa khóa học vào thùng rác (soft delete).")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${url}${COURSES_API.softDelete(courseId)}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể xóa khóa học.");
      }
      await refetch();
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Tổng số", value: stats?.total ?? 0, key: "total" },
    { label: "Đã xuất bản", value: stats?.published ?? 0, key: "published" },
    { label: "Bản nháp", value: stats?.draft ?? 0, key: "draft" },
    { label: "Đã lưu trữ", value: stats?.archived ?? 0, key: "archived" },
  ] as const;

  const tabs: { key: "all" | "published" | "draft" | "archived"; label: string }[] =
    [
      { key: "all", label: "Tất cả" },
      { key: "published", label: "Đã xuất bản" },
      { key: "draft", label: "Bản nháp" },
      { key: "archived", label: "Đã lưu trữ" },
    ];

  return (
    <div className="dashboard-page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 className="dashboard-title">Dashboard giảng viên</h1>
          <p className="dashboard-subtitle">
            Quản lý danh sách khóa học của bạn: tạo mới, tìm kiếm, xuất bản, lưu
            trữ và xóa.
          </p>
        </div>
        <AvatarMenu />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Khóa học của tôi</h2>
        <button
          type="button"
          className="primary-button"
          style={{ width: "auto", paddingInline: "1.5rem" }}
          onClick={() => navigate("/teacher/courses/new")}
        >
          Tạo khóa học mới
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        {statCards.map((c) => (
          <div
            key={c.key}
            className="wizard-card"
            style={{ padding: "1rem", margin: 0 }}
          >
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{c.label}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, marginTop: "0.25rem" }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="wizard-card" style={{ padding: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={t.key === tab ? "primary-button" : "secondary-button"}
                style={{ width: "auto", paddingInline: "1rem" }}
                onClick={() => setTab(t.key)}
                disabled={loading}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", minWidth: "520px" }}>
            <select
              className="form-input"
              value={`${sort.sort_by}:${sort.sort_dir}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split(":") as any;
                setSort({ sort_by: sb, sort_dir: sd });
              }}
              disabled={loading}
              style={{ maxWidth: 240 }}
            >
              <option value="updated_at:desc">Mới cập nhật (giảm dần)</option>
              <option value="updated_at:asc">Mới cập nhật (tăng dần)</option>
              <option value="created_at:desc">Mới tạo (giảm dần)</option>
              <option value="created_at:asc">Mới tạo (tăng dần)</option>
              <option value="title:asc">Tên A → Z</option>
              <option value="title:desc">Tên Z → A</option>
              <option value="learners_count:desc">Học viên (nhiều → ít)</option>
              <option value="learners_count:asc">Học viên (ít → nhiều)</option>
            </select>
            <input
              className="form-input"
              placeholder="Tìm kiếm theo tên hoặc slug..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
          {(result?.items || []).map((c: any) => (
            <div
              key={c.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "1rem",
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                alignItems: "stretch",
                cursor: "pointer",
              }}
              onClick={() => !loading && navigate(`/teacher/courses/${c.id}`)}
            >
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 120,
                    height: 72,
                    borderRadius: 10,
                    background: "#f3f4f6",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {c.thumbnail_url ? (
                    <img
                      src={c.thumbnail_url}
                      alt={c.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : null}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "1.05rem",
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                      }}
                    >
                      {c.title}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        background:
                          c.status === "published"
                            ? "#dcfce7"
                            : c.status === "draft"
                            ? "#fef3c7"
                            : "#e5e7eb",
                        color:
                          c.status === "published"
                            ? "#166534"
                            : c.status === "draft"
                            ? "#92400e"
                            : "#374151",
                        fontWeight: 600,
                      }}
                    >
                      {c.status === "published"
                        ? "Đã xuất bản"
                        : c.status === "draft"
                        ? "Bản nháp"
                        : "Đã lưu trữ"}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
                    {c.short_description || "—"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.4rem" }}>
                    Học viên: <b>{c.learners_count ?? 0}</b> · Chương:{" "}
                    <b>{c.modules_count ?? 0}</b> · Bài học: <b>{c.lessons_count ?? 0}</b>
                  </div>
                </div>
              </div>

              <div
                data-course-actions-menu="root"
                style={{ position: "relative", display: "flex", alignItems: "flex-start" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="secondary-button"
                  aria-haspopup="menu"
                  aria-expanded={openMenuCourseId === c.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenMenuCourseId((cur) => (cur === c.id ? null : c.id));
                  }}
                  disabled={loading}
                  style={{
                    width: 40,
                    height: 40,
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                  title="Thao tác"
                >
                  ⋯
                </button>

                {openMenuCourseId === c.id ? (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      top: 44,
                      right: 0,
                      minWidth: 180,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      boxShadow: "0 10px 25px rgba(15, 23, 42, 0.10)",
                      padding: 6,
                      zIndex: 20,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Publish / Unpublish (archived => none) */}
                    {c.status !== "archived" ? (
                      c.status !== "published" ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="secondary-button"
                          style={{ width: "100%", justifyContent: "flex-start" }}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuCourseId(null);
                            await handleSetStatus(c.id, "published");
                          }}
                          disabled={loading}
                        >
                          Xuất bản
                        </button>
                      ) : (
                        <button
                          type="button"
                          role="menuitem"
                          className="secondary-button"
                          style={{
                            width: "100%",
                            justifyContent: "flex-start",
                            borderColor: "#fecaca",
                            color: "#b91c1c",
                          }}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuCourseId(null);
                            await handleUnpublish(c.id);
                          }}
                          disabled={loading}
                        >
                          Bỏ xuất bản
                        </button>
                      )
                    ) : null}

                    {/* Archive / Unarchive */}
                    {c.status !== "archived" ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="secondary-button"
                        style={{ width: "100%", justifyContent: "flex-start", marginTop: 6 }}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuCourseId(null);
                          await handleSetStatus(c.id, "archived");
                        }}
                        disabled={loading}
                      >
                        Lưu trữ
                      </button>
                    ) : (
                      <button
                        type="button"
                        role="menuitem"
                        className="secondary-button"
                        style={{ width: "100%", justifyContent: "flex-start", marginTop: 6 }}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuCourseId(null);
                          await handleSetStatus(c.id, "draft");
                        }}
                        disabled={loading}
                      >
                        Bỏ lưu trữ
                      </button>
                    )}

                    <div style={{ height: 1, background: "#e5e7eb", margin: "8px 0" }} />

                    <button
                      type="button"
                      role="menuitem"
                      className="secondary-button"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        borderColor: "#fecaca",
                        color: "#b91c1c",
                      }}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenuCourseId(null);
                        await handleDelete(c.id);
                      }}
                      disabled={loading}
                    >
                      Xóa
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "1rem",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            {loading ? "Đang tải..." : `Tổng: ${result?.total ?? 0}`}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="secondary-button"
              style={{ width: "auto" }}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                setLoading(true);
                fetchList({ nextPage: next })
                  .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
                  .finally(() => setLoading(false));
              }}
              disabled={loading || page <= 1}
            >
              Trước
            </button>
            <button
              type="button"
              className="secondary-button"
              style={{ width: "auto" }}
              onClick={() => {
                const maxPage = Math.max(
                  1,
                  Math.ceil((result?.total ?? 0) / pageSize)
                );
                const next = Math.min(maxPage, page + 1);
                setPage(next);
                setLoading(true);
                fetchList({ nextPage: next })
                  .catch((e: any) => setError(e?.message || "Đã xảy ra lỗi."))
                  .finally(() => setLoading(false));
              }}
              disabled={
                loading ||
                page >= Math.max(1, Math.ceil((result?.total ?? 0) / pageSize))
              }
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


