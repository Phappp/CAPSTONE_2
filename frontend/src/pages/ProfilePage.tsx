import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle2, Copy, House, Trash2, TriangleAlert, Upload } from "lucide-react";
import AvatarMenu from "../components/AvatarMenu";
import CommonModal from "../components/CommonModal";
import { url } from "../baseUrl";
import { PROFILE_API } from "../api/profile";
import { useAuth } from "../contexts/Auth";
import "./ProfilePage.css";

interface ProfileStatistics {
  courses_enrolled: number;
  courses_completed: number;
  assignments_submitted: number;
  average_score: number;
}

interface ProfileData {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone_number: string | null;
  bio: string | null;
  created_at: string;
  roles?: string[];
  statistics?: ProfileStatistics;
}

type ManagerReadiness = {
  status: "pending" | "verified" | "rejected" | "suspended" | "not_applied";
  application: {
    expertise_areas: string | null;
    years_experience: number | null;
    organization_name: string | null;
    portfolio_url: string | null;
    certificate_links: string | null;
    teaching_statement: string | null;
    application_note: string | null;
  };
  review_note: string | null;
  checklist: Array<{ key: string; label: string; ok: boolean; hint: string }>;
};

const EXPERTISE_TAXONOMY: Array<{ group: string; majors: string[] }> = [
  { group: "Công nghệ thông tin (IT)", majors: ["Lập trình viên (Web, Mobile, Game)", "Kỹ sư phần mềm", "An ninh mạng", "Trí tuệ nhân tạo (AI)", "Khoa học dữ liệu (Data Analyst, Data Scientist)", "Quản trị hệ thống, Cloud"] },
  { group: "Kinh doanh - Quản trị", majors: ["Quản trị doanh nghiệp", "Quản lý dự án", "Khởi nghiệp", "Điều hành doanh nghiệp", "Phát triển kinh doanh (Business Development)"] },
  { group: "Tài chính - Kế toán - Ngân hàng", majors: ["Kế toán doanh nghiệp", "Kiểm toán", "Tài chính đầu tư", "Ngân hàng", "Chứng khoán", "Thuế"] },
  { group: "Marketing - Truyền thông", majors: ["Digital Marketing", "Content Marketing", "SEO", "Quảng cáo", "Quan hệ công chúng (PR)", "Thiết kế thương hiệu"] },
  { group: "Y tế - Sức khỏe", majors: ["Bác sĩ", "Điều dưỡng", "Dược sĩ", "Kỹ thuật xét nghiệm", "Vật lý trị liệu", "Tâm lý học"] },
  { group: "Giáo dục - Đào tạo", majors: ["Giáo viên", "Giảng viên", "Trainer doanh nghiệp", "Giáo dục mầm non", "Ngoại ngữ"] },
  { group: "Kỹ thuật - Xây dựng", majors: ["Cơ khí", "Điện - điện tử", "Tự động hóa", "Xây dựng dân dụng", "Kiến trúc", "Kỹ sư công trình"] },
  { group: "Luật - Hành chính", majors: ["Luật sư", "Công chứng", "Nhân sự hành chính", "Quản lý nhà nước"] },
  { group: "Logistics - Xuất nhập khẩu", majors: ["Chuỗi cung ứng", "Kho vận", "Hải quan", "Vận tải quốc tế", "Mua hàng"] },
  { group: "Du lịch - Nhà hàng - Khách sạn", majors: ["Quản trị khách sạn", "Hướng dẫn viên", "Nhà hàng", "Sự kiện", "Chăm sóc khách hàng"] },
  { group: "Nghệ thuật - Thiết kế", majors: ["Thiết kế đồ họa", "UI/UX Design", "Nhiếp ảnh", "Làm phim", "Âm nhạc", "Thời trang"] },
  { group: "Nông nghiệp - Môi trường", majors: ["Công nghệ thực phẩm", "Nông nghiệp công nghệ cao", "Thú y", "Bảo vệ môi trường"] },
  { group: "Lao động tay nghề - Dịch vụ", majors: ["Điện lạnh", "Sửa chữa ô tô, xe máy", "Làm tóc", "Spa", "Đầu bếp", "Thợ kỹ thuật"] },
  { group: "Khác", majors: [] },
];

