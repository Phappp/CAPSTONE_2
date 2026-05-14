import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarMenu from "../../components/AvatarMenu";
import { url } from "../../baseUrl";
import { COURSES_API } from "../../api/courses";
import { getAccessToken } from "../../utils/authStorage";
import { useAuth } from "../../contexts/Auth";
import CommonModal from "../../components/CommonModal";
import "./CreateCoursePage.css";

type Level = "beginner" | "intermediate" | "advanced";
type Language = "vi" | "en";

interface CreateCoursePayload {
  title: string;
  short_description: string;
  full_description: string;
  category: string;
  level: Level;
  language: Language;
  learning_objectives: string[];
  prerequisites: string[];
  price?: number | null;
  has_certificate: boolean;
  estimated_hours?: number | null;
  tags: string[];
  thumbnail_url?: string | null;
  publish_scheduled_at?: string | null;
}

type CourseOption = {
  id: number;
  title: string;
  slug: string;
};

const CATEGORY_TAXONOMY: Array<{ group: string; majors: string[] }> = [
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

const DEFAULT_PAYLOAD: CreateCoursePayload = {
  title: "",
  short_description: "",
  full_description: "",
  category: "",
  level: "beginner",
  language: "vi",
  learning_objectives: [""],
  prerequisites: [""],
  price: null,
  has_certificate: false,
  estimated_hours: null,
  tags: [],
  thumbnail_url: null,
  publish_scheduled_at: null,
};

const mapValidationMessage = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes("title must be longer than or equal to 1")) return "Vui lòng nhập tên khóa học.";
  if (lower.includes("short_description")) return "Vui lòng nhập mô tả ngắn hợp lệ (tối đa 200 ký tự).";
  if (lower.includes("full_description")) return "Mô tả chi tiết chưa hợp lệ.";
  if (lower.includes("level")) return "Cấp độ khóa học không hợp lệ.";
  if (lower.includes("language")) return "Ngôn ngữ khóa học không hợp lệ.";
  if (lower.includes("category")) return "Danh mục khóa học không hợp lệ.";
  return message;
};

const parseFriendlyApiError = async (res: Response, fallback: string): Promise<string> => {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;
  try {
    const data = JSON.parse(text) as { message?: string | string[]; error?: string };
    const rawMessage = data?.message;
    if (Array.isArray(rawMessage) && rawMessage.length) {
      return rawMessage.map((item) => mapValidationMessage(String(item))).join("\n");
    }
    if (typeof rawMessage === "string" && rawMessage.trim()) {
      return mapValidationMessage(rawMessage);
    }
    return fallback;
  } catch {
    return text.includes("{") ? fallback : text;
  }
};

