import AvatarMenu from "../components/AvatarMenu";

export default function TeacherDashboard() {
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
    </div>
  );
}