const normalizeExpertiseAreas = (value: string | null | undefined): string =>
  Array.from(
    new Set(
      String(value || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).join(", ");

const parseExpertiseAreas = (value: string | null | undefined): string[] =>
  normalizeExpertiseAreas(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function ProfilePage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
    showCancel?: boolean;
  }>({ open: false, title: "", message: "" });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    bio: "",
  });
  const [originalForm, setOriginalForm] = useState(form);

  const [managerReadiness, setManagerReadiness] = useState<ManagerReadiness | null>(null);
  const [managerReadinessLoading, setManagerReadinessLoading] = useState(false);
  const [managerReadinessError, setManagerReadinessError] = useState<string | null>(null);
  const [applyingManager, setApplyingManager] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [newEvidenceLink, setNewEvidenceLink] = useState("");
  const [applicationForm, setApplicationForm] = useState({
    expertise_areas: "",
    years_experience: "",
    organization_name: "",
    portfolio_url: "",
    teaching_statement: "",
    application_note: "",
  });
  const [selectedExpertiseGroup, setSelectedExpertiseGroup] = useState(EXPERTISE_TAXONOMY[0].group);
  const [selectedExpertiseMajor, setSelectedExpertiseMajor] = useState(EXPERTISE_TAXONOMY[0].majors[0] || "");
  const [customExpertiseMajor, setCustomExpertiseMajor] = useState("");
  const [evidenceLinks, setEvidenceLinks] = useState<string[]>([]);

  const isCourseManager = Boolean(profile?.roles?.map((r) => r.toLowerCase()).includes("course_manager"));

  useEffect(() => {
    let ignore = false;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${url}${PROFILE_API.getProfile}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Không thể tải thông tin hồ sơ.");
        }
        const json = await res.json();
        if (ignore) return;
        const data: ProfileData = json.data;
        setProfile(data);
        setAvatarPreview(data.avatar_url || null);
        const fullName = data.full_name || "";
        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : fullName;
        const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
        const nextForm = {
          first_name: firstName,
          last_name: lastName,
          phone_number: data.phone_number || "",
          bio: data.bio || "",
        };
        setForm(nextForm);
        setOriginalForm(nextForm);
      } catch (e: any) {
        if (!ignore) setErrorMessage(e?.message || "Không thể tải hồ sơ.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void fetchProfile();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isCourseManager) return;
    const loadReadiness = async () => {
      setManagerReadinessLoading(true);
      setManagerReadinessError(null);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${url}${PROFILE_API.courseManagerReadiness}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Không thể tải checklist cấp phép.");
        const data = json.data as ManagerReadiness;
        setManagerReadiness(data);
        setApplicationForm({
          expertise_areas: normalizeExpertiseAreas(data.application.expertise_areas),
          years_experience: data.application.years_experience != null ? String(data.application.years_experience) : "",
          organization_name: String(data.application.organization_name || ""),
          portfolio_url: String(data.application.portfolio_url || ""),
          teaching_statement: String(data.application.teaching_statement || ""),
          application_note: String(data.application.application_note || ""),
        });
        const links = String(data.application.certificate_links || "")
          .split(/\r?\n|,/)
          .map((x) => x.trim())
          .filter(Boolean);
        setEvidenceLinks(Array.from(new Set(links)));
      } catch (e: any) {
        setManagerReadiness(null);
        setManagerReadinessError(e?.message || "Không thể tải checklist cấp phép.");
      } finally {
        setManagerReadinessLoading(false);
      }
    };
    void loadReadiness();
  }, [isCourseManager]);

  const hasUnsavedChanges = useMemo(() => {
    if (JSON.stringify(form) !== JSON.stringify(originalForm)) return true;
    if (!isCourseManager || !managerReadiness) return false;
    const initialApp = {
      expertise_areas: normalizeExpertiseAreas(managerReadiness.application.expertise_areas),
      years_experience: managerReadiness.application.years_experience != null ? String(managerReadiness.application.years_experience) : "",
      organization_name: String(managerReadiness.application.organization_name || ""),
      portfolio_url: String(managerReadiness.application.portfolio_url || ""),
      teaching_statement: String(managerReadiness.application.teaching_statement || ""),
      application_note: String(managerReadiness.application.application_note || ""),
    };
    const initialLinks = String(managerReadiness.application.certificate_links || "")
      .split(/\r?\n|,/)
      .map((x) => x.trim())
      .filter(Boolean);
    return JSON.stringify(applicationForm) !== JSON.stringify(initialApp) || JSON.stringify(evidenceLinks) !== JSON.stringify(initialLinks);
  }, [form, originalForm, isCourseManager, managerReadiness, applicationForm, evidenceLinks]);

  const formattedJoinedAt = useMemo(() => {
    if (!profile?.created_at) return "-";
    const d = new Date(profile.created_at);
    return Number.isNaN(d.getTime()) ? profile.created_at : d.toLocaleDateString("vi-VN");
  }, [profile?.created_at]);

  const selectedExpertiseAreas = useMemo(() => parseExpertiseAreas(applicationForm.expertise_areas), [applicationForm.expertise_areas]);
  const expertiseMajors = useMemo(
    () => EXPERTISE_TAXONOMY.find((item) => item.group === selectedExpertiseGroup)?.majors || [],
    [selectedExpertiseGroup]
  );

  useEffect(() => {
    if (selectedExpertiseGroup === "Khác") {
      setSelectedExpertiseMajor("");
      return;
    }
    setSelectedExpertiseMajor((prev) => (expertiseMajors.includes(prev) ? prev : expertiseMajors[0] || ""));
  }, [selectedExpertiseGroup, expertiseMajors]);

  const goToDashboard = () => {
    const roleSet = new Set((profile?.roles || []).map((r) => r.toLowerCase()));
    if (roleSet.has("admin")) return navigate("/admin");
    if (roleSet.has("teacher") || roleSet.has("course_manager")) return navigate("/teacher/dashboard");
    return navigate("/student/dashboard");
  };

  const saveProfile = async () => {
    const trimmedPhone = form.phone_number.trim();
    if (trimmedPhone && !/^0\d{9,10}$/.test(trimmedPhone)) {
      setErrorMessage("Số điện thoại không hợp lệ. Vui lòng nhập dạng 0xxxxxxxxx.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = localStorage.getItem("access_token");
      const fullName = `${form.first_name} ${form.last_name}`.trim().replace(/\s+/g, " ");
      if (fullName.length < 2) {
        throw new Error("Vui lòng nhập họ và tên hợp lệ.");
      }
      const body = {
        full_name: fullName,
        phone_number: trimmedPhone || "",
        bio: form.bio.trim(),
      };
      const res = await fetch(`${url}${PROFILE_API.updateProfile}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Không thể cập nhật hồ sơ.");
      const newData: ProfileData = json.data ?? { ...(profile as ProfileData), ...body };

      if (isCourseManager) {
        const managerRes = await fetch(`${url}${PROFILE_API.submitCourseManagerApplication}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            expertise_areas: applicationForm.expertise_areas,
            years_experience: applicationForm.years_experience ? Number(applicationForm.years_experience) : null,
            organization_name: applicationForm.organization_name,
            portfolio_url: applicationForm.portfolio_url,
            certificate_links: evidenceLinks.join("\n"),
            teaching_statement: applicationForm.teaching_statement,
            application_note: applicationForm.application_note,
          }),
        });
        const managerJson = await managerRes.json().catch(() => ({}));
        if (!managerRes.ok) {
          throw new Error(managerJson?.message || "Đã lưu hồ sơ cá nhân nhưng gửi hồ sơ cấp phép thất bại.");
        }
      }

      setProfile(newData);
      const nextForm = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone_number: newData.phone_number || "",
        bio: newData.bio || "",
      };
      setForm(nextForm);
      setOriginalForm(nextForm);
      if (isCourseManager) {
        const re = await fetch(`${url}${PROFILE_API.courseManagerReadiness}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const reJson = await re.json().catch(() => ({}));
        if (re.ok) setManagerReadiness(reJson.data as ManagerReadiness);
      }
      setSuccessMessage(isCourseManager ? "Đã lưu hồ sơ và gửi cập nhật cho quản trị viên." : "Cập nhật hồ sơ thành công.");
    } catch (e: any) {
      setErrorMessage(e?.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = (file: File | null) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setErrorMessage("Vui lòng chọn file JPEG, PNG, WEBP hoặc GIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Dung lượng ảnh tối đa 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const confirmCropAndUpload = async () => {
    setShowCropper(false);
    if (!avatarPreview) return;
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem("access_token");
      const blob = await (await fetch(avatarPreview)).blob();
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${url}${PROFILE_API.uploadAvatar}`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Không thể upload ảnh đại diện.");
      const avatarUrl = json?.data?.avatar_url || null;
      setAvatarPreview(avatarUrl);
      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      if (avatarUrl) updateUser({ avatar_url: avatarUrl });
      setSuccessMessage("Cập nhật ảnh đại diện thành công.");
    } catch (e: any) {
      setErrorMessage(e?.message || "Không thể upload ảnh đại diện.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const deleteAvatar = () => {
    setModalState({
      open: true,
      title: "Xác nhận xóa ảnh",
      message: "Bạn có chắc muốn xóa ảnh đại diện?",
      showCancel: true,
      onConfirm: async () => {
        setModalState({ open: false, title: "", message: "" });
        setAvatarDeleting(true);
        try {
          const token = localStorage.getItem("access_token");
          const res = await fetch(`${url}${PROFILE_API.deleteAvatar}`, {
            method: "DELETE",
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json?.message || "Không thể xóa ảnh đại diện.");
          setAvatarPreview(null);
          setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev));
          setSuccessMessage("Đã xóa ảnh đại diện.");
        } catch (e: any) {
          setErrorMessage(e?.message || "Không thể xóa ảnh đại diện.");
        } finally {
          setAvatarDeleting(false);
        }
      },
    });
  };

  const addEvidenceLink = () => {
    const value = newEvidenceLink.trim();
    if (!value) return;
    setEvidenceLinks((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setNewEvidenceLink("");
  };

  const addExpertiseArea = () => {
    const majorLabel = selectedExpertiseGroup === "Khác" ? customExpertiseMajor.trim() : selectedExpertiseMajor.trim();
    if (!majorLabel) {
      setErrorMessage("Vui lòng chọn hoặc nhập chuyên ngành trước khi thêm.");
      return;
    }
    const value = `${selectedExpertiseGroup}: ${majorLabel}`;
    if (selectedExpertiseAreas.includes(value)) {
      setErrorMessage("Chuyên ngành này đã được thêm.");
      return;
    }
    const nextValues = [...selectedExpertiseAreas, value];
    setApplicationForm((prev) => ({ ...prev, expertise_areas: nextValues.join(", ") }));
    setCustomExpertiseMajor("");
    setErrorMessage(null);
  };

  const removeExpertiseArea = (value: string) => {
    const nextValues = selectedExpertiseAreas.filter((item) => item !== value);
    setApplicationForm((prev) => ({ ...prev, expertise_areas: nextValues.join(", ") }));
  };

  const removeEvidenceLink = (link: string) => {
    setEvidenceLinks((prev) => prev.filter((x) => x !== link));
  };

  const copyEvidenceLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setSuccessMessage("Đã copy link minh chứng.");
    } catch {
      setErrorMessage("Không thể copy link.");
    }
  };

  const uploadManagerEvidence = async (file: File | null) => {
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return setErrorMessage("Chỉ chấp nhận PDF/JPG/PNG/WEBP.");
    if (file.size > 10 * 1024 * 1024) return setErrorMessage("Dung lượng file tối đa 10MB.");
    setUploadingEvidence(true);
    try {
      const token = localStorage.getItem("access_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${url}${PROFILE_API.uploadCourseManagerDocument}`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Không thể upload minh chứng.");
      const fileUrl = String(json?.data?.file_url || "").trim();
      if (fileUrl) setEvidenceLinks((prev) => (prev.includes(fileUrl) ? prev : [...prev, fileUrl]));
      setSuccessMessage("Upload minh chứng thành công.");
    } catch (e: any) {
      setErrorMessage(e?.message || "Không thể upload minh chứng.");
    } finally {
      setUploadingEvidence(false);
    }
  };

  const submitManagerApplication = saveProfile;

  if (loading) {
    return (
      <div className="dashboard-page profile-page-shell">
        <div className="profile-main-card">Đang tải thông tin hồ sơ...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page profile-page-shell">
      <div className="profile-page-header">
        <div>
          <div className="profile-page-kicker">Account center</div>
          <h1 className="dashboard-title profile-page-title">Hồ sơ cá nhân</h1>
          <p className="dashboard-subtitle profile-page-subtitle">Quản lý thông tin tài khoản và hồ sơ cấp phép course manager.</p>
        </div>
        <div className="profile-top-actions">
          <button type="button" className="secondary-button" onClick={goToDashboard}>
            <House size={16} />
            Dashboard
          </button>
          <AvatarMenu />
        </div>
      </div>

      <div className="profile-main-card">
        <div className="profile-avatar-container">
          <div className="profile-avatar-wrapper">
            {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="profile-avatar-img" /> : (profile?.full_name?.[0] || "U").toUpperCase()}
          </div>
          <div className="profile-avatar-info">
            <div className="profile-avatar-label">Ảnh đại diện</div>
            <div className="profile-avatar-actions">
              <label className="secondary-button profile-avatar-upload-btn">
                <Camera size={16} />
                {avatarUploading ? "Đang tải..." : "Tải ảnh"}
                <input type="file" style={{ display: "none" }} accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => handleAvatarFileChange(e.target.files?.[0] ?? null)} />
              </label>
              <button type="button" className="secondary-button" onClick={deleteAvatar} disabled={avatarDeleting || !avatarPreview}>
                <Trash2 size={16} />
                Xóa
              </button>
            </div>
          </div>
        </div>

        <div className="profile-two-column">
          <div className="profile-form-column">
            <div className="profile-name-row">
              <div className="form-group">
                <label className="form-label">Họ</label>
                <input className="form-input" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Tên</label>
                <input className="form-input" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input className="form-input" value={form.phone_number} onChange={(e) => setForm((p) => ({ ...p, phone_number: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-input" rows={4} value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
            </div>
            {isCourseManager ? (
              <>
                <div className="form-group">
                  <label className="form-label">Lĩnh vực chuyên môn</label>
                  <div className="profile-expertise-picker">
                    <select className="form-input" value={selectedExpertiseGroup} onChange={(e) => setSelectedExpertiseGroup(e.target.value)}>
                      {EXPERTISE_TAXONOMY.map((item) => (
                        <option key={item.group} value={item.group}>
                          {item.group}
                        </option>
                      ))}
                    </select>
                    {selectedExpertiseGroup === "Khác" ? (
                      <input
                        className="form-input"
                        value={customExpertiseMajor}
                        onChange={(e) => setCustomExpertiseMajor(e.target.value)}
                        placeholder="Nhập chuyên ngành khác..."
                      />
                    ) : (
                      <select className="form-input" value={selectedExpertiseMajor} onChange={(e) => setSelectedExpertiseMajor(e.target.value)}>
                        {expertiseMajors.map((major) => (
                          <option key={major} value={major}>
                            {major}
                          </option>
                        ))}
                      </select>
                    )}
                    <button type="button" className="secondary-button" onClick={addExpertiseArea}>
                      Thêm chuyên ngành
                    </button>
                  </div>
                  <div className="profile-expertise-chip-list">
                    {selectedExpertiseAreas.map((item) => (
                      <div key={item} className="profile-expertise-chip">
                        <span className="profile-expertise-chip-text">{item}</span>
                        <button type="button" className="profile-evidence-chip-btn profile-evidence-chip-btn-danger" onClick={() => removeExpertiseArea(item)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="profile-field-hint">Bạn có thể thêm nhiều chuyên ngành để admin đánh giá đúng năng lực thực tế.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Số năm kinh nghiệm</label>
                  <input className="form-input" type="number" min={0} value={applicationForm.years_experience} onChange={(e) => setApplicationForm((p) => ({ ...p, years_experience: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Đơn vị công tác</label>
                  <input className="form-input" value={applicationForm.organization_name} onChange={(e) => setApplicationForm((p) => ({ ...p, organization_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Portfolio</label>
                  <input className="form-input" value={applicationForm.portfolio_url} onChange={(e) => setApplicationForm((p) => ({ ...p, portfolio_url: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Minh chứng năng lực</label>
                  <div className="profile-evidence-input-row">
                    <input className="form-input" value={newEvidenceLink} onChange={(e) => setNewEvidenceLink(e.target.value)} placeholder="Dán link minh chứng..." />
                    <button type="button" className="secondary-button" onClick={addEvidenceLink}>Thêm</button>
                    <label className="secondary-button">
                      <Upload size={14} />
                      {uploadingEvidence ? "Đang upload..." : "Upload"}
                      <input type="file" style={{ display: "none" }} accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => uploadManagerEvidence(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                  <div className="profile-evidence-chip-list">
                    {evidenceLinks.map((link) => (
                      <div key={link} className="profile-evidence-chip">
                        <span className="profile-evidence-chip-text">{link}</span>
                        <button type="button" className="profile-evidence-chip-btn" onClick={() => copyEvidenceLink(link)}>
                          <Copy size={13} />
                        </button>
                        <button type="button" className="profile-evidence-chip-btn profile-evidence-chip-btn-danger" onClick={() => removeEvidenceLink(link)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cam kết chất lượng đào tạo</label>
                  <textarea className="form-input" rows={3} value={applicationForm.teaching_statement} onChange={(e) => setApplicationForm((p) => ({ ...p, teaching_statement: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Thông tin bổ sung</label>
                  <textarea className="form-input" rows={3} value={applicationForm.application_note} onChange={(e) => setApplicationForm((p) => ({ ...p, application_note: e.target.value }))} />
                </div>
              </>
            ) : null}
            <div className="profile-manager-submit">
              <button type="button" className="secondary-button" onClick={() => setForm(originalForm)} disabled={!hasUnsavedChanges}>Hủy</button>
              <button type="button" className="primary-button" onClick={saveProfile} disabled={!hasUnsavedChanges || saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
            </div>
          </div>

          <div className="profile-side-column">
            <div className="profile-glass-card">
              <div className="profile-info-card-title">Thông tin tài khoản</div>
              <div className="profile-info-row"><span className="profile-info-label">Email</span><span className="profile-info-value">{profile?.email || "-"}</span></div>
              <div className="profile-info-row"><span className="profile-info-label">Ngày tham gia</span><span className="profile-info-value">{formattedJoinedAt}</span></div>
              <div className="profile-info-row"><span className="profile-info-label">Vai trò</span><span className="profile-info-value">{profile?.roles?.join(", ") || "-"}</span></div>
            </div>

            {isCourseManager ? (
              <>
                <div className="profile-glass-card">
                  <div className="profile-info-card-title">Checklist cấp phép</div>
                  {managerReadinessLoading ? <div className="profile-info-card-subtitle">Đang tải checklist...</div> : null}
                  {managerReadinessError ? <div className="error-box">{managerReadinessError}</div> : null}
                  {!managerReadinessLoading && managerReadiness ? (
                    <div className="profile-manager-checklist">
                      {managerReadiness.checklist.map((item) => (
                        <div key={item.key} className="profile-info-row profile-checklist-row">
                          <span className="profile-info-label">{item.label}</span>
                          <span className="profile-info-value" title={item.ok ? "Đủ" : item.hint}>
                            {item.ok ? <CheckCircle2 size={15} color="#15803d" /> : <TriangleAlert size={15} color="#b45309" />}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>

        {errorMessage ? <div className="error-box">{errorMessage}</div> : null}
        {successMessage ? <div className="profile-success-message">{successMessage}</div> : null}
      </div>

      {showCropper ? (
        <div className="profile-cropper-modal-overlay" onClick={() => setShowCropper(false)}>
          <div className="profile-cropper-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-cropper-title">Xác nhận ảnh đại diện</div>
            <div className="profile-cropper-preview">
              <img src={avatarPreview || ""} alt="Avatar preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div className="profile-cropper-actions">
              <button type="button" className="secondary-button" onClick={() => setShowCropper(false)}>Hủy</button>
              <button type="button" className="primary-button" onClick={confirmCropAndUpload}>Lưu</button>
            </div>
          </div>
        </div>
      ) : null}

      <CommonModal
        open={modalState.open}
        title={modalState.title}
        message={modalState.message}
        showCancel={Boolean(modalState.showCancel)}
        onClose={() => setModalState({ open: false, title: "", message: "" })}
        onConfirm={() => (modalState.onConfirm ? modalState.onConfirm() : setModalState({ open: false, title: "", message: "" }))}
      />
    </div>
  );
}