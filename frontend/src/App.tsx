import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OAuthRedirectPage from "./pages/OAuthRedirectPage"; // Thêm import
import StudentDashboard from "./pages/leaner/StudentDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateCoursePage from "./pages/teacher/CreateCoursePage";
import TeacherCourseDetailPage from "./pages/teacher/TeacherCourseDetailPage";
import TeacherCourseOverviewPage from "./pages/teacher/TeacherCourseOverviewPage";
import TeacherQuestionBankPage from "./pages/teacher/TeacherQuestionBankPage";
import TeacherCourseAssessmentsPage from "./pages/teacher/TeacherCourseAssessmentsPage";
import TeacherCourseContentBuilderPage from "./pages/teacher/TeacherCourseContentBuilderPage";
import TeacherQuizEditorPage from "./pages/teacher/TeacherQuizEditorPage";
import TeacherAssignmentEditorPage from "./pages/teacher/TeacherAssignmentEditorPage";
import CoursesCatalogPage from "./pages/leaner/CoursesCatalogPage";
import CoursePublicDetailPage from "./pages/leaner/CoursePublicDetailPage";
import ProfilePage from "./pages/ProfilePage";
import LearningPage from "./pages/leaner/LearningPage";
import LearnerCourseHubPage from "./pages/leaner/LearnerCourseHubPage";
import LearningModuleLessonsPage from "./pages/leaner/LearningModuleLessonsPage";
import TeacherLessonRosterPage from "./pages/teacher/TeacherLessonRosterPage";
import LearnerQuizTakePage from "./pages/leaner/LearnerQuizTakePage";
import LearnerAssignmentSubmitPage from "./pages/leaner/LearnerAssignmentSubmitPage";
import Authentication from "./router/Authentication";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        path="/teacher/courses/:id/edit"
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
        path="/teacher/courses/:id/question-banks"
        element={
          <Authentication>
            <TeacherQuestionBankPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/quiz-editor"
        element={
          <Authentication>
            <TeacherQuizEditorPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/assignment-editor"
        element={
          <Authentication>
            <TeacherAssignmentEditorPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/assessments"
        element={
          <Authentication>
            <TeacherCourseAssessmentsPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/lessons/:lessonId/roster"
        element={
          <Authentication>
            <TeacherLessonRosterPage />
          </Authentication>
        }
      />
      <Route
        path="/learner/quiz/:courseId/:lessonId"
        element={
          <Authentication>
            <LearnerQuizTakePage />
          </Authentication>
        }
      />
      <Route
        path="/learner/assignment/:lessonId"
        element={
          <Authentication>
            <LearnerAssignmentSubmitPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id"
        element={
          <Authentication>
            <TeacherCourseOverviewPage />
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