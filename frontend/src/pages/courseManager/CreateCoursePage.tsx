import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  { group: "Tài chính - Kế toán", majors: ["Kế toán doanh nghiệp", "Kiểm toán", "Tài chính đầu tư", "Chứng khoán", "Thuế"] },
  { group: "Marketing - Truyền thông", majors: ["Digital Marketing", "Content Marketing", "SEO", "Quảng cáo", "Quan hệ công chúng (PR)", "Thiết kế thương hiệu"] },
  { group: "Y tế - Sức khỏe", majors: ["Bác sĩ", "Điều dưỡng", "Dược sĩ", "Kỹ thuật xét nghiệm", "Vật lý trị liệu", "Tâm lý học"] },
  { group: "Giáo dục - Đào tạo", majors: ["Giáo viên", "Instructor", "Trainer doanh nghiệp", "Giáo dục mầm non", "Ngoại ngữ"] },
  { group: "Kỹ thuật - Xây dựng", majors: ["Cơ khí", "Điện - điện tử", "Tự động hóa", "Xây dựng dân dụng", "Kiến trúc", "Kỹ sư công trình"] },
  { group: "Luật - Hành chính", majors: ["Luật sư", "Công chứng", "Nhân sự hành chính", "Quản lý nhà nước"] },
  { group: "Logistics - Xuất nhập khẩu", majors: ["Chuỗi cung ứng", "Kho vận", "Hải quan", "Vận tải quốc tế"] },
  { group: "Du lịch - Nhà hàng - Khách sạn", majors: ["Quản trị khách sạn", "Hướng dẫn viên", "Nhà hàng", "Sự kiện", "Chăm sóc khách hàng"] },
  { group: "Nghệ thuật - Thiết kế", majors: ["Thiết kế đồ họa", "UI/UX Design", "Nhiếp ảnh", "Làm phim", "Âm nhạc", "Thời trang"] },
  { group: "Nông nghiệp - Môi trường", majors: ["Công nghệ thực phẩm", "Nông nghiệp công nghệ cao", "Thú y", "Bảo vệ môi trường"] },
  { group: "Lao động tay nghề - Dịch vụ", majors: ["Điện lạnh", "Sửa chữa ô tô, xe máy", "Làm tóc", "Spa", "Đầu bếp"] },
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
  if (lower.includes("title must be longer than or equal to 1")) return "Please enter a valid course name.";
  if (lower.includes("short_description")) return "Please enter a valid short description (maximum 200 characters).";
  if (lower.includes("full_description")) return "Please enter a valid full description.";
  if (lower.includes("level")) return "Please select a valid course level.";
  if (lower.includes("language")) return "Please select a valid course language.";
  if (lower.includes("category")) return "Please select a valid course category.";
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

interface CreateCoursePageProps {
  onCancel?: () => void;
  hideHeader?: boolean;
}

