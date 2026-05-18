// AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  Key,
  BookOpen,
  CheckCircle,
  LogOut,
  UserCheck,
  Search,
  Filter,
  Download,
  Save,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  UserX,
  UserCheck as UserRestore,
  Lock,
  Trash2,
  Clock,
  Calendar,
  Mail,
  Phone,
  Hash,
  Award,
  Briefcase,
  Building,
  Link as LinkIcon,
  FileText as FileIcon,
  Wallet,
  Star,
  Zap,
  Plus,
  Copy,
  MoreVertical,
  ExternalLink,
  FileSearch,
  XCircle,
} from "lucide-react";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import AvatarMenu from "../../components/AvatarMenu";
import CommonModal, { ConfirmModal } from "../../components/CommonModal";
import { useAuth } from "../../contexts/Auth";
import {
  AdminUser,
  AdminUsersStatistics,
  apiBulkAction,
  apiGetAdminUsers,
  apiGetAuditLogs,
  apiHardDeleteUser,
  apiResetUserPassword,
  apiRestoreUser,
  apiSoftDeleteUser,
  apiGetOpenRouterConfig,
  apiCreateOpenRouterKey,
  apiDeleteOpenRouterKey,
  apiTestOpenRouterKey,
  apiUpdateOpenRouterKey,
  apiUpdateOpenRouterConfig,
  apiUpdateUserRole,
  apiUpdateUserStatus,
  apiGetPendingReviewCourses,
  apiGetCourseManagerVerifications,
  apiGetCourseReviewTimeline,
  apiGetAdminRevenueSummary,
  apiGetAdminRevenueByTeacher,
  apiReviewCourseManagerVerification,
  apiReviewCourseByAdmin,
  apiGetAdminCourses,
  AdminRevenueByTeacherItem,
  AdminRevenueSummary,
  AuditLogItem,
  CourseManagerVerification,
  PendingReviewCourse,
  apiGetPendingLessonResources,
  apiReviewLessonResourceByAdmin,
  apiGetLessonResourceReviewTimeline,
  PendingLessonResource,
} from "../../services/adminUsersClient";
import "./AdminDashboard.css";
import transLogo from "../../assets/trans-logo-2.png";

type RoleFilter = "all" | "learner" | "course_manager" | "admin";
type StatusFilter = "all" | "active" | "pending" | "banned" | "deleted";
type CourseStatusFilter = "all" | "draft" | "pending_review" | "published" | "archived";
type AdminView = "users" | "audit_logs" | "keys" | "course_management" | "course_reviews" | "lesson_reviews" | "manager_verifications" | "revenue";
type AdminTier = "admin" | "non_admin";

const VIEW_CONFIG: Record<AdminView, { label: string; icon: React.ReactNode; description: string }> = {
  users: { label: "Quản lý người dùng", icon: <Users size={18} />, description: "Quản lý tất cả người dùng trong hệ thống" },
  audit_logs: { label: "Nhật ký hệ thống", icon: <FileText size={18} />, description: "Xem lịch sử hoạt động hệ thống" },
  keys: { label: "Khóa API", icon: <Key size={18} />, description: "Quản lý khóa API OpenRouter" },
  course_management: { label: "Quản lý khóa học", icon: <BookOpen size={18} />, description: "Xem và quản lý tất cả khóa học trong hệ thống" },
  course_reviews: { label: "Duyệt khóa học", icon: <CheckCircle size={18} />, description: "Duyệt khóa học chờ xuất bản" },
  lesson_reviews: { label: "Duyệt bài học", icon: <FileIcon size={18} />, description: "Duyệt tài nguyên bài học (video, tài liệu, YouTube) chờ duyệt" },
  manager_verifications: { label: "Xác minh giảng viên", icon: <UserCheck size={18} />, description: "Xác minh và cấp phép giảng viên" },
  revenue: { label: "Doanh thu hệ thống", icon: <Wallet size={18} />, description: "Tổng quan doanh thu và đối soát theo giảng viên" },
};

