import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Authentication from "./router/Authentication";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/student/dashboard"
        element={
          <Authentication>
            <StudentDashboard />
          </Authentication>
        }
      />
      <Route
        path="/teacher/dashboard"
        element={
          <Authentication>
            <TeacherDashboard />
          </Authentication>
        }
      />
      <Route
        path="/admin"
        element={
          <Authentication>
            <AdminDashboard />
          </Authentication>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
