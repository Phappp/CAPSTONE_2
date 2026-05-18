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
} from "lucide-react";
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
  AdminRevenueByTeacherItem,
  AdminRevenueSummary,
  AuditLogItem,
  CourseManagerVerification,
  PendingReviewCourse,
} from "../../services/adminUsersClient";
import "./AdminDashboard.css";
import transLogo from "../../assets/trans-logo-2.png";

type RoleFilter = "all" | "learner" | "course_manager" | "admin";
type StatusFilter = "all" | "active" | "pending" | "banned" | "deleted";
type AdminView = "users" | "audit_logs" | "keys" | "course_reviews" | "manager_verifications" | "revenue";
type AdminTier = "admin" | "non_admin";

const VIEW_CONFIG: Record<AdminView, { label: string; icon: React.ReactNode; description: string }> = {
  users: { label: "Quản lý người dùng", icon: <Users size={18} />, description: "Quản lý tất cả người dùng trong hệ thống" },
  audit_logs: { label: "Nhật ký hệ thống", icon: <FileText size={18} />, description: "Xem lịch sử hoạt động hệ thống" },
  keys: { label: "Khóa API", icon: <Key size={18} />, description: "Quản lý khóa API OpenRouter" },
  course_reviews: { label: "Duyệt khóa học", icon: <BookOpen size={18} />, description: "Duyệt khóa học chờ xuất bản" },
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
  const [reviewActionLoading, setReviewActionLoading] = useState<number | null>(null);
  const [reviewPhaseByCourse, setReviewPhaseByCourse] = useState<Record<number, string>>({});

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

  const openRouterQuery = useQuery({
    queryKey: ["admin-openrouter-config"],
    queryFn: () => apiGetOpenRouterConfig({ accessToken: accessToken || "" }),
    enabled: !!accessToken && view === "keys",
  });

  const pendingReviewQuery = useQuery({
    queryKey: ["admin-course-pending-review", { reviewPage, reviewQ }],
    queryFn: () =>
      apiGetPendingReviewCourses({
        accessToken: accessToken || "",
        page: reviewPage,
        pageSize: 10,
        q: reviewQ || undefined,
      }),
    enabled: !!accessToken && view === "course_reviews",
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
            actionLoading={reviewActionLoading}
            phaseByCourse={reviewPhaseByCourse}
            onReview={reviewCourse}
            onViewTimeline={viewReviewTimeline}
            refetch={pendingReviewQuery.refetch}
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

function CourseReviewsPanel({
  data,
  pagination,
  isLoading,
  isError,
  page,
  setPage,
  q,
  setQ,
  actionLoading,
  phaseByCourse,
  onReview,
  onViewTimeline,
  refetch,
}: any) {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState<PendingReviewCourse | null>(null);

  if (selectedCourse) {
    const qualityGateReady = Boolean(selectedCourse.quality_gate?.ready);
    const qualityGateIssues = selectedCourse.quality_gate?.issues?.length
      ? selectedCourse.quality_gate.issues.join(" | ")
      : "Không có lỗi";

    return (
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>
            Duyệt khóa học &gt; {selectedCourse.title} (#{selectedCourse.id})
          </div>
          <button className="btn-secondary" onClick={() => setSelectedCourse(null)}>
            Quay lại danh sách
          </button>
        </div>

        <div className="course-review-detail-grid">
          <div className="course-review-detail-card">
            <div className="course-review-detail-label">Slug</div>
            <div className="course-review-detail-value">/{selectedCourse.slug}</div>
          </div>
          <div className="course-review-detail-card">
            <div className="course-review-detail-label">Danh mục</div>
            <div className="course-review-detail-value">{selectedCourse.category || "—"}</div>
          </div>
          <div className="course-review-detail-card">
            <div className="course-review-detail-label">Cập nhật</div>
            <div className="course-review-detail-value">{new Date(selectedCourse.updated_at).toLocaleString("vi-VN")}</div>
          </div>
          <div className="course-review-detail-card">
            <div className="course-review-detail-label">Chất lượng</div>
            <div className={`course-review-detail-value ${qualityGateReady ? "quality-pass" : "quality-warn"}`}>
              {qualityGateReady ? "Đạt" : "Chưa đạt"}
            </div>
          </div>
          <div className="course-review-detail-card course-review-detail-card-wide">
            <div className="course-review-detail-label">Mô tả ngắn</div>
            <div className="course-review-detail-value">{selectedCourse.short_description || "—"}</div>
          </div>
          <div className="course-review-detail-card course-review-detail-card-wide">
            <div className="course-review-detail-label">Ghi chú kiểm tra chất lượng</div>
            <div className="course-review-detail-value">{qualityGateIssues}</div>
          </div>
        </div>

        <div className="action-buttons">
          <button
            className="btn-small"
            onClick={() => navigate(`/admin/courses/${selectedCourse.id}/content-review`)}
          >
            Duyệt nội dung
          </button>
          <button className="btn-small" onClick={() => onViewTimeline(selectedCourse)}>
            Lịch sử
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="filters-card">
        <div className="filters-row">
          <div style={{ flex: 1 }}>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input className="filter-input" placeholder="Tìm theo tiêu đề / slug" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} style={{ paddingLeft: 36, width: "100%" }} />
            </div>
          </div>
          <button className="btn-secondary" onClick={() => refetch()}><RefreshCw size={14} /> Tải lại</button>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr><th>Khóa học</th><th>Danh mục</th><th>Slug</th><th>Kiểm tra chất lượng</th><th>Phase</th><th>Cập nhật</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="table-empty"><RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} /> Đang tải...</td></tr>}
            {isError && <tr><td colSpan={7} className="table-empty"><AlertCircle size={20} /> Không thể tải danh sách</td></tr>}
            {!isLoading && !isError && data.length === 0 && <tr><td colSpan={7} className="table-empty">Không có khóa học nào chờ duyệt</td></tr>}
            {data.map((course: any) => (
              <tr key={course.id}>
                <td><div className="user-name">{course.title}</div><div className="user-id">#{course.id}</div></td>
                <td>{course.category || "—"}</td>
                <td>/{course.slug}</td>
                <td>{course.quality_gate?.ready ? <Check size={16} style={{ color: "#16a34a" }} /> : <AlertCircle size={16} style={{ color: "#b45309" }} />}</td>
                <td>
                  {phaseByCourse?.[course.id] ? (
                    <span className="status-badge-text warning">{phaseByCourse[course.id]}</span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>—</span>
                  )}
                </td>
                <td>{new Date(course.updated_at).toLocaleString("vi-VN")}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-small" onClick={() => setSelectedCourse(course)}>
                      Tiến hành duyệt
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