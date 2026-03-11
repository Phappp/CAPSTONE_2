import AvatarMenu from "../components/AvatarMenu";
import { useNavigate } from "react-router-dom";

export default function TeacherDashboard() {
  const navigate = useNavigate();
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
            Đây là trang dashboard dành cho Giảng viên. Bạn có thể tùy chỉnh
            nội dung sau.
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

      {/* TODO: danh sách khóa học của giảng viên sẽ hiển thị ở đây */}
    </div>
  );
}


