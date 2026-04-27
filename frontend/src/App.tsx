import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/authentication/LoginPage";
import RegisterPage from "./pages/authentication/RegisterPage";
import ForgotPasswordPage from "./pages/authentication/ForgotPasswordPage";
import ResetPasswordPage from "./pages/authentication/ResetPasswordPage";
import OAuthRedirectPage from "./pages/authentication/OAuthRedirectPage"; // Thêm import
import StudentDashboard from "./pages/leaner/StudentDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourseContentReviewPage from "./pages/admin/AdminCourseContentReviewPage";
import CreateCoursePage from "./pages/teacher/CreateCoursePage";
import TeacherCourseDetailPage from "./pages/teacher/TeacherCourseDetailPage";
import TeacherCourseOverviewPage from "./pages/teacher/TeacherCourseOverviewPage";
import TeacherQuestionBankPage from "./pages/teacher/TeacherQuestionBankPage";
import TeacherCourseAssessmentsPage from "./pages/teacher/TeacherCourseAssessmentsPage";
import TeacherCourseContentBuilderPage from "./pages/teacher/TeacherCourseContentBuilderPage";
import TeacherQuizEditorPage from "./pages/teacher/TeacherQuizEditorPage";
import TeacherAssignmentEditorPage from "./pages/teacher/TeacherAssignmentEditorPage";
import TeacherLessonStudioPage from "./pages/teacher/TeacherLessonStudioPage";
import CoursesCatalogPage from "./pages/leaner/CoursesCatalogPage";
import CoursePublicDetailPage from "./pages/leaner/CoursePublicDetailPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileSecurityPage from "./pages/ProfileSecurityPage";
import LearningPage from "./pages/leaner/LearningPage";
import LearnerCourseHubPage from "./pages/leaner/LearnerCourseHubPage";
import LearningModuleLessonsPage from "./pages/leaner/LearningModuleLessonsPage";
import TeacherLessonRosterPage from "./pages/teacher/TeacherLessonRosterPage";
import LearnerQuizTakePage from "./pages/leaner/LearnerQuizTakePage";
import LearnerAssignmentSubmitPage from "./pages/leaner/LearnerAssignmentSubmitPage";
import PaymentResultPage from "./pages/leaner/PaymentResultPage";
import MockPaymentPage from "./pages/leaner/MockPaymentPage";
import LearnerSidebarLayout from "./layouts/LearnerSidebarLayout";
import Authentication from "./router/Authentication";
import LandingPage from "./pages/LandingPage";
import SystemStatusOrb from "./components/SystemStatusOrb";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/oauth/redirect" element={<OAuthRedirectPage />} /> {/* Thêm route mới */}

      <Route
        path="/student/dashboard"
        element={
          <Authentication allowedRoles={["learner", "student"]}>
            <StudentDashboard />
          </Authentication>
        }
      />
      <Route
        path="/teacher/dashboard"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
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
        path="/profile/security"
        element={
          <Authentication>
            <ProfileSecurityPage />
          </Authentication>
        }
      />

      <Route
        element={
          <Authentication allowedRoles={["learner", "student"]}>
            <LearnerSidebarLayout />
          </Authentication>
        }
      >
        <Route path="/courses" element={<CoursesCatalogPage />} />
        <Route path="/courses/:slug" element={<CoursePublicDetailPage />} />
        <Route path="/learning/:id/:slug" element={<LearningPage />} />
        <Route path="/learning/:id/:slug/modules/:moduleId" element={<LearningModuleLessonsPage />} />
        <Route path="/my-courses/:id/:slug" element={<LearnerCourseHubPage />} />
        <Route path="/learner/quiz/:courseId/:lessonId" element={<LearnerQuizTakePage />} />
        <Route path="/learner/assignment/:lessonId" element={<LearnerAssignmentSubmitPage />} />
        <Route path="/mock-payment" element={<MockPaymentPage />} />
        <Route path="/payment-result" element={<PaymentResultPage />} />
      </Route>
      <Route
        path="/teacher/courses/new"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <CreateCoursePage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/edit"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherCourseDetailPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/content"
        element={
          <Authentication allowedRoles={["course_manager", "teacher", "admin"]}>
            <TeacherCourseContentBuilderPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/question-banks"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherQuestionBankPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/quiz-editor"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherQuizEditorPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/assignment-editor"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherAssignmentEditorPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/assessments"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherCourseAssessmentsPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/lessons/:lessonId/roster"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherLessonRosterPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id/lessons/:lessonId/studio"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherLessonStudioPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:id"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherCourseOverviewPage />
          </Authentication>
        }
      />
      <Route
        path="/admin"
        element={
          <Authentication allowedRoles={["admin"]}>
            <AdminDashboard />
          </Authentication>
        }
      />
      <Route
        path="/admin/courses/:id/content-review"
        element={
          <Authentication allowedRoles={["admin"]}>
            <AdminCourseContentReviewPage />
          </Authentication>
        }
      />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SystemStatusOrb />
    </>
  );
}