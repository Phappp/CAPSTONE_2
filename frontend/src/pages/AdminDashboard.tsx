import AvatarMenu from "../components/AvatarMenu";

export default function AdminDashboard() {
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
          <h1 className="dashboard-title">Trang quản trị</h1>
          <p className="dashboard-subtitle">
            Đây là trang dành cho Admin. Bạn có thể bổ sung các chức năng quản
            trị tại đây.
          </p>
        </div>
        <AvatarMenu />
      </div>
    </div>
  );
}