export default function CreateCoursePage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [payload, setPayload] = useState<CreateCoursePayload>(DEFAULT_PAYLOAD);
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState(CATEGORY_TAXONOMY[0].group);
  const [selectedCategoryMajor, setSelectedCategoryMajor] = useState(CATEGORY_TAXONOMY[0].majors[0] || "");
  const [customCategoryMajor, setCustomCategoryMajor] = useState("");
  const [prerequisiteOptions, setPrerequisiteOptions] = useState<CourseOption[]>([]);
  const [modalState, setModalState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ open: false, title: "", message: "" });

  const navigate = useNavigate();

  const maxStep = 4;
  const managerBlocked = Boolean(
    user?.primary_role === "course_manager" &&
      user?.manager_verification &&
      user.manager_verification.status !== "verified"
  );

  const ensureVerifiedForCourseActions = (): boolean => {
    if (!managerBlocked) return true;
    const note = user?.manager_verification?.review_note
      ? `\n\nGhi chú từ quản trị viên: ${user.manager_verification.review_note}`
      : "";
    setModalState({
      open: true,
      title: "Cần cấp phép giảng viên",
      message: `Tính năng này yêu cầu tài khoản giảng viên đã được xác minh.${note}\n\nBạn sẽ được chuyển đến trang hồ sơ để xem trạng thái xác minh.`,
      onConfirm: () => {
        setModalState({ open: false, title: "", message: "" });
        navigate("/profile");
      },
    });
    return false;
  };

  const selectedPrerequisiteIds = useMemo(() => {
    return new Set(
      (payload.prerequisites || [])
        .map((x) => Number(String(x).trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    );
  }, [payload.prerequisites]);

  const categoryMajors = useMemo(
    () => CATEGORY_TAXONOMY.find((item) => item.group === selectedCategoryGroup)?.majors || [],
    [selectedCategoryGroup]
  );

  useEffect(() => {
    if (selectedCategoryGroup === "Khác") {
      setSelectedCategoryMajor("");
      return;
    }
    setSelectedCategoryMajor((prev) => (categoryMajors.includes(prev) ? prev : categoryMajors[0] || ""));
  }, [selectedCategoryGroup, categoryMajors]);

  const handleBasicChange = (field: keyof CreateCoursePayload, value: any) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (
    field: "learning_objectives" | "prerequisites",
    index: number,
    value: string
  ) => {
    setPayload((prev) => {
      const copy = [...prev[field]];
      copy[index] = value;
      return { ...prev, [field]: copy };
    });
  };

  const handleAddArrayItem = (field: "learning_objectives" | "prerequisites") => {
    setPayload((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const handleRemoveArrayItem = (
    field: "learning_objectives" | "prerequisites",
    index: number
  ) => {
    setPayload((prev) => {
      const copy = [...prev[field]];
      copy.splice(index, 1);
      return { ...prev, [field]: copy.length ? copy : [""] };
    });
  };

  const applyCategorySelection = () => {
    const major = selectedCategoryGroup === "Khác" ? customCategoryMajor.trim() : selectedCategoryMajor.trim();
    if (!major) {
      setError("Vui lòng chọn hoặc nhập chuyên ngành cho danh mục.");
      return;
    }
    handleBasicChange("category", `${selectedCategoryGroup}: ${major}`);
    setError(null);
  };

  const canGoNextFromStep1 =
    payload.title.trim().length > 0 &&
    payload.short_description.trim().length > 0 &&
    payload.short_description.trim().length <= 200;

  useEffect(() => {
    const fetchPrerequisiteOptions = async () => {
      try {
        const token = getAccessToken();
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("page_size", "100");
        params.set("sort_by", "title");
        params.set("sort_dir", "asc");
        const res = await fetch(`${url}${COURSES_API.catalog}?${params.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = (await res.json().catch(() => ({}))) as { items?: CourseOption[] };
        if (!res.ok) return;
        const items = Array.isArray(data.items) ? data.items : [];
        setPrerequisiteOptions(items.map((x) => ({ id: Number(x.id), title: String(x.title), slug: String(x.slug) })));
      } catch {
        // ignore loading errors for optional field
      }
    };
    void fetchPrerequisiteOptions();
  }, []);

  const toAbsoluteThumbnailUrl = (input: string): string => {
    const value = String(input || "").trim();
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `${url}${value}`;
  };

  const handleImageChange = async (file: File | null) => {
    if (!file) {
      setImagePreview(null);
      handleBasicChange("thumbnail_url", null);
      return;
    }

    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${url}${COURSES_API.uploadCourseThumbnail()}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Upload ảnh thất bại.");

      const imageUrl = data?.url as string | undefined;
      if (imageUrl) {
        const absoluteUrl = toAbsoluteThumbnailUrl(imageUrl);
        setImagePreview(absoluteUrl);
        handleBasicChange("thumbnail_url", absoluteUrl);
      }
    } catch (e: any) {
      setError(e?.message || "Upload ảnh thất bại.");
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!ensureVerifiedForCourseActions()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const token = getAccessToken();

      const body: any = {
        title: payload.title,
        short_description: payload.short_description,
        full_description: payload.full_description,
        category: payload.category || "general",
        level: payload.level,
        language: payload.language,
        learning_objectives: payload.learning_objectives.filter((x) => x.trim()),
        prerequisites: payload.prerequisites.filter((x) => x.trim()),
        price:
          payload.price === null || payload.price === undefined
            ? undefined
            : Number(payload.price),
        has_certificate: payload.has_certificate,
        estimated_hours:
          payload.estimated_hours === null || payload.estimated_hours === undefined
            ? undefined
            : Number(payload.estimated_hours),
        tags: payload.tags,
        thumbnail_url: payload.thumbnail_url || null,
        publish_scheduled_at: payload.publish_scheduled_at ? new Date(payload.publish_scheduled_at).toISOString() : null,
      };

      const res = await fetch(`${url}${COURSES_API.createCourse}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const friendlyMessage = await parseFriendlyApiError(res, "Không thể lưu khóa học. Vui lòng kiểm tra lại thông tin.");
        throw new Error(friendlyMessage);
      }

      const data = await res.json().catch(() => ({}));
      const courseId = data?.id;
      if (!courseId) {
        throw new Error("Không thể tạo khóa học: thiếu course id trả về từ server.");
      }

      navigate(`/teacher/courses/${courseId}`);
    } catch (e: any) {
      setError(e.message || "Đã xảy ra lỗi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      window.confirm(
        "Bạn có chắc muốn hủy tạo khóa học? Mọi thay đổi chưa lưu sẽ bị mất."
      )
    ) {
      navigate("/teacher/dashboard");
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      "Thông tin cơ bản",
      "Mô tả chi tiết",
      "Hình ảnh",
      "Cài đặt",
    ];

    return (
      <div className="wizard-steps">
        {steps.map((label, index) => {
          const current = index + 1;
          const isActive = current === step;
          const isDone = current < step;
          return (
            <div
              key={label}
              className={`wizard-step ${isActive ? "active" : ""} ${isDone ? "done" : ""
                }`}
            >
              <div className="wizard-step-circle">{current}</div>
              <div className="wizard-step-label">{label}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStep1 = () => (
    <>
      <div className="form-group">
        <label className="form-label">
          Tên khóa học <span className="required-star">*</span>
        </label>
        <input
          className="form-input"
          placeholder="Ví dụ: Lập trình Python cho người mới bắt đầu"
          value={payload.title}
          onChange={(e) => handleBasicChange("title", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          Mô tả ngắn <span className="required-star">*</span>
        </label>
        <textarea
          className="form-input"
          rows={3}
          maxLength={200}
          placeholder="Mô tả ngắn gọn về khóa học (tối đa 200 ký tự)"
          value={payload.short_description}
          onChange={(e) => handleBasicChange("short_description", e.target.value)}
        />
        <div className="character-counter">
          {payload.short_description.length}/200
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Danh mục</label>
        <div className="category-picker">
          <select className="form-input" value={selectedCategoryGroup} onChange={(e) => setSelectedCategoryGroup(e.target.value)}>
            {CATEGORY_TAXONOMY.map((item) => (
              <option key={item.group} value={item.group}>
                {item.group}
              </option>
            ))}
          </select>
          {selectedCategoryGroup === "Khác" ? (
            <input
              className="form-input"
              placeholder="Nhập chuyên ngành..."
              value={customCategoryMajor}
              onChange={(e) => setCustomCategoryMajor(e.target.value)}
            />
          ) : (
            <select className="form-input" value={selectedCategoryMajor} onChange={(e) => setSelectedCategoryMajor(e.target.value)}>
              {categoryMajors.map((major) => (
                <option key={major} value={major}>
                  {major}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="secondary-button" onClick={applyCategorySelection}>
            Chọn danh mục
          </button>
        </div>
        <div className="category-selected-preview">
          Danh mục đã chọn: <strong>{payload.category || "Chưa chọn"}</strong>
        </div>
      </div>

      <div className="two-column-grid">
        <div className="form-group">
          <label className="form-label">Cấp độ</label>
          <select
            className="form-input"
            value={payload.level}
            onChange={(e) => handleBasicChange("level", e.target.value as Level)}
          >
            <option value="beginner">Cơ bản</option>
            <option value="intermediate">Trung cấp</option>
            <option value="advanced">Nâng cao</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Ngôn ngữ</label>
          <select
            className="form-input"
            value={payload.language}
            onChange={(e) =>
              handleBasicChange("language", e.target.value as Language)
            }
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="form-group">
        <label className="form-label">Mô tả đầy đủ</label>
        <textarea
          className="form-input"
          rows={8}
          placeholder="Mô tả chi tiết khóa học. Có thể dán nội dung rich text từ trình soạn thảo."
          value={payload.full_description}
          onChange={(e) => handleBasicChange("full_description", e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Mục tiêu học tập</label>
        {payload.learning_objectives.map((item, idx) => (
          <div key={idx} className="array-item">
            <input
              className="form-input"
              placeholder="Ví dụ: Hiểu cú pháp Python cơ bản"
              value={item}
              onChange={(e) =>
                handleArrayChange("learning_objectives", idx, e.target.value)
              }
            />
            <button
              type="button"
              className="link-button"
              onClick={() => handleRemoveArrayItem("learning_objectives", idx)}
            >
              Xóa
            </button>
          </div>
        ))}
        <button
          type="button"
          className="link-button"
          onClick={() => handleAddArrayItem("learning_objectives")}
        >
          + Thêm mục tiêu
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">Yêu cầu tiên quyết</label>
        <p className="form-hint">Chọn các khóa học cần hoàn tất trước khi được đăng ký khóa này.</p>
        <div style={{ display: "grid", gap: "0.5rem", maxHeight: 220, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
          {prerequisiteOptions.length ? (
            prerequisiteOptions.map((c) => {
              const checked = selectedPrerequisiteIds.has(c.id);
              return (
                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setPayload((prev) => {
                        const set = new Set(
                          (prev.prerequisites || [])
                            .map((x) => Number(String(x).trim()))
                            .filter((n) => Number.isInteger(n) && n > 0)
                        );
                        if (e.target.checked) set.add(c.id);
                        else set.delete(c.id);
                        return { ...prev, prerequisites: Array.from(set).map(String) };
                      });
                    }}
                  />
                  <span style={{ fontWeight: 700 }}>{c.title}</span>
                </label>
              );
            })
          ) : (
            <div style={{ color: "#6b7280" }}>Chưa có khóa học để chọn.</div>
          )}
        </div>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <div className="form-group">
        <label className="form-label">Ảnh bìa khóa học</label>
        <p className="form-hint">
          Khuyến nghị kích thước 1280x720, dung lượng &lt; 2MB.
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
        />
      </div>

      {imagePreview && (
        <div className="form-group">
          <label className="form-label">Preview ảnh</label>
          <div className="course-image-preview-wrapper">
            <img
              src={imagePreview}
              alt="Preview thumbnail"
              className="course-image-preview"
            />
          </div>
        </div>
      )}
    </>
  );

  const renderStep4 = () => (
    <>
      <div className="three-column-grid">
        <div className="form-group">
          <label className="form-label">Giá khóa học (VNĐ)</label>
          <input
            className="form-input"
            type="number"
            min={0}
            placeholder="Để trống nếu miễn phí"
            value={payload.price ?? ""}
            onChange={(e) =>
              handleBasicChange(
                "price",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Có chứng chỉ hoàn thành</label>
          <select
            className="form-input"
            value={payload.has_certificate ? "yes" : "no"}
            onChange={(e) =>
              handleBasicChange("has_certificate", e.target.value === "yes")
            }
          >
            <option value="no">Không</option>
            <option value="yes">Có</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Thời gian dự kiến (giờ)</label>
          <input
            className="form-input"
            type="number"
            min={0}
            placeholder="Ví dụ: 25"
            value={payload.estimated_hours ?? ""}
            onChange={(e) =>
              handleBasicChange(
                "estimated_hours",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Xuất bản tự động lúc (tùy chọn)</label>
          <input
            className="form-input"
            type="datetime-local"
            value={payload.publish_scheduled_at ?? ""}
            onChange={(e) => handleBasicChange("publish_scheduled_at", e.target.value || null)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Tags</label>
        <input
          className="form-input"
          placeholder='Nhập các tag, phân cách bằng dấu phẩy. VD: "python, programming, lập trình"'
          value={payload.tags.join(", ")}
          onChange={(e) =>
            handleBasicChange(
              "tags",
              e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)
            )
          }
        />
      </div>
    </>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="dashboard-title">Tạo khóa học mới</h1>
          <p className="dashboard-subtitle">
            Điền thông tin theo từng bước. Bạn có thể lưu tạm bất kỳ lúc nào.
          </p>
        </div>
        <AvatarMenu />
      </div>

      <div className="wizard-card" style={{ maxWidth: 1600 }}>
        {renderStepIndicator()}

        <div className="wizard-body">{renderStepContent()}</div>

        {error && <div className="error-box">{error}</div>}

        <div className="wizard-footer">
          <div className="wizard-footer-left">
            <button
              type="button"
              className="secondary-button"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
            >
              Lưu tạm
            </button>
          </div>

          <div className="wizard-footer-right">
            {step > 1 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={isSubmitting}
              >
                Quay lại
              </button>
            )}

            {step < maxStep && (
              <button
                type="button"
                className="primary-button"
                onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
                disabled={isSubmitting || (step === 1 && !canGoNextFromStep1)}
              >
                Tiếp tục
              </button>
            )}

            {step === maxStep && (
              <button
                type="button"
                className="primary-button"
                onClick={() => handleSave(true)}
                disabled={isSubmitting || !canGoNextFromStep1}
              >
                Tạo khóa học
              </button>
            )}
          </div>
        </div>
      </div>
      <CommonModal
        open={modalState.open}
        title={modalState.title}
        message={modalState.message}
        onClose={() => setModalState({ open: false, title: "", message: "" })}
        onConfirm={() => {
          if (modalState.onConfirm) {
            modalState.onConfirm();
            return;
          }
          setModalState({ open: false, title: "", message: "" });
        }}
      />
    </div>
  );
}