export default function AdminDashboard() {
  const { accessToken, user, logout } = useAuth();
  const adminTier = getAdminTierFromUser(user);
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [view, setView] = useState<AdminView>("users");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutConfirm = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  // Users state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<"activate" | "deactivate" | "set_role">("activate");
  const [bulkRole, setBulkRole] = useState<RoleFilter>("learner");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [lastUndo, setLastUndo] = useState<{ action: "activate" | "deactivate"; userIds: number[] } | null>(null);
  const [savedFilterName, setSavedFilterName] = useState("");
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; value: any }>>([]);

  // Audit logs state
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit] = useState(20);
  const [auditActorId, setAuditActorId] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");

  // Keys state
  const [newOpenRouterApiKey, setNewOpenRouterApiKey] = useState("");
  const [newOpenRouterKeyLabel, setNewOpenRouterKeyLabel] = useState("");
  const [openRouterModelsInput, setOpenRouterModelsInput] = useState("");
  const [openRouterDefaultModel, setOpenRouterDefaultModel] = useState("");
  const [openRouterSaving, setOpenRouterSaving] = useState(false);
  const [openRouterMessage, setOpenRouterMessage] = useState<string | null>(null);
  const [openRouterCooldownMinutes, setOpenRouterCooldownMinutes] = useState("10");
  const [testingKeyId, setTestingKeyId] = useState<number | null>(null);
  const [keyHealthFilter, setKeyHealthFilter] = useState<"all" | "healthy" | "limited" | "auth_error" | "inactive">("all");

  // Course reviews state
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewQ, setReviewQ] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"all" | "draft" | "pending_review" | "published" | "archived">("all");
  const [reviewActionLoading, setReviewActionLoading] = useState<number | null>(null);
  const [reviewPhaseByCourse, setReviewPhaseByCourse] = useState<Record<number, string>>({});

  // Lesson reviews state
  const [lessonReviewPage, setLessonReviewPage] = useState(1);
  const [lessonReviewQ, setLessonReviewQ] = useState("");
  const [lessonReviewKind, setLessonReviewKind] = useState<"all" | "pdf" | "word" | "video" | "youtube" | "other">("all");
  const [lessonReviewCourseId, setLessonReviewCourseId] = useState<number | undefined>(undefined);
  const [lessonReviewActionLoading, setLessonReviewActionLoading] = useState<number | null>(null);
  const [lessonReviewPhaseByResource, setLessonReviewPhaseByResource] = useState<Record<number, string>>({});
  const [selectedLessonResource, setSelectedLessonResource] = useState<PendingLessonResource | null>(null);

  // Manager verifications state
  const [verificationPage, setVerificationPage] = useState(1);
  const [verificationQ, setVerificationQ] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<"all" | "pending" | "verified" | "rejected" | "suspended">("all");
  const [verificationActionLoading, setVerificationActionLoading] = useState<number | null>(null);
  const [revenuePage, setRevenuePage] = useState(1);
  const [revenueSearch, setRevenueSearch] = useState("");
  const [revenueFrom, setRevenueFrom] = useState("");
  const [revenueTo, setRevenueTo] = useState("");

  // Modal state
  const [noticeModal, setNoticeModal] = useState<{ open: boolean; title: string; message: string; variant?: "info" | "warning" | "error" | "success" }>({
    open: false,
    title: "",
    message: "",
    variant: "info",
  });

  // Queries
  const usersQuery = useQuery({
    queryKey: ["admin-users", { page, limit, search, role, status, includeDeleted }],
    queryFn: () =>
      apiGetAdminUsers({
        page,
        limit,
        search: search.trim() || undefined,
        role,
        status,
        includeDeleted,
        accessToken: accessToken || "",
      }),
    enabled: !!accessToken && view === "users",
    keepPreviousData: true,
  });

  const auditQuery = useQuery({
    queryKey: ["admin-audit-logs", { auditPage, auditLimit, auditActorId, auditAction, auditFrom, auditTo }],
    queryFn: () =>
      apiGetAuditLogs({
        page: auditPage,
        limit: auditLimit,
        actorUserId: auditActorId.trim() ? Number(auditActorId.trim()) : undefined,
        action: auditAction.trim() || undefined,
        from: auditFrom || undefined,
        to: auditTo || undefined,
        accessToken: accessToken || "",
      }),
    enabled: !!accessToken && view === "audit_logs",
    keepPreviousData: true,
  });

  // Course Management state
  const [courseMgmtPage, setCourseMgmtPage] = useState(1);
  const [courseMgmtQ, setCourseMgmtQ] = useState("");
  const [courseMgmtStatus, setCourseMgmtStatus] = useState<CourseStatusFilter>("all");
  const [courseMgmtSortBy, setCourseMgmtSortBy] = useState<"updated_at" | "created_at" | "title" | "learners_count">("updated_at");
  const [courseMgmtSortDir, setCourseMgmtSortDir] = useState<"asc" | "desc">("desc");

  const courseManagementQuery = useQuery({
    queryKey: ["admin-course-management", { courseMgmtPage, courseMgmtQ, courseMgmtStatus, courseMgmtSortBy, courseMgmtSortDir }],
    queryFn: () =>
      apiGetAdminCourses({
        accessToken: accessToken || "",
        page: courseMgmtPage,
        pageSize: 10,
        q: courseMgmtQ || undefined,
        status: courseMgmtStatus === "all" ? undefined : courseMgmtStatus,
        sort_by: courseMgmtSortBy,
        sort_dir: courseMgmtSortDir,
      }),
    enabled: !!accessToken && view === "course_management",
    keepPreviousData: true,
  });

  const openRouterQuery = useQuery({
    queryKey: ["admin-openrouter-config"],
    queryFn: () => apiGetOpenRouterConfig({ accessToken: accessToken || "" }),
    enabled: !!accessToken && view === "keys",
  });

  const pendingReviewQuery = useQuery({
    queryKey: ["admin-all-courses", { reviewPage, reviewQ, reviewStatus }],
    queryFn: () =>
      apiGetAdminCourses({
        accessToken: accessToken || "",
        page: reviewPage,
        pageSize: 10,
        q: reviewQ || undefined,
        status: reviewStatus === "all" ? undefined : reviewStatus,
      }),
    enabled: !!accessToken && view === "course_reviews",
    keepPreviousData: true,
  });

  const pendingLessonResourcesQuery = useQuery({
    queryKey: ["admin-lesson-resources-pending-review", { lessonReviewPage, lessonReviewQ, lessonReviewKind, lessonReviewCourseId }],
    queryFn: () =>
      apiGetPendingLessonResources({
        accessToken: accessToken || "",
        page: lessonReviewPage,
        pageSize: 10,
        q: lessonReviewQ || undefined,
        kind: lessonReviewKind === "all" ? undefined : lessonReviewKind,
        courseId: lessonReviewCourseId,
      }),
    enabled: !!accessToken && view === "lesson_reviews",
    keepPreviousData: true,
  });

  const managerVerificationQuery = useQuery({
    queryKey: ["admin-course-manager-verifications", { verificationPage, verificationQ, verificationStatus }],
    queryFn: () =>
      apiGetCourseManagerVerifications({
        accessToken: accessToken || "",
        page: verificationPage,
        limit: 10,
        q: verificationQ || undefined,
        status: verificationStatus,
      }),
    enabled: !!accessToken && view === "manager_verifications",
    keepPreviousData: true,
  });

  const revenueSummaryQuery = useQuery({
    queryKey: ["admin-revenue-summary", { revenueFrom, revenueTo }],
    queryFn: () =>
      apiGetAdminRevenueSummary({
        accessToken: accessToken || "",
        from: revenueFrom || undefined,
        to: revenueTo || undefined,
      }),
    enabled: !!accessToken && view === "revenue",
  });

  const revenueByTeacherQuery = useQuery({
    queryKey: ["admin-revenue-by-teacher", { revenuePage, revenueSearch, revenueFrom, revenueTo }],
    queryFn: () =>
      apiGetAdminRevenueByTeacher({
        accessToken: accessToken || "",
        page: revenuePage,
        limit: 10,
        search: revenueSearch || undefined,
        from: revenueFrom || undefined,
        to: revenueTo || undefined,
      }),
    enabled: !!accessToken && view === "revenue",
    keepPreviousData: true,
  });

  // Effects
  useEffect(() => {
    const cfg = openRouterQuery.data;
    if (!cfg) return;
    setOpenRouterModelsInput((cfg.models || []).join("\n"));
    setOpenRouterDefaultModel(cfg.default_model || "");
  }, [openRouterQuery.data]);

  useEffect(() => {
    if (!openRouterMessage) return;
    const timer = window.setTimeout(() => setOpenRouterMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [openRouterMessage]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("admin_users_saved_filters");
      if (raw) setSavedFilters(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("admin_users_saved_filters", JSON.stringify(savedFilters));
    } catch {}
  }, [savedFilters]);

  // Computed values
  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;
  const statistics = usersQuery.data?.statistics;

  const displayedUsers = users;

  const selectedOnPage = useMemo(() => {
    const ids = new Set(displayedUsers.map((u) => u.id));
    return [...selectedIds].filter((id) => ids.has(id));
  }, [selectedIds, displayedUsers]);

  const allSelectedOnPage = displayedUsers.length > 0 && selectedOnPage.length === displayedUsers.length;

  const filteredOpenRouterKeys = useMemo(() => {
    const all = openRouterQuery.data?.keys ?? [];
    if (keyHealthFilter === "all") return all;
    return all.filter((key) => getKeyHealthStatus(key) === keyHealthFilter);
  }, [openRouterQuery.data?.keys, keyHealthFilter]);

  // Actions
  const showNotice = (message: string, title = "Thông báo", variant: "info" | "warning" | "error" | "success" = "info") => {
    setNoticeModal({ open: true, title, message, variant });
  };

  const toggleSelectAllOnPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!checked) {
        for (const u of displayedUsers) next.delete(u.id);
      } else {
        for (const u of displayedUsers) {
          if (u.status !== "deleted") next.add(u.id);
        }
      }
      return next;
    });
  };

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const saveCurrentFilter = () => {
    const name = savedFilterName.trim();
    if (!name) {
      showNotice("Nhập tên bộ lọc để lưu.");
      return;
    }
    const value = { search, role, status, includeDeleted };
    setSavedFilters((prev) => {
      const without = prev.filter((f) => f.name !== name);
      return [...without, { name, value }];
    });
    setSavedFilterName("");
    showNotice(`Đã lưu bộ lọc "${name}"`, "Thành công", "success");
  };

  const applySavedFilter = (name: string) => {
    const found = savedFilters.find((f) => f.name === name);
    if (!found) return;
    setPage(1);
    setSearch(found.value.search);
    setRole(found.value.role);
    setStatus(found.value.status);
    setIncludeDeleted(found.value.includeDeleted);
  };

  const deleteSavedFilter = (name: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.name !== name));
    showNotice(`Đã xóa bộ lọc "${name}"`, "Thành công", "success");
  };

  const exportCsv = () => {
    const rows = displayedUsers.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name || "",
      role: u.role || "",
      status: u.status,
      email_verified: u.email_verified ? "có" : "không",
      last_login: u.last_login || "",
      created_at: u.created_at,
    }));
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin_users_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showNotice("Xuất file CSV thành công", "Thành công", "success");
  };

  const handleResetPassword = async (target: AdminUser) => {
    if (!can(adminTier, "reset_password")) {
      showNotice("Bạn không có quyền đặt lại mật khẩu.", "Lỗi quyền", "error");
      return;
    }
    if (!window.confirm(`Đặt lại mật khẩu cho ${target.email} (ID: ${target.id})?`)) return;
    try {
      const result = await apiResetUserPassword({ userId: target.id, accessToken: accessToken || "" });
      showNotice(`Mật khẩu tạm thời: ${result.temp_password}`, "Reset mật khẩu thành công", "success");
    } catch (e: any) {
      showNotice(e?.message || "Đặt lại mật khẩu thất bại", "Lỗi", "error");
    }
  };

  const handleUpdateRole = async (target: AdminUser, nextRole: RoleFilter) => {
    if (!can(adminTier, "change_role")) {
      showNotice("Bạn không có quyền đổi vai trò.", "Lỗi quyền", "error");
      return;
    }
    if (!window.confirm(`Đổi vai trò của ${target.email} (ID: ${target.id}) sang ${getRoleDisplayLabel(nextRole)}?`)) return;
    try {
      await apiUpdateUserRole({ userId: target.id, role: nextRole as any, accessToken: accessToken || "" });
      await usersQuery.refetch();
      showNotice(`Đã đổi vai trò thành ${getRoleDisplayLabel(nextRole)}`, "Thành công", "success");
    } catch (e: any) {
      showNotice(e?.message || "Đổi vai trò thất bại", "Lỗi", "error");
    }
  };

  const handleUpdateStatus = async (target: AdminUser, nextStatus: Exclude<StatusFilter, "all" | "deleted">) => {
    if (!can(adminTier, "change_status")) {
      showNotice("Bạn không có quyền đổi trạng thái.", "Lỗi quyền", "error");
      return;
    }
    const reasonInput = window.prompt(nextStatus === "banned" ? "Lý do (bắt buộc khi khóa):" : "Lý do (tùy chọn):", "");
    const reason = reasonInput ? reasonInput.trim() : "";
    if (nextStatus === "banned" && !reason) {
      showNotice("Bạn phải nhập lý do khi khóa người dùng.", "Lỗi", "error");
      return;
    }
    if (!window.confirm(`Đổi trạng thái của ${target.email} (ID: ${target.id}) sang ${nextStatus.toUpperCase()}?`)) return;
    try {
      await apiUpdateUserStatus({ userId: target.id, status: nextStatus as any, reason: reason || undefined, accessToken: accessToken || "" });
      await usersQuery.refetch();
      showNotice(`Đã đổi trạng thái thành ${nextStatus.toUpperCase()}`, "Thành công", "success");
    } catch (e: any) {
      showNotice(e?.message || "Đổi trạng thái thất bại", "Lỗi", "error");
    }
  };

  const handleSoftDelete = async (target: AdminUser) => {
    if (!can(adminTier, "soft_delete")) {
      showNotice("Bạn không có quyền xóa mềm.", "Lỗi quyền", "error");
      return;
    }
    const reason = window.prompt("Lý do xóa mềm (bắt buộc):", "");
    if (!reason?.trim()) {
      showNotice("Bạn phải nhập lý do xóa mềm.", "Lỗi", "error");
      return;
    }
    if (!window.confirm(`Xóa tài khoản ${target.email} (ID: ${target.id})? Thao tác sẽ đưa tài khoản vào thùng rác.`)) return;
    try {
      await apiSoftDeleteUser({ userId: target.id, reason: reason.trim(), accessToken: accessToken || "" });
      await usersQuery.refetch();
      showNotice(`Đã xóa mềm người dùng ${target.email}`, "Thành công", "success");
    } catch (e: any) {
      showNotice(e?.message || "Xóa mềm thất bại", "Lỗi", "error");
    }
  };

  const handleRestore = async (target: AdminUser) => {
    if (!can(adminTier, "restore")) {
      showNotice("Bạn không có quyền khôi phục người dùng.", "Lỗi quyền", "error");
      return;
    }
    if (!window.confirm(`Khôi phục ${target.email} (ID: ${target.id})?`)) return;
    try {
      await apiRestoreUser({ userId: target.id, accessToken: accessToken || "" });
      await usersQuery.refetch();
      showNotice(`Đã khôi phục người dùng ${target.email}`, "Thành công", "success");
    } catch (e: any) {
      showNotice(e?.message || "Khôi phục thất bại", "Lỗi", "error");
    }
  };

  const runBulk = async () => {
    if (!can(adminTier, "bulk")) {
      showNotice("Bạn không có quyền thao tác hàng loạt.", "Lỗi quyền", "error");
      return;
    }
    const userIds = selectedOnPage;
    if (userIds.length === 0) {
      showNotice("Chưa chọn người dùng nào.");
      return;
    }
    const preview = bulkAction === "set_role" ? `Đặt vai trò => ${getRoleDisplayLabel(bulkRole)} cho ${userIds.length} người dùng` : `${bulkAction.toUpperCase()} ${userIds.length} người dùng`;
    if (!window.confirm(`Thao tác hàng loạt:\n${preview}`)) return;

    setBulkRunning(true);
    try {
      await apiBulkAction({ userIds, action: bulkAction, role: bulkAction === "set_role" ? (bulkRole as any) : undefined, accessToken: accessToken || "" });
      if (bulkAction === "activate" || bulkAction === "deactivate") setLastUndo({ action: bulkAction, userIds });
      else setLastUndo(null);
      setSelectedIds(new Set());
      await usersQuery.refetch();
      showNotice("Thao tác hàng loạt thành công.", "Thành công", "success");
    } catch (e: any) {
      showNotice(`Thao tác hàng loạt thất bại: ${String(e?.message || e)}`, "Lỗi", "error");
    } finally {
      setBulkRunning(false);
    }
  };

  const undoLastBulk = async () => {
    if (!lastUndo || !can(adminTier, "bulk")) return;
    const reverse = lastUndo.action === "activate" ? "deactivate" : "activate";
    if (!window.confirm(`Hoàn tác hàng loạt: ${lastUndo.action.toUpperCase()} -> ${reverse.toUpperCase()} (${lastUndo.userIds.length} người dùng)`)) return;
    setBulkRunning(true);
    try {
      await apiBulkAction({ userIds: lastUndo.userIds, action: reverse, accessToken: accessToken || "" });
      setLastUndo(null);
      await usersQuery.refetch();
      showNotice("Hoàn tác thành công.", "Thành công", "success");
    } catch (e: any) {
      showNotice(`Hoàn tác thất bại: ${String(e?.message || e)}`, "Lỗi", "error");
    } finally {
      setBulkRunning(false);
    }
  };

  const saveOpenRouterConfig = async () => {
    if (!can(adminTier, "change_status")) {
      showNotice("Bạn không có quyền cập nhật cấu hình OpenRouter.", "Lỗi quyền", "error");
      return;
    }
    setOpenRouterSaving(true);
    try {
      const models = openRouterModelsInput.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      await apiUpdateOpenRouterConfig({ accessToken: accessToken || "", models, defaultModel: openRouterDefaultModel.trim() || undefined });
      setOpenRouterMessage("Đã lưu cấu hình OpenRouter.");
      await openRouterQuery.refetch();
    } catch (e: any) {
      setOpenRouterMessage(`Lỗi lưu cấu hình: ${String(e?.message || e)}`);
    } finally {
      setOpenRouterSaving(false);
    }
  };

  const createOpenRouterKey = async () => {
    const key = newOpenRouterApiKey.trim();
    if (!key) {
      setOpenRouterMessage("Vui lòng nhập khóa API trước khi thêm.");
      return;
    }
    setOpenRouterSaving(true);
    try {
      await apiCreateOpenRouterKey({ accessToken: accessToken || "", apiKey: key, label: newOpenRouterKeyLabel.trim() || undefined });
      setNewOpenRouterApiKey("");
      setNewOpenRouterKeyLabel("");
      setOpenRouterMessage("Đã thêm OpenRouter key mới.");
      await openRouterQuery.refetch();
    } catch (e: any) {
      setOpenRouterMessage(`Lỗi thêm key: ${String(e?.message || e)}`);
    } finally {
      setOpenRouterSaving(false);
    }
  };

  const testOpenRouterKey = async (keyId: number) => {
    setTestingKeyId(keyId);
    try {
      const result = await apiTestOpenRouterKey({ accessToken: accessToken || "", keyId });
      const suffix = result.cooldown_applied_minutes ? ` (cooldown ${result.cooldown_applied_minutes} phút)` : "";
      setOpenRouterMessage(`Key #${keyId}: ${result.message}${suffix}`);
      await openRouterQuery.refetch();
    } catch (e: any) {
      setOpenRouterMessage(`Lỗi test key #${keyId}: ${String(e?.message || e)}`);
    } finally {
      setTestingKeyId(null);
    }
  };

  const toggleOpenRouterKeyActive = async (keyId: number, isActive: boolean) => {
    setOpenRouterSaving(true);
    try {
      await apiUpdateOpenRouterKey({ accessToken: accessToken || "", keyId, isActive });
      await openRouterQuery.refetch();
    } catch (e: any) {
      setOpenRouterMessage(`Lỗi cập nhật key: ${String(e?.message || e)}`);
    } finally {
      setOpenRouterSaving(false);
    }
  };

  const setOpenRouterKeyCooldown = async (keyId: number) => {
    const minutes = Number(openRouterCooldownMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setOpenRouterMessage("Số phút chờ phải > 0.");
      return;
    }
    setOpenRouterSaving(true);
    try {
      await apiUpdateOpenRouterKey({ accessToken: accessToken || "", keyId, cooldownMinutes: minutes });
      await openRouterQuery.refetch();
      setOpenRouterMessage(`Đã set cooldown ${minutes} phút cho key #${keyId}`);
    } catch (e: any) {
      setOpenRouterMessage(`Lỗi set cooldown: ${String(e?.message || e)}`);
    } finally {
      setOpenRouterSaving(false);
    }
  };

  const clearOpenRouterKeyCooldown = async (keyId: number) => {
    setOpenRouterSaving(true);
    try {
      await apiUpdateOpenRouterKey({ accessToken: accessToken || "", keyId, clearCooldown: true });
      await openRouterQuery.refetch();
      setOpenRouterMessage(`Đã clear cooldown cho key #${keyId}`);
    } catch (e: any) {
      setOpenRouterMessage(`Lỗi clear cooldown: ${String(e?.message || e)}`);
    } finally {
      setOpenRouterSaving(false);
    }
  };

  const deleteOpenRouterKey = async (keyId: number) => {
    if (!window.confirm(`Xóa key #${keyId}?`)) return;
    setOpenRouterSaving(true);
    try {
      await apiDeleteOpenRouterKey({ accessToken: accessToken || "", keyId });
      await openRouterQuery.refetch();
      setOpenRouterMessage(`Đã xóa key #${keyId}`);
    } catch (e: any) {
      setOpenRouterMessage(`Lỗi xóa key: ${String(e?.message || e)}`);
    } finally {
      setOpenRouterSaving(false);
    }
  };

  const reviewCourse = async (course: PendingReviewCourse, decision: "approve" | "reject") => {
    if (!can(adminTier, "change_status")) {
      showNotice("Bạn không có quyền duyệt khóa học.", "Lỗi quyền", "error");
      return;
    }
    const note = window.prompt(decision === "reject" ? "Lý do từ chối (bắt buộc):" : "Ghi chú duyệt (tùy chọn):", "");
    if (decision === "reject" && !String(note || "").trim()) {
      showNotice("Bạn phải nhập lý do khi từ chối khóa học.", "Lỗi", "error");
      return;
    }
    if (!window.confirm(`${decision === "approve" ? "Duyệt" : "Từ chối"} khóa học "${course.title}" (#${course.id})?`)) return;
    setReviewActionLoading(course.id);
    setReviewPhaseByCourse((prev) => ({ ...prev, [course.id]: "Đang xử lý" }));
    try {
      await apiReviewCourseByAdmin({ accessToken: accessToken || "", courseId: course.id, decision, note: note || undefined });
      await pendingReviewQuery.refetch();
      showNotice(
        decision === "approve" ? "Đã duyệt khóa học." : "Đã từ chối khóa học.",
        "Thành công",
        "success"
      );
    } catch (e: any) {
      showNotice(`Thao tác thất bại: ${String(e?.message || e)}`, "Lỗi", "error");
    } finally {
      setReviewPhaseByCourse((prev) => {
        const copy = { ...prev };
        delete copy[course.id];
        return copy;
      });
      setReviewActionLoading(null);
    }
  };

  const viewReviewTimeline = async (course: PendingReviewCourse) => {
    try {
      const data = await apiGetCourseReviewTimeline({ accessToken: accessToken || "", courseId: course.id });
      if (!data.items.length) {
        showNotice("Khóa học chưa có lịch sử duyệt.");
        return;
      }
      const lines = data.items.slice(0, 10).map((item) => {
        const time = new Date(item.created_at).toLocaleString("vi-VN");
        const note = item.note ? ` | note: ${item.note}` : "";
        return `${time} | ${item.decision} | ${item.from_status ?? "—"} -> ${item.to_status}${note}`;
      });
      showNotice(`Dòng thời gian gần nhất của khóa #${course.id}\n\n${lines.join("\n")}`, "Lịch sử duyệt");
    } catch (e: any) {
      showNotice(`Không thể tải timeline: ${String(e?.message || e)}`, "Lỗi", "error");
    }
  };

  const reviewLessonResource = async (resource: PendingLessonResource, decision: "approve" | "reject") => {
    if (!can(adminTier, "change_status")) {
      showNotice("Bạn không có quyền duyệt tài nguyên.", "Lỗi quyền", "error");
      return;
    }
    const note = window.prompt(decision === "reject" ? "Lý do từ chối (bắt buộc):" : "Ghi chú duyệt (tùy chọn):", "");
    if (decision === "reject" && !String(note || "").trim()) {
      showNotice("Bạn phải nhập lý do khi từ chối tài nguyên.", "Lỗi", "error");
      return;
    }
    if (!window.confirm(`${decision === "approve" ? "Duyệt" : "Từ chối"} tài nguyên "${resource.filename || resource.url}" (#${resource.id})?`)) return;
    setLessonReviewActionLoading(resource.id);
    setLessonReviewPhaseByResource((prev) => ({ ...prev, [resource.id]: "Đang xử lý" }));
    try {
      await apiReviewLessonResourceByAdmin({ accessToken: accessToken || "", resourceId: resource.id, decision, note: note || undefined });
      await pendingLessonResourcesQuery.refetch();
      showNotice(
        decision === "approve" ? "Đã duyệt tài nguyên." : "Đã từ chối tài nguyên.",
        "Thành công",
        "success"
      );
    } catch (e: any) {
      showNotice(`Thao tác thất bại: ${String(e?.message || e)}`, "Lỗi", "error");
    } finally {
      setLessonReviewPhaseByResource((prev) => {
        const copy = { ...prev };
        delete copy[resource.id];
        return copy;
      });
      setLessonReviewActionLoading(null);
    }
  };

  const viewLessonResourceTimeline = async (resource: PendingLessonResource) => {
    try {
      const data = await apiGetLessonResourceReviewTimeline({ accessToken: accessToken || "", resourceId: resource.id });
      if (!data.items.length) {
        showNotice("Tài nguyên chưa có lịch sử duyệt.");
        return;
      }
      const lines = data.items.slice(0, 10).map((item) => {
        const time = new Date(item.created_at).toLocaleString("vi-VN");
        const note = item.note ? ` | note: ${item.note}` : "";
        return `${time} | ${item.decision} | ${item.from_status ?? "—"} -> ${item.to_status}${note}`;
      });
      showNotice(`Dòng thời gian gần nhất của tài nguyên #${resource.id}\n\n${lines.join("\n")}`, "Lịch sử duyệt");
    } catch (e: any) {
      showNotice(`Không thể tải timeline: ${String(e?.message || e)}`, "Lỗi", "error");
    }
  };

  const reviewManagerVerification = async (item: CourseManagerVerification, status: "verified" | "rejected" | "suspended") => {
    const note = window.prompt(status === "verified" ? "Ghi chú xác minh (tùy chọn):" : "Lý do (khuyến nghị nhập):", "");
    if (!window.confirm(`Cập nhật trạng thái xác minh của ${item.email} -> ${status.toUpperCase()}?`)) return;
    setVerificationActionLoading(item.user_id);
    try {
      await apiReviewCourseManagerVerification({ accessToken: accessToken || "", userId: item.user_id, status, note: note || undefined });
      await managerVerificationQuery.refetch();
      showNotice("Đã cập nhật trạng thái xác minh.", "Thành công", "success");
    } catch (e: any) {
      showNotice(`Cập nhật thất bại: ${String(e?.message || e)}`, "Lỗi", "error");
    } finally {
      setVerificationActionLoading(null);
    }
  };

  const navItems = [
    { id: "users" as const, label: "Quản lý người dùng", icon: <Users size={18} />, disabled: false },
    { id: "audit_logs" as const, label: "Nhật ký hệ thống", icon: <FileText size={18} />, disabled: !can(adminTier, "view_audit_logs") },
    { id: "keys" as const, label: "Khóa API", icon: <Key size={18} />, disabled: !can(adminTier, "change_status") },
    { id: "course_reviews" as const, label: "Duyệt khóa học", icon: <BookOpen size={18} />, disabled: !can(adminTier, "change_status") },
    { id: "lesson_reviews" as const, label: "Duyệt bài học", icon: <FileIcon size={18} />, disabled: !can(adminTier, "change_status") },
    { id: "manager_verifications" as const, label: "Xác minh giảng viên", icon: <UserCheck size={18} />, disabled: !can(adminTier, "change_status") },
    { id: "revenue" as const, label: "Doanh thu hệ thống", icon: <Wallet size={18} />, disabled: !can(adminTier, "view_audit_logs") },
  ];

  const closeMobileSidebar = () => setMobileOpen(false);

  return (
    <div className="admin-dashboard">
      <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
        <Menu size={20} />
      </button>

      {mobileOpen && <div className="mobile-overlay" onClick={closeMobileSidebar} />}

      <aside className={`admin-sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && <span className="sidebar-logo">
            <img 
              alt="MindBridge Logo"
              className="logo-img"
              src={transLogo}
            />
          </span>}
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => !item.disabled && setView(item.id)}
              disabled={item.disabled}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            {!sidebarCollapsed && (
              <>
                <div className="user-email">{user?.email}</div>
                <div className="user-role">{getRoleDisplayLabel(user?.primary_role || user?.roles?.[0])}</div>
              </>
            )}
          </div>
          <button
            className="logout-btn"
            onClick={() => setLogoutConfirmOpen(true)}
          >
            <LogOut size={16} />
            {!sidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="main-header">
          <h1 className="main-title">{VIEW_CONFIG[view].label}</h1>
          <p className="main-subtitle">{VIEW_CONFIG[view].description}</p>
        </div>

        {view === "users" && (
          <>
            {/* Stats Section */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Tổng số</div>
                <div className="stat-value">{(statistics?.total ?? 0).toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Học viên</div>
                <div className="stat-value">{(statistics?.learners ?? 0).toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Giảng viên</div>
                <div className="stat-value">{(statistics?.course_managers ?? 0).toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Quản trị viên</div>
                <div className="stat-value">{(statistics?.admins ?? 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="filters-card">
              <div className="filters-row">
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo email, tên, SĐT..."
                      value={search}
                      onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                      className="filter-input"
                      style={{ paddingLeft: 36, width: "100%" }}
                    />
                  </div>
                </div>
                
                <button className="btn-secondary" onClick={exportCsv}>
                  <Download size={14} /> XUẤT FILE
                </button>
              </div>
              <div className="filters-row" style={{ flexWrap: "wrap", gap: 8 }}>
                <select className="filter-select" value={role} onChange={(e) => { setPage(1); setRole(e.target.value as RoleFilter); }} style={{ minWidth: 80 }}>
                  <option value="all">Vai trò</option>
                  <option value="learner">Học viên</option>
                  <option value="course_manager">Giảng viên</option>
                  <option value="admin">Quản trị</option>
                </select>
                <select className="filter-select" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as StatusFilter); }} style={{ minWidth: 80 }}>
                  <option value="all">Trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="banned">Bị khóa</option>
                  <option value="deleted">Đã xóa</option>
                </select>
              </div>
              <div className="filters-row">
                <label className="filter-checkbox">
                  <input type="checkbox" checked={includeDeleted} onChange={(e) => { setPage(1); setIncludeDeleted(e.target.checked); }} />
                  <span>Gồm đã xóa</span>
                </label>
              </div>
              <div className="filters-row">
                <input
                  className="filter-input"
                  placeholder="Tên bộ lọc đã lưu..."
                  value={savedFilterName}
                  onChange={(e) => setSavedFilterName(e.target.value)}
                  style={{ width: 200 }}
                />
                <button className="btn-secondary" onClick={saveCurrentFilter}>
                  <Save size={14} /> Lưu bộ lọc
                </button>
                {savedFilters.length > 0 && (
                  <div className="filter-tag-group">
                    {savedFilters.map((f) => (
                      <div key={f.name} className="filter-tag-group">
                        <button className="filter-tag" onClick={() => applySavedFilter(f.name)}>{f.name}</button>
                        <button className="filter-tag-remove" onClick={() => deleteSavedFilter(f.name)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Actions Bar */}
            <div className="bulk-bar">
              <span className="bulk-count">Đã chọn: {selectedOnPage.length}</span>
              <select className="filter-select" value={bulkAction} onChange={(e) => setBulkAction(e.target.value as any)} disabled={bulkRunning} style={{ width: 140 }}>
                <option value="activate">Kích hoạt</option>
                <option value="deactivate">Vô hiệu hóa</option>
                <option value="set_role">Đổi vai trò</option>
              </select>
              {bulkAction === "set_role" && (
                <select className="filter-select" value={bulkRole} onChange={(e) => setBulkRole(e.target.value as RoleFilter)} disabled={bulkRunning} style={{ width: 140 }}>
                  <option value="learner">Học viên</option>
                  <option value="course_manager">Giảng viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              )}
              <button className="btn-primary" onClick={runBulk} disabled={bulkRunning || selectedOnPage.length === 0}>
                {bulkRunning ? "Đang chạy..." : "Áp dụng"}
              </button>
              <button className="btn-secondary" onClick={undoLastBulk} disabled={bulkRunning || !lastUndo}>Hoàn tác</button>
              <button className="btn-secondary" onClick={() => setSelectedIds(new Set())} disabled={selectedOnPage.length === 0}>Bỏ chọn</button>
            </div>

            {/* Users Table */}
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" checked={allSelectedOnPage} onChange={(e) => toggleSelectAllOnPage(e.target.checked)} /></th>
                    <th>Người dùng</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Đăng nhập cuối</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.isLoading && (
                    <tr><td colSpan={7} className="table-empty"><RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} /> Đang tải...</td></tr>
                  )}
                  {usersQuery.isError && !usersQuery.isLoading && (
                    <tr><td colSpan={7} className="table-empty"><AlertCircle size={20} /> Không thể tải danh sách người dùng</td></tr>
                  )}
                  {!usersQuery.isLoading && !usersQuery.isError && displayedUsers.length === 0 && (
                    <tr><td colSpan={7} className="table-empty">Không có người dùng nào</td></tr>
                  )}
                  {displayedUsers.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      selected={selectedIds.has(u.id)}
                      onToggleSelected={(checked) => toggleOne(u.id, checked)}
                      onResetPassword={() => handleResetPassword(u)}
                      onChangeRole={(r) => handleUpdateRole(u, r)}
                      onChangeStatus={(s) => handleUpdateStatus(u, s)}
                      onSoftDelete={() => handleSoftDelete(u)}
                      onRestore={() => handleRestore(u)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-buttons">
                <button className="btn-secondary" disabled={!pagination || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft size={14} /> Trước
                </button>
                <button className="btn-secondary" disabled={!pagination || page >= (pagination?.pages ?? 1)} onClick={() => setPage((p) => !pagination ? p : Math.min(pagination.pages, p + 1))}>
                  Sau <ChevronRight size={14} />
                </button>
              </div>
              <div className="pagination-info">Trang {page} / {pagination?.pages ?? 1}</div>
            </div>
          </>
        )}

        {view === "audit_logs" && (
          <AuditLogsPanel
            data={auditQuery.data?.logs ?? []}
            pagination={auditQuery.data?.pagination}
            isLoading={auditQuery.isLoading}
            isError={auditQuery.isError}
            page={auditPage}
            setPage={setAuditPage}
            actorId={auditActorId}
            setActorId={setAuditActorId}
            action={auditAction}
            setAction={setAuditAction}
            from={auditFrom}
            setFrom={setAuditFrom}
            to={auditTo}
            setTo={setAuditTo}
          />
        )}

        {view === "keys" && (
          <KeysPanel
            openRouterModelsInput={openRouterModelsInput}
            setOpenRouterModelsInput={setOpenRouterModelsInput}
            openRouterDefaultModel={openRouterDefaultModel}
            setOpenRouterDefaultModel={setOpenRouterDefaultModel}
            openRouterCooldownMinutes={openRouterCooldownMinutes}
            setOpenRouterCooldownMinutes={setOpenRouterCooldownMinutes}
            openRouterSaving={openRouterSaving}
            openRouterMessage={openRouterMessage}
            saveOpenRouterConfig={saveOpenRouterConfig}
            newOpenRouterKeyLabel={newOpenRouterKeyLabel}
            setNewOpenRouterKeyLabel={setNewOpenRouterKeyLabel}
            newOpenRouterApiKey={newOpenRouterApiKey}
            setNewOpenRouterApiKey={setNewOpenRouterApiKey}
            createOpenRouterKey={createOpenRouterKey}
            keyHealthFilter={keyHealthFilter}
            setKeyHealthFilter={setKeyHealthFilter}
            filteredKeys={filteredOpenRouterKeys}
            testingKeyId={testingKeyId}
            testOpenRouterKey={testOpenRouterKey}
            toggleOpenRouterKeyActive={toggleOpenRouterKeyActive}
            setOpenRouterKeyCooldown={setOpenRouterKeyCooldown}
            clearOpenRouterKeyCooldown={clearOpenRouterKeyCooldown}
            deleteOpenRouterKey={deleteOpenRouterKey}
            activeAvailableKeys={openRouterQuery.data?.active_available_keys ?? 0}
          />
        )}

        {view === "course_management" && (
          <CourseManagementPanel
            data={courseManagementQuery.data?.items ?? []}
            pagination={
              courseManagementQuery.data
                ? {
                    page: courseManagementQuery.data.page,
                    limit: courseManagementQuery.data.page_size,
                    total: courseManagementQuery.data.total,
                    pages: Math.max(1, Math.ceil(courseManagementQuery.data.total / courseManagementQuery.data.page_size)),
                  }
                : undefined
            }
            isLoading={courseManagementQuery.isLoading}
            isError={courseManagementQuery.isError}
            page={courseMgmtPage}
            setPage={setCourseMgmtPage}
            q={courseMgmtQ}
            setQ={setCourseMgmtQ}
            status={courseMgmtStatus}
            setStatus={setCourseMgmtStatus}
            sortBy={courseMgmtSortBy}
            setSortBy={setCourseMgmtSortBy}
            sortDir={courseMgmtSortDir}
            setSortDir={setCourseMgmtSortDir}
          />
        )}

        {view === "course_reviews" && (
          <CourseReviewsPanel
            data={pendingReviewQuery.data?.items ?? []}
            pagination={
              pendingReviewQuery.data
                ? {
                    page: pendingReviewQuery.data.page,
                    limit: pendingReviewQuery.data.page_size,
                    total: pendingReviewQuery.data.total,
                    pages: Math.max(1, Math.ceil(pendingReviewQuery.data.total / pendingReviewQuery.data.page_size)),
                  }
                : undefined
            }
            isLoading={pendingReviewQuery.isLoading}
            isError={pendingReviewQuery.isError}
            page={reviewPage}
            setPage={setReviewPage}
            q={reviewQ}
            setQ={setReviewQ}
            status={reviewStatus}
            setStatus={setReviewStatus}
            actionLoading={reviewActionLoading}
            phaseByCourse={reviewPhaseByCourse}
            onReview={reviewCourse}
            onViewTimeline={viewReviewTimeline}
            refetch={pendingReviewQuery.refetch}
          />
        )}

        {view === "lesson_reviews" && (
          <LessonResourceReviewsPanel
            data={pendingLessonResourcesQuery.data?.items ?? []}
            pagination={
              pendingLessonResourcesQuery.data
                ? {
                    page: pendingLessonResourcesQuery.data.page,
                    limit: pendingLessonResourcesQuery.data.page_size,
                    total: pendingLessonResourcesQuery.data.total,
                    pages: Math.max(1, Math.ceil(pendingLessonResourcesQuery.data.total / pendingLessonResourcesQuery.data.page_size)),
                  }
                : undefined
            }
            isLoading={pendingLessonResourcesQuery.isLoading}
            isError={pendingLessonResourcesQuery.isError}
            page={lessonReviewPage}
            setPage={setLessonReviewPage}
            q={lessonReviewQ}
            setQ={setLessonReviewQ}
            kind={lessonReviewKind}
            setKind={setLessonReviewKind}
            actionLoading={lessonReviewActionLoading}
            phaseByResource={lessonReviewPhaseByResource}
            onReview={reviewLessonResource}
            onViewTimeline={viewLessonResourceTimeline}
            refetch={pendingLessonResourcesQuery.refetch}
          />
        )}


        {view === "manager_verifications" && (
          <ManagerVerificationsPanel
            data={managerVerificationQuery.data?.items ?? []}
            pagination={managerVerificationQuery.data?.pagination}
            isLoading={managerVerificationQuery.isLoading}
            isError={managerVerificationQuery.isError}
            page={verificationPage}
            setPage={setVerificationPage}
            q={verificationQ}
            setQ={setVerificationQ}
            status={verificationStatus}
            setStatus={setVerificationStatus}
            actionLoading={verificationActionLoading}
            onReview={reviewManagerVerification}
            refetch={managerVerificationQuery.refetch}
          />
        )}

        {view === "revenue" && (
          <RevenuePanel
            summary={revenueSummaryQuery.data}
            byTeacher={revenueByTeacherQuery.data?.items ?? []}
            pagination={revenueByTeacherQuery.data?.pagination}
            isLoading={revenueSummaryQuery.isLoading || revenueByTeacherQuery.isLoading}
            isError={revenueSummaryQuery.isError || revenueByTeacherQuery.isError}
            page={revenuePage}
            setPage={setRevenuePage}
            search={revenueSearch}
            setSearch={setRevenueSearch}
            from={revenueFrom}
            setFrom={setRevenueFrom}
            to={revenueTo}
            setTo={setRevenueTo}
          />
        )}
      </main>

      <CommonModal
        open={noticeModal.open}
        title={noticeModal.title}
        message={noticeModal.message}
        variant={noticeModal.variant}
        showCancel={false}
        className="common-modal--dark"
        onClose={() => setNoticeModal({ open: false, title: "", message: "", variant: "info" })}
        onConfirm={() => setNoticeModal({ open: false, title: "", message: "", variant: "info" })}
      />

      <ConfirmModal
        open={logoutConfirmOpen}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản quản trị? Mọi phiên làm việc chưa lưu có thể bị mất."
        confirmText={loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        cancelText="Hủy"
        destructive
        className="common-modal--dark"
        onConfirm={handleLogoutConfirm}
        onClose={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
}

// ==================== Sub-components ====================

function UserRow({
  user,
  selected,
  onToggleSelected,
  onResetPassword,
  onChangeRole,
  onChangeStatus,
  onSoftDelete,
  onRestore,
}: {
  user: AdminUser;
  selected: boolean;
  onToggleSelected: (checked: boolean) => void;
  onResetPassword: () => void;
  onChangeRole: (role: RoleFilter) => void;
  onChangeStatus: (status: Exclude<StatusFilter, "all" | "deleted">) => void;
  onSoftDelete: () => void;
  onRestore: () => void;
}) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: "Hoạt động", className: "success" },
    pending: { label: "Chờ duyệt", className: "warning" },
    banned: { label: "Bị khóa", className: "error" },
    deleted: { label: "Đã xóa", className: "deleted" },
  };
  const config = statusConfig[user.status] || { label: user.status, className: "warning" };

  return (
    <tr>
      <td><input type="checkbox" checked={selected} onChange={(e) => onToggleSelected(e.target.checked)} disabled={user.status === "deleted"} /></td>
      <td>
        <div className="user-name">{user.full_name || user.email}</div>
        <div className="user-id">ID: {user.id}</div>
      </td>
      <td>{user.email}</td>
      <td>{getRoleDisplayLabel(user.role)}</td>
      <td><span className={`status-badge-text ${config.className}`}>{config.label}</span></td>
      <td>{user.last_login ? new Date(user.last_login).toLocaleString("vi-VN") : "—"}</td>
      <td>
        <div className="action-buttons">
          <button className="btn-small" onClick={onResetPassword} disabled={user.status === "deleted"}><Lock size={12} /></button>
          <select className="btn-small-select" value={user.role || "learner"} onChange={(e) => onChangeRole(e.target.value as RoleFilter)} disabled={user.status === "deleted"} style={{ width: 110 }}>
            <option value="learner">Học viên</option>
            <option value="course_manager">Giảng viên</option>
            <option value="admin">Quản trị viên</option>
          </select>
          {user.status !== "deleted" ? (
            <>
              <button className="btn-small" onClick={() => onChangeStatus("active")}>Mở</button>
              <button className="btn-small" onClick={() => onChangeStatus("banned")}>Khóa</button>
              <button className="btn-small btn-danger" onClick={onSoftDelete}>Xóa mềm</button>
            </>
          ) : (
            <button className="btn-small" onClick={onRestore}><UserRestore size={12} /> Khôi phục</button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AuditLogsPanel({
  data,
  pagination,
  isLoading,
  isError,
  page,
  setPage,
  actorId,
  setActorId,
  action,
  setAction,
  from,
  setFrom,
  to,
  setTo,
}: {
  data: AuditLogItem[];
  pagination: any;
  isLoading: boolean;
  isError: boolean;
  page: number;
  setPage: (n: number) => void;
  actorId: string;
  setActorId: (s: string) => void;
  action: string;
  setAction: (s: string) => void;
  from: string;
  setFrom: (s: string) => void;
  to: string;
  setTo: (s: string) => void;
}) {
  return (
    <div>
      <div className="filters-card">
        <div className="filters-row">
          <input className="filter-input" placeholder="ID người thao tác" value={actorId} onChange={(e) => { setPage(1); setActorId(e.target.value); }} style={{ width: 160 }} />
          <input className="filter-input" placeholder="Hành động" value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }} style={{ width: 240 }} />
          <input className="filter-input" type="datetime-local" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
          <input className="filter-input" type="datetime-local" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr><th>Thời gian</th><th>Người thao tác</th><th>Hành động</th><th>Đối tượng</th><th>Chi tiết</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="table-empty"><RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} /> Đang tải...</td></tr>}
            {isError && <tr><td colSpan={5} className="table-empty"><AlertCircle size={20} /> Không thể tải nhật ký hệ thống</td></tr>}
            {!isLoading && !isError && data.length === 0 && <tr><td colSpan={5} className="table-empty">Không có nhật ký nào</td></tr>}
            {data.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString("vi-VN")}</td>
                <td>#{l.actor_user_id}</td>
                <td>{l.action}</td>
                <td>{l.target_user_id ? `#${l.target_user_id}` : "—"}</td>
                <td><pre className="log-details">{JSON.stringify(l.metadata || {}, null, 2)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-buttons">
          <button className="btn-secondary" disabled={!pagination || page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>Trước</button>
          <button className="btn-secondary" disabled={!pagination || page >= (pagination?.pages ?? 1)} onClick={() => setPage(Math.min(pagination?.pages || 1, page + 1))}>Sau</button>
        </div>
        <div className="pagination-info">Trang {page} / {pagination?.pages ?? 1}</div>
      </div>
    </div>
  );
}

function KeysPanel({
  openRouterModelsInput,
  setOpenRouterModelsInput,
  openRouterDefaultModel,
  setOpenRouterDefaultModel,
  openRouterCooldownMinutes,
  setOpenRouterCooldownMinutes,
  openRouterSaving,
  openRouterMessage,
  saveOpenRouterConfig,
  newOpenRouterKeyLabel,
  setNewOpenRouterKeyLabel,
  newOpenRouterApiKey,
  setNewOpenRouterApiKey,
  createOpenRouterKey,
  keyHealthFilter,
  setKeyHealthFilter,
  filteredKeys,
  testingKeyId,
  testOpenRouterKey,
  toggleOpenRouterKeyActive,
  setOpenRouterKeyCooldown,
  clearOpenRouterKeyCooldown,
  deleteOpenRouterKey,
  activeAvailableKeys,
}: any) {
  const healthFilters = [
    { id: "all", label: "Tất cả" },
    { id: "healthy", label: "Ổn định" },
    { id: "limited", label: "Giới hạn" },
    { id: "auth_error", label: "Lỗi xác thực" },
    { id: "inactive", label: "Không hoạt động" },
  ];

  return (
    <div>
      <div className="config-section">
        <h3>🤖 Cấu hình OpenRouter</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label className="openrouter-config-label">Danh sách model (mỗi dòng 1 model)</label>
            <textarea className="form-textarea" rows={5} value={openRouterModelsInput} onChange={(e) => setOpenRouterModelsInput(e.target.value)} placeholder="openai/gpt-4o-mini&#10;anthropic/claude-3.5-sonnet" />
          </div>
          <div>
            <label className="openrouter-config-label">Model mặc định</label>
            <input className="filter-input" value={openRouterDefaultModel} onChange={(e) => setOpenRouterDefaultModel(e.target.value)} placeholder="openai/gpt-4o-mini" style={{ width: "100%" }} />
          </div>
          <div>
            <label className="openrouter-config-label">Số phút chờ khi key bị giới hạn</label>
            <input className="filter-input" type="number" min={1} value={openRouterCooldownMinutes} onChange={(e) => setOpenRouterCooldownMinutes(e.target.value)} style={{ width: 120 }} />
          </div>
          <div>
            <button className="btn-primary" onClick={saveOpenRouterConfig} disabled={openRouterSaving}>{openRouterSaving ? "Đang lưu..." : "Lưu cấu hình OpenRouter"}</button>
            {openRouterMessage && <div className="toast-message" style={{ marginTop: 8 }}>{openRouterMessage}</div>}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="keys-header">
          <h3 style={{ margin: 0 }}>Khóa API</h3>
          <div className="keys-count">Khóa hoạt động khả dụng: {activeAvailableKeys}</div>
        </div>

        <div className="filter-tags">
          {healthFilters.map((f) => (
            <button key={f.id} className={`filter-tag ${keyHealthFilter === f.id ? "active" : ""}`} onClick={() => setKeyHealthFilter(f.id as any)}>{f.label}</button>
          ))}
        </div>

        <div className="keys-list">
          <div className="key-card">
            <div style={{ display: "grid", gap: 8 }}>
              <input className="filter-input" placeholder="Nhãn (vd: key dự phòng #2)" value={newOpenRouterKeyLabel} onChange={(e) => setNewOpenRouterKeyLabel(e.target.value)} />
              <input className="filter-input" type="password" placeholder="Nhập khóa API OpenRouter" value={newOpenRouterApiKey} onChange={(e) => setNewOpenRouterApiKey(e.target.value)} />
              <button className="btn-primary" onClick={createOpenRouterKey} disabled={openRouterSaving}><Plus size={14} /> Thêm khóa</button>
            </div>
          </div>

          {filteredKeys.map((k: any) => {
            const healthStatus = getKeyHealthStatus(k);
            return (
              <div key={k.id} className="key-card">
                <div className="key-header">
                  <span className={`key-badge ${healthStatus}`}>{healthStatus.toUpperCase()}</span>
                  <span className="key-id">#{k.id}</span>
                  {k.label && <span className="key-label">{k.label}</span>}
                </div>
                <div className="key-details">
                  <code className="key-preview">{k.key_preview}</code>
                  <span style={{ fontSize: 12 }}>{k.is_active ? "hoạt động" : "không hoạt động"} · {k.is_available_now ? "khả dụng" : "đang chờ"}</span>
                </div>
                <div className="key-meta">
                  chờ đến: {k.cooldown_until ? new Date(k.cooldown_until).toLocaleString("vi-VN") : "—"}<br />
                  lỗi: {k.error_count} · dùng gần nhất: {k.last_used_at ? new Date(k.last_used_at).toLocaleString("vi-VN") : "—"}
                </div>
                <div className="key-actions">
                  <button className="btn-small" onClick={() => toggleOpenRouterKeyActive(k.id, !k.is_active)}>{k.is_active ? "Tắt" : "Bật"}</button>
                  <button className="btn-small" onClick={() => setOpenRouterKeyCooldown(k.id)}>Đặt thời gian chờ</button>
                  <button className="btn-small" onClick={() => clearOpenRouterKeyCooldown(k.id)}>Xóa thời gian chờ</button>
                  <button className="btn-small" onClick={() => testOpenRouterKey(k.id)} disabled={testingKeyId === k.id}>{testingKeyId === k.id ? "Đang kiểm tra..." : "Kiểm tra"}</button>
                  <button className="btn-small btn-danger" onClick={() => deleteOpenRouterKey(k.id)}>Xóa</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type CourseManagementPanelProps = {
  data: any[];
  pagination?: { page: number; limit: number; total: number; pages: number };
  isLoading: boolean;
  isError: boolean;
  page: number;
  setPage: (page: number) => void;
  q: string;
  setQ: (q: string) => void;
  status: CourseStatusFilter;
  setStatus: (status: CourseStatusFilter) => void;
  sortBy: "updated_at" | "created_at" | "title" | "learners_count";
  setSortBy: (sortBy: "updated_at" | "created_at" | "title" | "learners_count") => void;
  sortDir: "asc" | "desc";
  setSortDir: (sortDir: "asc" | "desc") => void;
};

function CourseManagementPanel({
  data,
  pagination,
  isLoading,
  isError,
  page,
  setPage,
  q,
  setQ,
  status,
  setStatus,
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
}: CourseManagementPanelProps) {
  const statusOptions: { value: CourseStatusFilter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "draft", label: "Bản nháp" },
    { value: "pending_review", label: "Chờ duyệt" },
    { value: "published", label: "Đã xuất bản" },
    { value: "archived", label: "Đã lưu trữ" },
  ];

  const sortOptions: { value: typeof sortBy; label: string }[] = [
    { value: "updated_at", label: "Cập nhật gần nhất" },
    { value: "created_at", label: "Ngày tạo" },
    { value: "title", label: "Tên khóa học" },
    { value: "learners_count", label: "Số học viên" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", background: "#e5e5e5", color: "#666" }}>Bản nháp</span>;
      case "pending_review":
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", background: "#fff3cd", color: "#856404" }}>Chờ duyệt</span>;
      case "published":
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", background: "#d4edda", color: "#155724" }}>Đã xuất bản</span>;
      case "archived":
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", background: "#f8d7da", color: "#721c24" }}>Đã lưu trữ</span>;
      default:
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "12px", background: "#e5e5e5", color: "#666" }}>{status}</span>;
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "16px" }}>Quản lý khóa học</h2>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc slug..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CourseStatusFilter)}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              minWidth: "150px",
            }}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              minWidth: "180px",
            }}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {sortDir === "asc" ? "↑ Tăng dần" : "↓ Giảm dần"}
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Đang tải...</div>
      ) : isError ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#dc3545" }}>Đã xảy ra lỗi khi tải dữ liệu</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Không có khóa học nào</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: 600 }}>STT</th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: 600 }}>Tên khóa học</th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: 600 }}>Trạng thái</th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: 600 }}>Người tạo</th>
                  <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Học viên</th>
                  <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Modules</th>
                  <th style={{ padding: "12px", textAlign: "center", fontWeight: 600 }}>Bài học</th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: 600 }}>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {data.map((course, index) => (
                  <tr key={course.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "12px" }}>{(page - 1) * 10 + index + 1}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 500 }}>{course.title}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>{course.slug}</div>
                    </td>
                    <td style={{ padding: "12px" }}>{getStatusBadge(course.status)}</td>
                    <td style={{ padding: "12px" }}>{course.creator_name || "N/A"}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{course.learners_count ?? 0}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{course.modules_count ?? 0}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{course.lessons_count ?? 0}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#666" }}>
                      {course.updated_at ? new Date(course.updated_at).toLocaleDateString("vi-VN") : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  background: page === 1 ? "#f5f5f5" : "#fff",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Trang trước
              </button>
              <span style={{ padding: "8px 16px", display: "flex", alignItems: "center" }}>
                Trang {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  background: page >= pagination.pages ? "#f5f5f5" : "#fff",
                  cursor: page >= pagination.pages ? "not-allowed" : "pointer",
                }}
              >
                Trang sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CourseReviewsPanel({
  data,
  pagination,
  isLoading,
  isError,
  page,
  setPage,
  q,
  setQ,
  status,
  setStatus,
  actionLoading,
  phaseByCourse,
  onReview,
  onViewTimeline,
  refetch,
}: {
  data: any[];
  pagination?: { page: number; limit: number; total: number; pages: number };
  isLoading: boolean;
  isError: boolean;
  page: number;
  setPage: (page: number) => void;
  q: string;
  setQ: (q: string) => void;
  status: "all" | "draft" | "pending_review" | "published" | "archived";
  setStatus: (status: "all" | "draft" | "pending_review" | "published" | "archived") => void;
  actionLoading: number | null;
  phaseByCourse: Record<number, string>;
  onReview: (course: any, decision: "approve" | "reject") => void;
  onViewTimeline: (course: any) => void;
  refetch: () => void;
}) {
  const navigate = useNavigate();

  const statusOptions: { value: typeof status; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "draft", label: "Bản nháp" },
    { value: "pending_review", label: "Chờ duyệt" },
    { value: "published", label: "Đã xuất bản" },
    { value: "archived", label: "Đã lưu trữ" },
  ];

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "draft":
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", background: "#e5e5e5", color: "#666" }}>Bản nháp</span>;
      case "pending_review":
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", background: "#fff3cd", color: "#856404" }}>Chờ duyệt</span>;
      case "published":
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", background: "#d4edda", color: "#155724" }}>Đã xuất bản</span>;
      case "archived":
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", background: "#f8d7da", color: "#721c24" }}>Đã lưu trữ</span>;
      default:
        return <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", background: "#e5e5e5", color: "#666" }}>{s}</span>;
    }
  };

  return (
    <div>
      <div className="filters-card">
        <div className="filters-row">
          <div style={{ flex: 1 }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                className="filter-input"
                placeholder="Tìm theo tiêu đề / slug..."
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
                style={{ paddingLeft: 36, width: "100%" }}
              />
            </div>
          </div>
          <select
            className="filter-select"
            value={status}
            onChange={(e) => { setPage(1); setStatus(e.target.value as typeof status); }}
            style={{ minWidth: 140 }}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => refetch()}><RefreshCw size={14} /> Tải lại</button>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Khóa học</th>
              <th>Trạng thái</th>
              <th>Danh mục</th>
              <th>Người tạo</th>
              <th>Học viên</th>
              <th>Bài học</th>
              <th>Cập nhật</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="table-empty">
                  <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} /> Đang tải...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="table-empty">
                  <AlertCircle size={20} /> Không thể tải danh sách
                </td>
              </tr>
            )}
            {!isLoading && !isError && data.length === 0 && (
              <tr>
                <td colSpan={8} className="table-empty">Không có khóa học nào</td>
              </tr>
            )}
            {data.map((course) => (
              <tr key={course.id}>
                <td>
                  <div className="user-name">{course.title}</div>
                  <div className="user-id">#{course.id} · /{course.slug}</div>
                </td>
                <td>{getStatusBadge(course.status)}</td>
                <td>{course.category || "—"}</td>
                <td>{course.creator_name || "—"}</td>
                <td style={{ textAlign: "center" }}>{course.learners_count ?? 0}</td>
                <td style={{ textAlign: "center" }}>{course.lessons_count ?? 0}</td>
                <td>{new Date(course.updated_at).toLocaleString("vi-VN")}</td>
                <td>
                  <div className="action-buttons">
                    {course.status === "pending_review" && (
                      <>
                        <button
                          className="btn-small"
                          onClick={() => onReview(course, "approve")}
                          disabled={actionLoading === course.id}
                          style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a" }}
                        >
                          <Check size={12} /> Duyệt
                        </button>
                        <button
                          className="btn-small btn-danger"
                          onClick={() => onReview(course, "reject")}
                          disabled={actionLoading === course.id}
                        >
                          <X size={12} /> Từ chối
                        </button>
                      </>
                    )}
                    <button
                      className="btn-small"
                      onClick={() => onViewTimeline(course)}
                    >
                      Lịch sử
                    </button>
                    <button
                      className="btn-small"
                      onClick={() => navigate(`/admin/courses/${course.id}/content-review`)}
                    >
                      Chi tiết
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-buttons">
          <button className="btn-secondary" disabled={!pagination || page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>Trước</button>
          <button className="btn-secondary" disabled={!pagination || page >= (pagination?.pages ?? 1)} onClick={() => setPage(Math.min(pagination?.pages || 1, page + 1))}>Sau</button>
        </div>
        <div className="pagination-info">Trang {page} / {pagination?.pages ?? 1}</div>
      </div>
    </div>
  );
}

type LessonResourceReviewsPanelProps = {
  data: PendingLessonResource[];
  pagination?: { page: number; limit: number; total: number; pages: number };
  isLoading: boolean;
  isError: boolean;
  page: number;
  setPage: (page: number) => void;
  q: string;
  setQ: (q: string) => void;
  kind: "all" | "pdf" | "word" | "video" | "youtube" | "other";
  setKind: (kind: "all" | "pdf" | "word" | "video" | "youtube" | "other") => void;
  actionLoading: number | null;
  phaseByResource: Record<number, string>;
  onReview: (resource: PendingLessonResource, decision: "approve" | "reject") => void;
  onViewTimeline: (resource: PendingLessonResource) => void;
  refetch: () => void;
};

function LessonResourceReviewsPanel({
  data,
  pagination,
  isLoading,
  isError,
  page,
  setPage,
  q,
  setQ,
  kind,
  setKind,
  actionLoading,
  phaseByResource,
  onReview,
  onViewTimeline,
  refetch,
}: LessonResourceReviewsPanelProps) {
  const { accessToken: token } = useAuth();
  const [selectedResource, setSelectedResource] = useState<PendingLessonResource | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewExternalUrl, setPreviewExternalUrl] = useState<string | null>(null);
  const [previewViewUrl, setPreviewViewUrl] = useState<string | null>(null);
  const [previewedIds, setPreviewedIds] = useState<number[]>([]);

  const releasePreviewBlob = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
  };

  const kindLabels: Record<string, string> = {
    pdf: "PDF",
    word: "Word",
    video: "Video",
    youtube: "YouTube",
    other: "Khác",
  };

  const getKindBadge = (k: string) => {
    const colors: Record<string, string> = {
      pdf: "#e74c3c",
      word: "#2980b9",
      video: "#8e44ad",
      youtube: "#c0392b",
      other: "#7f8c8d",
    };
    return (
      <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "11px", background: colors[k] || "#7f8c8d", color: "#fff" }}>
        {kindLabels[k] || k}
      </span>
    );
  };

  const getFileExt = (name?: string) => {
    const raw = String(name || "").trim().toLowerCase();
    const idx = raw.lastIndexOf(".");
    if (idx < 0) return "";
    return raw.slice(idx + 1);
  };

  const getPreviewModeByExt = (ext: string): "blob" | "office_viewer" | "unsupported" => {
    if (!ext) return "blob";
    if (["pdf", "png", "jpg", "jpeg", "gif", "webp", "txt", "csv", "mp4", "webm", "mp3", "wav"].includes(ext)) {
      return "blob";
    }
    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
      return "office_viewer";
    }
    if (["zip", "rar", "7z"].includes(ext)) {
      return "unsupported";
    }
    return "blob";
  };

  const getYoutubeEmbedUrl = (input: string): string => {
    const raw = String(input || "").trim();
    if (!raw) return "";
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
      if (host === "youtu.be") {
        const id = parsed.pathname.split("/").filter(Boolean)[0] || "";
        return id ? `https://www.youtube.com/embed/${id}` : raw;
      }
      if (host === "youtube.com" || host.endsWith(".youtube.com")) {
        const fromQuery = parsed.searchParams.get("v");
        if (fromQuery) return `https://www.youtube.com/embed/${fromQuery}`;
        const parts = parsed.pathname.split("/").filter(Boolean);
        const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
        if (idx >= 0 && parts[idx + 1]) {
          return `https://www.youtube.com/embed/${parts[idx + 1]}`;
        }
      }
      return raw;
    } catch {
      return raw;
    }
  };

  const isYoutubeUrl = (input: string): boolean => {
    const raw = String(input || "").toLowerCase();
    return raw.includes("youtube.com") || raw.includes("youtu.be");
  };

  // Open preview via API (similar to AdminCourseContentReviewPage)
  const openPreview = async (resource: PendingLessonResource) => {
    releasePreviewBlob();
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewBlobUrl(null);
    setPreviewExternalUrl(null);
    setPreviewViewUrl(null);

    const resourceUrl = resource.url;
    const lowerUrl = resourceUrl.toLowerCase();

    // Handle internal:// URLs specially (assignment descriptions)
    if (lowerUrl.startsWith('internal://')) {
      setPreviewError("Tài nguyên này là nội dung assignment. Vui lòng xem chi tiết trong trang quản lý khóa học.");
      setPreviewLoading(false);
      setPreviewedIds((prev) => (prev.includes(resource.id) ? prev : [...prev, resource.id]));
      return;
    }

    // Handle YouTube URLs
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      setPreviewViewUrl(resourceUrl);
      setPreviewLoading(false);
      setPreviewedIds((prev) => (prev.includes(resource.id) ? prev : [...prev, resource.id]));
      return;
    }

    try {
      const res = await fetch(`${url}${COURSES_API.viewLessonResource(resource.course_id, resource.id)}`, {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || "Không thể mở nội dung.");
      }
      const contentType = String(res.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const json = await res.json().catch(() => ({}));
        const viewUrl = String((json as any)?.url || "");
        if (!viewUrl) throw new Error("Không nhận được URL xem nội dung.");
        const ext = getFileExt(resource.filename || viewUrl);
        const mode = getPreviewModeByExt(ext);
        if (mode === "office_viewer") {
          setPreviewExternalUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewUrl)}`);
        } else {
          setPreviewViewUrl(viewUrl);
        }
      } else {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(blobUrl);
      }
      setPreviewedIds((prev) => (prev.includes(resource.id) ? prev : [...prev, resource.id]));
    } catch (e: any) {
      setPreviewError(e?.message || "Không thể mở nội dung.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const clearPreview = () => {
    releasePreviewBlob();
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewBlobUrl(null);
    setPreviewExternalUrl(null);
    setPreviewViewUrl(null);
  };

  // Render preview based on resource type (for list view thumbnail)
  const renderResourcePreview = (resource: PendingLessonResource) => {
    const kind = resource.resource_kind;

    if (kind === "youtube") {
      const videoId = resource.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1];
      if (videoId) {
        return (
          <div style={{ marginTop: 8 }}>
            <img
              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
              alt="YouTube thumbnail"
              style={{ width: 160, height: 90, objectFit: "cover", borderRadius: 6 }}
            />
          </div>
        );
      }
    }
    return null;
  };

  // Render the actual preview content
  const renderPreviewContent = () => {
    if (previewLoading) {
      return <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Đang tải nội dung...</div>;
    }
    if (previewError) {
      return <div style={{ padding: 20, color: "#dc2626" }}>{previewError}</div>;
    }
    if (previewExternalUrl) {
      return (
        <iframe
          src={previewExternalUrl}
          title="resource-preview-external"
          style={{ width: "100%", height: 600, border: "1px solid #e2e8f0", borderRadius: 8 }}
        />
      );
    }
    const resourceUrl = selectedResource?.url || "";
    const isYoutube = resourceUrl.toLowerCase().includes('youtube.com') || resourceUrl.toLowerCase().includes('youtu.be');
    if (isYoutube || selectedResource?.resource_kind === "youtube") {
      return (
        <iframe
          src={getYoutubeEmbedUrl(previewViewUrl || resourceUrl)}
          title="youtube-preview"
          style={{ width: "100%", height: 400, border: "none", borderRadius: 8 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      );
    }
    if (selectedResource?.resource_kind === "video") {
      return (
        <video controls style={{ width: "100%", maxHeight: 500, borderRadius: 8 }}>
          <source src={previewBlobUrl || previewViewUrl || ""} type={selectedResource.mime_type || "video/mp4"} />
          Trình duyệt không hỗ trợ video.
        </video>
      );
    }
    if (previewBlobUrl) {
      return (
        <iframe
          src={previewBlobUrl}
          title="resource-preview"
          style={{ width: "100%", height: 600, border: "1px solid #e2e8f0", borderRadius: 8 }}
        />
      );
    }
    if (previewViewUrl) {
      return (
        <iframe
          src={previewViewUrl}
          title="resource-preview"
          style={{ width: "100%", height: 600, border: "1px solid #e2e8f0", borderRadius: 8 }}
        />
      );
    }
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
        <a href={selectedResource?.url} target="_blank" rel="noreferrer" style={{ color: "#3498db" }}>
          Mở tài nguyên
        </a>
      </div>
    );
  };

  // Open detail view with preview
  const openDetailView = async (resource: PendingLessonResource) => {
    setSelectedResource(resource);
    clearPreview();
    await openPreview(resource);
  };

  const closeDetailView = () => {
    setSelectedResource(null);
    clearPreview();
  };

  const canApprove = (resource: PendingLessonResource) => {
    return previewedIds.includes(resource.id);
  };

  // Detail View
  if (selectedResource) {
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>
            Duyệt bài học &gt; {selectedResource.filename || "Tài nguyên không tên"}
          </div>
          <button className="btn-secondary" onClick={closeDetailView}>
            Quay lại danh sách
          </button>
        </div>

        {/* Context Info */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Khóa học</div>
            <div style={{ fontWeight: 600 }}>{selectedResource.course_title}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>#{selectedResource.course_id}</div>
          </div>
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Bài học</div>
            <div style={{ fontWeight: 600 }}>{selectedResource.lesson_title}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>#{selectedResource.lesson_id}</div>
          </div>
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Loại tài nguyên</div>
            <div>{getKindBadge(selectedResource.resource_kind)}</div>
          </div>
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Ngày tải lên</div>
            <div style={{ fontWeight: 500 }}>{new Date(selectedResource.created_at).toLocaleString("vi-VN")}</div>
          </div>
        </div>

        {/* Resource Info */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 12 }}>Thông tin tài nguyên</h4>
          <div style={{ padding: 16, background: "#f8fafc", borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Tên file:</strong> {selectedResource.filename || "Không có tên"}
            </div>
            <div style={{ marginBottom: 8, wordBreak: "break-all" }}>
              <strong>URL:</strong>{" "}
              <a href={selectedResource.url} target="_blank" rel="noreferrer" style={{ color: "#3498db" }}>
                {selectedResource.url}
              </a>
            </div>
            {selectedResource.is_resubmitted && (
              <div style={{ color: "#e67e22", fontWeight: 500, marginBottom: 8 }}>
                ↻ Đây là bản gửi lại sau khi bị từ chối
              </div>
            )}
          </div>
        </div>

        {/* Previous Rejection Reason */}
        {selectedResource.previous_rejected_reason && (
          <div style={{ marginBottom: 20, padding: 16, background: "#fef3cd", borderRadius: 8, borderLeft: "4px solid #e67e22" }}>
            <div style={{ fontWeight: 600, color: "#856404", marginBottom: 8 }}>Lý do từ chối trước đó:</div>
            <div style={{ color: "#856404" }}>{selectedResource.previous_rejected_reason}</div>
          </div>
        )}

        {/* Preview */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>Xem trước nội dung</h4>
            <div style={{ display: "flex", gap: 8 }}>
              {!previewedIds.includes(selectedResource.id) && !previewLoading && (
                <span style={{ fontSize: 12, color: "#b45309", background: "#fef3cd", padding: "4px 8px", borderRadius: 4 }}>
                  Chưa xem nội dung
                </span>
              )}
              {previewedIds.includes(selectedResource.id) && (
                <span style={{ fontSize: 12, color: "#166534", background: "#dcfce7", padding: "4px 8px", borderRadius: 4 }}>
                  ✓ Đã xem
                </span>
              )}
            </div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, minHeight: 400 }}>
            {renderPreviewContent()}
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="btn-secondary" onClick={() => openPreview(selectedResource)} disabled={previewLoading}>
              <RefreshCw size={14} style={{ animation: previewLoading ? "spin 1s linear infinite" : undefined }} /> Tải lại preview
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
          <button
            className="btn-secondary"
            onClick={() => onViewTimeline(selectedResource)}
          >
            <Clock size={14} /> Xem lịch sử
          </button>
          <button
            className="btn-small btn-danger"
            onClick={() => {
              setRejectReason(selectedResource.previous_rejected_reason || "");
              setShowRejectModal(true);
            }}
            disabled={actionLoading === selectedResource.id}
          >
            <XCircle size={14} /> Từ chối
          </button>
          <button
            className="btn-small"
            onClick={() => onReview(selectedResource, "approve")}
            disabled={actionLoading === selectedResource.id || !canApprove(selectedResource)}
            style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a", opacity: canApprove(selectedResource) ? 1 : 0.5 }}
            title={!canApprove(selectedResource) ? "Cần xem nội dung trước khi duyệt" : ""}
          >
            <Check size={14} /> Duyệt
          </button>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 500, width: "90%" }}>
              <h3 style={{ marginBottom: 16 }}>Lý do từ chối</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối bài học này..."
                rows={4}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  resize: "vertical"
                }}
              />
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                >
                  Hủy
                </button>
                <button
                  className="btn-small btn-danger"
                  onClick={() => {
                    onReview(selectedResource, "reject");
                    setShowRejectModal(false);
                    setSelectedResource(null);
                  }}
                  disabled={!rejectReason.trim()}
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div>
      <div className="filters-card">
        <div className="filters-row">
          <div style={{ flex: 1 }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                className="filter-input"
                placeholder="Tìm theo tên file, khóa học, bài học..."
                value={q}
                onChange={(e) => { setPage(1); setQ(e.target.value); }}
                style={{ paddingLeft: 36, width: "100%" }}
              />
            </div>
          </div>
          <select
            className="filter-select"
            value={kind}
            onChange={(e) => { setPage(1); setKind(e.target.value as typeof kind); }}
            style={{ minWidth: 120 }}
          >
            <option value="all">Tất cả loại</option>
            <option value="pdf">PDF</option>
            <option value="word">Word</option>
            <option value="video">Video</option>
            <option value="youtube">YouTube</option>
            <option value="other">Khác</option>
          </select>
          <button className="btn-secondary" onClick={() => refetch()}><RefreshCw size={14} /> Tải lại</button>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Khóa học</th>
              <th>Bài học</th>
              <th>Tài nguyên</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Ngày tải lên</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="table-empty">
                  <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} /> Đang tải...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="table-empty">
                  <AlertCircle size={20} /> Không thể tải danh sách
                </td>
              </tr>
            )}
            {!isLoading && !isError && data.length === 0 && (
              <tr>
                <td colSpan={7} className="table-empty">Không có tài nguyên nào chờ duyệt</td>
              </tr>
            )}
            {data.map((resource) => (
              <tr key={resource.id}>
                <td>
                  <div className="user-name">{resource.course_title}</div>
                  <div className="user-id">#{resource.course_id}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{resource.lesson_title}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>#{resource.lesson_id}</div>
                </td>
                <td style={{ maxWidth: 250 }}>
                  <div style={{ fontWeight: 500, wordBreak: "break-all" }}>
                    {resource.filename || "Không có tên file"}
                  </div>
                  <div style={{ fontSize: 11, color: "#666", wordBreak: "break-all" }}>
                    {resource.url.length > 60 ? resource.url.slice(0, 60) + "..." : resource.url}
                  </div>
                  {resource.is_resubmitted && (
                    <span style={{ fontSize: 11, color: "#e67e22", marginTop: 4, display: "inline-block" }}>
                      ↻ Gửi lại
                    </span>
                  )}
                  {resource.previous_rejected_reason && (
                    <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 4 }}>
                      Lý do từ chối trước: {resource.previous_rejected_reason}
                    </div>
                  )}
                  {renderResourcePreview(resource)}
                </td>
                <td>{getKindBadge(resource.resource_kind)}</td>
                <td>
                  {phaseByResource?.[resource.id] ? (
                    <span className="status-badge-text warning">{phaseByResource[resource.id]}</span>
                  ) : (
                    <span className="status-badge-text warning">Chờ duyệt</span>
                  )}
                </td>
                <td>{new Date(resource.created_at).toLocaleString("vi-VN")}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-small"
                      onClick={() => openDetailView(resource)}
                      style={{ background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" }}
                    >
                      <FileSearch size={12} /> Xem chi tiết
                    </button>
                    <button
                      className="btn-small"
                      onClick={() => onViewTimeline(resource)}
                    >
                      <Clock size={12} /> Lịch sử
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-buttons">
          <button className="btn-secondary" disabled={!pagination || page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>Trước</button>
          <button className="btn-secondary" disabled={!pagination || page >= (pagination?.pages ?? 1)} onClick={() => setPage(Math.min(pagination?.pages || 1, page + 1))}>Sau</button>
        </div>
        <div className="pagination-info">Trang {page} / {pagination?.pages ?? 1}</div>
      </div>
    </div>
  );
}

function ManagerVerificationsPanel({
  data,
  pagination,
  isLoading,
  isError,
  page,
  setPage,
  q,
  setQ,
  status,
  setStatus,
  actionLoading,
  onReview,
  refetch,
}: any) {
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);
  const formatStatusLabel = (value: string) => {
    if (value === "pending") return "Chờ duyệt";
    if (value === "verified") return "Đã xác minh";
    if (value === "rejected") return "Từ chối";
    if (value === "suspended") return "Tạm khóa";
    return value;
  };
  const splitLinks = (value?: string | null) =>
    String(value || "")
      .split(/\r?\n|,/g)
      .map((item) => item.trim())
      .filter(Boolean);

  return (
    <div>
      <div className="filters-card">
        <div className="filters-row">
          <div style={{ flex: 1 }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input className="filter-input" placeholder="Tìm theo email / họ tên" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} style={{ paddingLeft: 36, width: "100%" }} />
            </div>
          </div>
          <select className="filter-select" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} style={{ minWidth: 80, width: "auto", textAlign: "center" }}>
            <option value="all">Tất cả</option>
            <option value="pending">Chờ duyệt</option>
            <option value="verified">Đã xác minh</option>
            <option value="rejected">Từ chối</option>
            <option value="suspended">Tạm khóa</option>
          </select>
          <button className="btn-secondary" onClick={() => refetch()}><RefreshCw size={14} /> Tải lại</button>
        </div>
      </div>

      {selectedVerification ? (
        <div className="panel" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>
              Xác minh giảng viên &gt; {selectedVerification.email}
            </div>
            <button className="btn-secondary" onClick={() => setSelectedVerification(null)}>
              Quay lại danh sách
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div><strong>Họ tên:</strong> {selectedVerification.full_name || "—"}</div>
            <div><strong>Email:</strong> {selectedVerification.email}</div>
            <div><strong>Trạng thái:</strong> {formatStatusLabel(selectedVerification.status)}</div>
            <div><strong>Checklist:</strong> {selectedVerification.checklist_passed ? "Đạt" : "Chưa đạt"}</div>
            <div><strong>Chuyên môn:</strong> {selectedVerification.expertise_areas || "—"}</div>
            <div><strong>Kinh nghiệm:</strong> {selectedVerification.years_experience != null ? `${selectedVerification.years_experience} năm` : "—"}</div>
            <div><strong>Đơn vị:</strong> {selectedVerification.organization_name || "—"}</div>
            <div><strong>Tóm tắt hồ sơ:</strong> {selectedVerification.application_note || "—"}</div>
            <div><strong>Triết lý giảng dạy:</strong> {selectedVerification.teaching_statement || "—"}</div>
            <div><strong>Ghi chú duyệt:</strong> {selectedVerification.review_note || "—"}</div>
            <div><strong>Cập nhật:</strong> {new Date(selectedVerification.updated_at).toLocaleString("vi-VN")}</div>
            <div>
              <strong>Portfolio:</strong>{" "}
              {selectedVerification.portfolio_url ? (
                <a href={selectedVerification.portfolio_url} target="_blank" rel="noreferrer">
                  {selectedVerification.portfolio_url}
                </a>
              ) : (
                "—"
              )}
            </div>
            <div>
              <strong>Liên kết chứng chỉ:</strong>
              {splitLinks(selectedVerification.certificate_links).length ? (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {splitLinks(selectedVerification.certificate_links).map((link) => (
                    <li key={link}>
                      <a href={link} target="_blank" rel="noreferrer">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <span> —</span>
              )}
            </div>
          </div>

          <div className="action-buttons" style={{ marginTop: 16 }}>
            <button className="btn-small" onClick={() => onReview(selectedVerification, "verified")} disabled={actionLoading === selectedVerification.user_id}>Xác minh</button>
            <button className="btn-small btn-danger" onClick={() => onReview(selectedVerification, "rejected")} disabled={actionLoading === selectedVerification.user_id}>Từ chối</button>
            <button className="btn-small" onClick={() => onReview(selectedVerification, "suspended")} disabled={actionLoading === selectedVerification.user_id}>Tạm khóa</button>
          </div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Người dùng</th><th>Trạng thái</th><th>Hồ sơ năng lực</th><th>Cập nhật</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={5} className="table-empty"><RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} /> Đang tải...</td></tr>}
                {isError && <tr><td colSpan={5} className="table-empty"><AlertCircle size={20} /> Không thể tải danh sách</td></tr>}
                {!isLoading && !isError && data.length === 0 && <tr><td colSpan={5} className="table-empty">Không có dữ liệu xác minh</td></tr>}
                {data.map((item: any) => (
                  <tr key={item.user_id}>
                    <td><div className="user-name">{item.full_name || "—"}</div><div className="user-id">{item.email} (#{item.user_id})</div></td>
                    <td>
                      <span className={`status-badge-text ${item.status === "verified" ? "success" : item.status === "pending" ? "warning" : "error"}`}>{formatStatusLabel(item.status)}</span>
                      <div style={{ fontSize: 11, marginTop: 4, color: item.checklist_passed ? "#16a34a" : "#b45309" }}>{item.checklist_passed ? "Checklist đạt" : "Checklist chưa đạt"}</div>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div><strong>Chuyên môn:</strong> {item.expertise_areas || "—"}</div>
                      <div><strong>Kinh nghiệm:</strong> {item.years_experience != null ? `${item.years_experience} năm` : "—"}</div>
                      <div><strong>Đơn vị:</strong> {item.organization_name || "—"}</div>
                      {item.review_note && <div><strong>Ghi chú:</strong> {item.review_note}</div>}
                    </td>
                    <td>{new Date(item.updated_at).toLocaleString("vi-VN")}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-small" onClick={() => setSelectedVerification(item)}>Xem chi tiết</button>
                        <button className="btn-small" onClick={() => onReview(item, "verified")} disabled={actionLoading === item.user_id}>Xác minh</button>
                        <button className="btn-small btn-danger" onClick={() => onReview(item, "rejected")} disabled={actionLoading === item.user_id}>Từ chối</button>
                        <button className="btn-small" onClick={() => onReview(item, "suspended")} disabled={actionLoading === item.user_id}>Tạm khóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <div className="pagination-buttons">
              <button className="btn-secondary" disabled={!pagination || page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>Trước</button>
              <button className="btn-secondary" disabled={!pagination || page >= (pagination?.pages ?? 1)} onClick={() => setPage(Math.min(pagination?.pages || 1, page + 1))}>Sau</button>
            </div>
            <div className="pagination-info">Trang {page} / {pagination?.pages ?? 1}</div>
          </div>
        </>
      )}
    </div>
  );
}

function RevenuePanel({
  summary,
  byTeacher,
  pagination,
  isLoading,
  isError,
  page,
  setPage,
  search,
  setSearch,
  from,
  setFrom,
  to,
  setTo,
}: {
  summary?: AdminRevenueSummary;
  byTeacher: AdminRevenueByTeacherItem[];
  pagination: any;
  isLoading: boolean;
  isError: boolean;
  page: number;
  setPage: (n: number) => void;
  search: string;
  setSearch: (s: string) => void;
  from: string;
  setFrom: (s: string) => void;
  to: string;
  setTo: (s: string) => void;
}) {
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Doanh thu gộp</div>
          <div className="stat-value">{formatMoney(summary?.gross_amount ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Phí hệ thống</div>
          <div className="stat-value">{formatMoney(summary?.system_fee_amount ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Doanh thu giảng viên</div>
          <div className="stat-value">{formatMoney(summary?.teacher_net_amount ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Đơn hàng thành công / hoàn tiền</div>
          <div className="stat-value">
            {(summary?.paid_orders ?? 0).toLocaleString()} / {(summary?.refunded_orders ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="filters-card">
        <div className="filters-row">
          <input
            className="filter-input"
            placeholder="Tìm theo tên/email/ID giảng viên..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            style={{ minWidth: 260 }}
          />
          <input className="filter-input" type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} />
          <input className="filter-input" type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} />
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Giảng viên</th>
              <th>Doanh thu gộp</th>
              <th>Phí hệ thống</th>
              <th>Doanh thu ròng</th>
              <th>Paid / Refund</th>
              <th>Ghi nhận gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="table-empty"><RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} /> Đang tải dữ liệu doanh thu...</td></tr>}
            {isError && !isLoading && <tr><td colSpan={6} className="table-empty"><AlertCircle size={20} /> Không thể tải dữ liệu doanh thu</td></tr>}
            {!isLoading && !isError && byTeacher.length === 0 && <tr><td colSpan={6} className="table-empty">Không có dữ liệu đối soát</td></tr>}
            {byTeacher.map((item) => (
              <tr key={item.teacher_user_id}>
                <td>
                  <div className="user-name">{item.teacher_name || "Chưa cập nhật tên"}</div>
                  <div className="user-id">{item.teacher_email || "—"} (#{item.teacher_user_id})</div>
                </td>
                <td>{formatMoney(item.gross_amount)}</td>
                <td>{formatMoney(item.system_fee_amount)}</td>
                <td>{formatMoney(item.teacher_net_amount)}</td>
                <td>{item.paid_orders.toLocaleString()} / {item.refunded_orders.toLocaleString()}</td>
                <td>{formatDateTime(item.last_recognized_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-buttons">
          <button className="btn-secondary" disabled={!pagination || page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>Trước</button>
          <button className="btn-secondary" disabled={!pagination || page >= (pagination?.pages ?? 1)} onClick={() => setPage(Math.min(pagination?.pages || 1, page + 1))}>Sau</button>
        </div>
        <div className="pagination-info">Trang {page} / {pagination?.pages ?? 1}</div>
      </div>
    </div>
  );
}

// ==================== Helper Functions ====================

function getAdminTierFromUser(user: any): AdminTier {
  const roles: string[] = [user?.primary_role, ...(Array.isArray(user?.roles) ? user.roles : [])].filter(Boolean).map((r: string) => String(r).toLowerCase());
  return roles.includes("admin") ? "admin" : "non_admin";
}

function can(tier: AdminTier, action: string): boolean {
  if (tier !== "admin") return false;
  return action !== "hard_delete";
}

function getRoleDisplayLabel(role?: string | null): string {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "learner" || normalizedRole === "student") return "Học viên";
  if (normalizedRole === "course_manager" || normalizedRole === "teacher") return "Giảng viên";
  if (normalizedRole === "admin") return "Quản trị viên";
  return role ? String(role) : "Không xác định";
}

function normalize(s: string): string {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function fuzzyMatch(hay: string, needle: string): boolean {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) {
    if (hay[j] === needle[i]) i++;
  }
  return i === needle.length;
}

function toCsv(rows: Array<Record<string, any>>): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function getKeyHealthStatus(key: { is_active: boolean; is_available_now: boolean; last_test_status: string | null }): string {
  if (!key.is_active) return "inactive";
  if (key.last_test_status === "unauthorized") return "auth_error";
  if (key.last_test_status === "rate_limited" || !key.is_available_now) return "limited";
  if (key.last_test_status === "ok") return "healthy";
  return "unknown";
}

function formatMoney(value: number): string {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
}