export default function CreateCoursePage({ onCancel, hideHeader = false }: CreateCoursePageProps) {
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
      ? `\n\nNote from administrator: ${user.manager_verification.review_note}`
      : "";
    setModalState({
      open: true,
      title: "Instructor verification required",
      message: `This feature requires a verified instructor account.${note}\n\nYou will be redirected to your profile to check verification status.`,
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

  // Auto-apply category when selection changes
  useEffect(() => {
    const major = selectedCategoryGroup === "Khác" ? customCategoryMajor.trim() : selectedCategoryMajor.trim();
    if (major) {
      handleThreesicChange("category", `${selectedCategoryGroup}: ${major}`);
    }
  }, [selectedCategoryGroup, selectedCategoryMajor, customCategoryMajor]);

  const handleThreesicChange = (field: keyof CreateCoursePayload, value: any) => {
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
      handleThreesicChange("thumbnail_url", null);
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
      if (!res.ok) throw new Error(data?.message || "Failed to upload image.");

      const imageUrl = data?.url as string | undefined;
      if (imageUrl) {
        const absoluteUrl = toAbsoluteThumbnailUrl(imageUrl);
        setImagePreview(absoluteUrl);
        handleThreesicChange("thumbnail_url", absoluteUrl);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to upload image.");
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
        const friendlyMessage = await parseFriendlyApiError(res, "Failed to save course. Please check your information.");
        throw new Error(friendlyMessage);
      }

      const data = await res.json().catch(() => ({}));
      const courseId = data?.id;
      if (!courseId) {
        throw new Error("Failed to create course: missing course id from server.");
      }

      navigate(`/teacher/courses/${courseId}`);
    } catch (e: any) {
      setError(e.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      window.confirm(
        "You are sure you want to cancel creating the course? All unsaved changes will be lost."
      )
    ) {
      if (onCancel) {
        onCancel();
      } else {
        navigate("/teacher/dashboard");
      }
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      "Basic Information",
      "Full Description",
      "Image",
      "Settings",
    ];

    return (
      <div className="cc-steps">
        {steps.map((label, index) => {
          const current = index + 1;
          const isActive = current === step;
          const isDone = current < step;
          return (
            <div
              key={label}
              className={`cc-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
            >
              <div className="cc-step-circle">{current}</div>
              <div className="cc-step-label">{label}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="cc-form-body">
      <div className="cc-form-group">
        <label className="cc-form-label">
          Course Name <span className="cc-required-star">*</span>
        </label>
        <input
          className="cc-form-input"
          placeholder="e.g., Python Programming for Beginners"
          value={payload.title}
          onChange={(e) => handleThreesicChange("title", e.target.value)}
        />
      </div>

      <div className="cc-form-group">
        <label className="cc-form-label">
          Short description <span className="cc-required-star">*</span>
        </label>
        <textarea
          className="cc-form-textarea"
          rows={3}
          maxLength={200}
          placeholder="Short description of the course (maximum 200 characters)"
          value={payload.short_description}
          onChange={(e) => handleThreesicChange("short_description", e.target.value)}
        />
        <div className={`cc-char-counter ${payload.short_description.length > 180 ? "error" : ""}`}>
          {payload.short_description.length}/200
        </div>
      </div>

      <div className="cc-form-group">
        <label className="cc-form-label">Category</label>
        <div className="cc-category-grid">
          <select
            className="cc-form-select"
            value={selectedCategoryGroup}
            onChange={(e) => setSelectedCategoryGroup(e.target.value)}
          >
            {CATEGORY_TAXONOMY.map((item) => (
              <option key={item.group} value={item.group}>
                {item.group}
              </option>
            ))}
          </select>
          {selectedCategoryGroup === "Khác" ? (
            <input
              className="cc-form-input"
              placeholder="Enter major..."
              value={customCategoryMajor}
              onChange={(e) => setCustomCategoryMajor(e.target.value)}
            />
          ) : (
            <select
              className="cc-form-select"
              value={selectedCategoryMajor}
              onChange={(e) => setSelectedCategoryMajor(e.target.value)}
            >
              {categoryMajors.map((major) => (
                <option key={major} value={major}>
                  {major}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="cc-category-preview">
          <span className="material-symbols-outlined">category</span>
          <span>Selected: <strong>{payload.category || "None"}</strong></span>
        </div>
      </div>

      <div className="cc-two-col">
        <div className="cc-form-group">
          <label className="cc-form-label">Level</label>
          <select
            className="cc-form-select"
            value={payload.level}
            onChange={(e) => handleThreesicChange("level", e.target.value as Level)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="cc-form-group">
          <label className="cc-form-label">Language</label>
          <select
            className="cc-form-select"
            value={payload.language}
            onChange={(e) =>
              handleThreesicChange("language", e.target.value as Language)
            }
          >
            <option value="vi">Vietnamese</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="cc-form-body">
      <div className="cc-form-group">
        <label className="cc-form-label">Full Description</label>
        <textarea
          className="cc-form-textarea"
          rows={8}
          placeholder="Full description of the course. You can paste rich text content from the editor."
          value={payload.full_description}
          onChange={(e) => handleThreesicChange("full_description", e.target.value)}
          style={{ minHeight: 200 }}
        />
      </div>

      <div className="cc-form-group">
        <label className="cc-form-label">Learning objectives</label>
        {payload.learning_objectives.map((item, idx) => (
          <div key={idx} className="cc-array-item">
            <input
              className="cc-form-input"
              placeholder="e.g., Understand basic Python syntax"
              value={item}
              onChange={(e) =>
                handleArrayChange("learning_objectives", idx, e.target.value)
              }
            />
            <button
              type="button"
              className="cc-link-btn danger"
              onClick={() => handleRemoveArrayItem("learning_objectives", idx)}
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          className="cc-link-btn"
          onClick={() => handleAddArrayItem("learning_objectives")}
        >
          <span className="material-symbols-outlined">add</span>
          Add objective
        </button>
      </div>

      <div className="cc-form-group">
        <label className="cc-form-label">Prerequisite Courses</label>
        <p className="cc-form-hint">Select the courses that must be completed before enrolling in this course.</p>
        <div className="cc-prereq-list">
          {prerequisiteOptions.length ? (
            prerequisiteOptions.map((c) => {
              const checked = selectedPrerequisiteIds.has(c.id);
              return (
                <label key={c.id} className="cc-prereq-item">
                  <input
                    type="checkbox"
                    className="cc-prereq-checkbox"
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
                  <span className="cc-prereq-title">{c.title}</span>
                </label>
              );
            })
          ) : (
            <div className="cc-prereq-empty">No courses available to select.</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="cc-form-body">
      <div className="cc-form-group">
        <label className="cc-form-label">Course Cover Image</label>
        <p className="cc-form-hint">Recommended size 1280x720, file size &lt; 2MB.</p>
        <label className="cc-image-upload">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
          />
          <span className="material-symbols-outlined cc-image-upload-icon">add_photo_alternate</span>
          <span className="cc-image-upload-text">
            <strong>Click to upload</strong> or drag and drop
          </span>
        </label>
      </div>

      {imagePreview && (
        <div className="cc-form-group">
          <label className="cc-form-label">Image Preview</label>
          <div className="cc-image-preview-wrapper">
            <img
              src={imagePreview}
              alt="Preview thumbnail"
              className="cc-image-preview"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="cc-form-body">
      <div className="cc-three-col">
        <div className="cc-form-group">
          <label className="cc-form-label">Price (VND)</label>
          <input
            className="cc-form-input"
            type="number"
            min={0}
            placeholder="Leave blank if free"
            value={payload.price ?? ""}
            onChange={(e) =>
              handleThreesicChange(
                "price",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </div>

        <div className="cc-form-group">
          <label className="cc-form-label">Certificate</label>
          <select
            className="cc-form-select"
            value={payload.has_certificate ? "yes" : "no"}
            onChange={(e) =>
              handleThreesicChange("has_certificate", e.target.value === "yes")
            }
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        <div className="cc-form-group">
          <label className="cc-form-label">Est. Hours</label>
          <input
            className="cc-form-input"
            type="number"
            min={0}
            placeholder="e.g., 25"
            value={payload.estimated_hours ?? ""}
            onChange={(e) =>
              handleThreesicChange(
                "estimated_hours",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
          />
        </div>

        <div className="cc-form-group">
          <label className="cc-form-label">Schedule Publish</label>
          <input
            className="cc-form-input"
            type="datetime-local"
            value={payload.publish_scheduled_at ?? ""}
            onChange={(e) => handleThreesicChange("publish_scheduled_at", e.target.value || null)}
          />
        </div>
      </div>

      <div className="cc-form-group">
        <label className="cc-form-label">Tags</label>
        <input
          className="cc-form-input"
          placeholder='python, programming, lập trình'
          value={payload.tags.join(", ")}
          onChange={(e) =>
            handleThreesicChange(
              "tags",
              e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)
            )
          }
        />
        <p className="cc-form-hint">Separate tags with commas.</p>
      </div>
    </div>
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
    <div className="cc-page">
      {!hideHeader && (
        <header className="cc-header">
          <div className="cc-header-left">
            <h1 className="cc-title">Create new course</h1>
            <p className="cc-subtitle">
              Fill in the information step by step. You can save as draft at any time.
            </p>
          </div>
        </header>
      )}

      <div className="cc-wizard-card">
        {renderStepIndicator()}

        <div className="cc-form-body">{renderStepContent()}</div>

        {error && (
          <div className="cc-error-box">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        <div className="cc-footer">
          <div className="cc-footer-left">
            <button
              type="button"
              className="cc-btn cc-btn-secondary danger"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cc-btn cc-btn-secondary"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined">save</span>
              Save Draft
            </button>
          </div>

          <div className="cc-footer-right">
            {step > 1 && (
              <button
                type="button"
                className="cc-btn cc-btn-secondary"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={isSubmitting}
              >
                <span className="material-symbols-outlined">chevron_left</span>
                Back
              </button>
            )}

            {step < maxStep && (
              <button
                type="button"
                className="cc-btn cc-btn-primary"
                onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
                disabled={isSubmitting || (step === 1 && !canGoNextFromStep1)}
              >
                Continue
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            )}

            {step === maxStep && (
              <button
                type="button"
                className="cc-btn cc-btn-primary"
                onClick={() => handleSave(true)}
                disabled={isSubmitting || !canGoNextFromStep1}
              >
                <span className="material-symbols-outlined">check</span>
                Create course
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
