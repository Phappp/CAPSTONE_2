import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CreateCoursePage from "./pages/CreateCoursePage";
import TeacherCourseDetailPage from "./pages/TeacherCourseDetailPage";
import TeacherCourseContentBuilderPage from "./pages/TeacherCourseContentBuilderPage";
import CoursesCatalogPage from "./pages/CoursesCatalogPage";
import CoursePublicDetailPage from "./pages/CoursePublicDetailPage";
import ProfilePage from "./pages/ProfilePage";
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
        path="/profile"
        element={
          <Authentication>
            <ProfilePage />
          </Authentication>
        }
      />

      <Route
        path="/courses"
        element={
          <Authentication>
            <CoursesCatalogPage />
          </Authentication>
        }
      />
      <Route
        path="/courses/:slug"
        element={
          <Authentication>
            <CoursePublicDetailPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/new"
        element={
          <Authentication>
            <CreateCoursePage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id"
        element={
          <Authentication>
            <TeacherCourseDetailPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/content"
        element={
          <Authentication>
            <TeacherCourseContentBuilderPage />
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
