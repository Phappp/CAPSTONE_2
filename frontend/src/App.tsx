import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OAuthRedirectPage from "./pages/OAuthRedirectPage"; // Thêm import
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CreateCoursePage from "./pages/CreateCoursePage";
import TeacherCourseDetailPage from "./pages/TeacherCourseDetailPage";
import TeacherCourseContentBuilderPage from "./pages/TeacherCourseContentBuilderPage";
import CoursesCatalogPage from "./pages/CoursesCatalogPage";
import CoursePublicDetailPage from "./pages/CoursePublicDetailPage";
import ProfilePage from "./pages/ProfilePage";
import LearningPage from "./pages/LearningPage";
import LearnerCourseHubPage from "./pages/LearnerCourseHubPage";
import LearningModuleLessonsPage from "./pages/LearningModuleLessonsPage";
import CreateAssessmentPage from "./pages/CreateAssessmentPage";
import StudentQuizPage from "./pages/StudentQuizPage";
import StudentQuizAttemptPage from "./pages/StudentQuizAttemptPage";
import Authentication from "./router/Authentication";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/oauth/redirect" element={<OAuthRedirectPage />} /> {/* Thêm route mới */}

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
        path="/learning/:id/:slug"
        element={
          <Authentication>
            <LearningPage />
          </Authentication>
        }
      />
      <Route
        path="/learning/:id/:slug/modules/:moduleId"
        element={
          <Authentication>
            <LearningModuleLessonsPage />
          </Authentication>
        }
      />
      <Route
        path="/my-courses/:id/:slug"
        element={
          <Authentication>
            <LearnerCourseHubPage />
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

      //tran an thuyen task
         
      <Route
        path="/teacher/courses/:courseId/lessons/:lessonId/assessment/new"
        element={
          <Authentication>
            <CreateAssessmentPage />
          </Authentication>
        }
      />
      <Route
        path="/quizzes/:quizId"
        element={
          <Authentication>
            <StudentQuizPage />
          </Authentication>
        }
      />
      <Route
        path="/quizzes/:quizId/attempts/:attemptId"
        element={
          <Authentication>
            <StudentQuizAttemptPage />
          </Authentication>
        }
      />

      //

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