import { Routes, Route, Navigate } from "react-router-dom";

import ScrollToTop from "./router/ScrollToTop";
import Authentication from "./router/Authentication";

import LoginPage from "./pages/authentication/LoginPage";
import RegisterPage from "./pages/authentication/RegisterPage";
import ForgotPasswordPage from "./pages/authentication/ForgotPasswordPage";
import ResetPasswordPage from "./pages/authentication/ResetPasswordPage";
import OAuthRedirectPage from "./pages/authentication/OAuthRedirectPage";
import MFAVerificationPage from "./pages/authentication/MFAVerificationPage";

import CoursesCatalogPage from "./pages/landing/CoursesCatalogPage";
import CourseDetailPage from "./pages/landing/CourseDetailPage";
import InstructorsDirectoryPage from "./pages/landing/InstructorsDirectoryPage";
import InstructorDetailPage from "./pages/landing/InstructorDetailPage";
import PricingPlansPage from "./pages/landing/PricingPlansPage";
import ResourcesHubPage from "./pages/landing/ResourcesHubPage";
import ProfilePage from "./pages/landing/ProfilePage";
import ProfileSecurityPage from "./pages/landing/ProfileSecurityPage";
import LearningPage from "./pages/learner/LearningPage";
import LearnerCourseHubPage from "./pages/learner/LearnerCourseHubPage";
import LearningModuleLessonsPage from "./pages/learner/LearningModuleLessonsPage";
import LearnerQuizTakePage from "./pages/learner/LearnerQuizTakePage";
import PaymentResultPage from "./pages/learner/PaymentResultPage";
import MockPaymentPage from "./pages/learner/MockPaymentPage";
import LiveSessionViewer from "./pages/learner/LiveSessionViewer";

// New improving learner experience pages
import LearnerDashboard from "./pages/learner/LearnerDashboard";
import MyCoursePage from "./pages/learner/MyCoursePage";
import MyCertificates from "./pages/learner/MyCertificates";
import LearningWorkspace from "./pages/learner/LearningWorkspace";
import AssignmentSubmission from "./pages/learner/AssignmentSubmission";
import QuizSubmission from "./pages/learner/QuizSubmission";
import LiveSessionsSchedule from "./pages/learner/LiveSessionsSchedule";
import ProfileSettings from "./pages/learner/ProfileSettings";


import TeacherDashboard from "./pages/courseManager/TeacherDashboard";
import CreateCoursePage from "./pages/courseManager/CreateCoursePage";
import TeacherCourseDetailPage from "./pages/courseManager/TeacherCourseDetailPage";
import TeacherCourseOverviewPage from "./pages/courseManager/TeacherCourseOverviewPage";
import TeacherGradingCenterPage from "./pages/courseManager/TeacherGradingCenterPage";
import TeacherQuestionBankPage from "./pages/courseManager/TeacherQuestionBankPage";
import TeacherCourseAssessmentsPage from "./pages/courseManager/TeacherCourseAssessmentsPage";
import TeacherCourseContentBuilderPage from "./pages/courseManager/TeacherCourseContentBuilderPage";
import TeacherQuizEditorPage from "./pages/courseManager/TeacherQuizEditorPage";
import TeacherAssignmentEditorPage from "./pages/courseManager/TeacherAssignmentEditorPage";
import TeacherLessonStudioPage from "./pages/courseManager/TeacherLessonStudioPage";
import TeacherLessonRosterPage from "./pages/courseManager/TeacherLessonRosterPage";
import TeacherLiveSessionPage from "./pages/courseManager/LiveSessionPage";
import DiscussionBoardManagementPage from "./pages/courseManager/DiscussionBoardManagementPage";
import StudentAnalyticsPage from "./pages/courseManager/StudentAnalyticsPage";

// New React TSX pages (converted from HTML)
import CourseManagerPage from "./pages/courseManager/CourseManagerPage";
import GradingFeedbackStationPage from "./pages/courseManager/GradingFeedbackStationPage";
import AssignmentBuilderPage from "./pages/courseManager/AssignmentBuilderPage";
import CourseManagerDashboardPage from "./pages/courseManager/CourseManagerDashboardPage";
import CourseBuilderPage from "./pages/courseManager/CourseBuilderPage";
import ExampleMarketplacePage from "./pages/landing/ExampleMarketplacePage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourseContentReviewPage from "./pages/admin/AdminCourseContentReviewPage";


import LandingPage from "./pages/landing/LandingPage";
import PrivacyPage from "./pages/landing/PrivacyPage";
import ContactUsPage from "./pages/landing/ContactUsPage";

import LearnerSidebarLayout from "./layouts/LearnerSidebarLayout";
import MarketingSidebarLayout from "./layouts/MarketingSidebarLayout";
import SystemStatusOrb from "./components/SystemStatusOrb";

// Shared visual-tokens overlay for the big teacher pages
// (Dashboard, ContentBuilder, CourseDetail, GradingCenter).
// Additive only — refines hover/focus/transitions without changing layout.
import "./pages/courseManager/teacher-design-polish.css";
// import TeacherLiveSessionPage from "./pages/teacher/LiveSessionPage";
// import LiveSessionViewer from "./pages/leaner/LiveSessionViewer";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/oauth/redirect" element={<OAuthRedirectPage />} />
        <Route path="/mfa-verify" element={<MFAVerificationPage />} />

        {/* Public marketing pages — with sidebar layout */}
        <Route element={<MarketingSidebarLayout />}>
          <Route path="/courses" element={<CoursesCatalogPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/instructors" element={<InstructorsDirectoryPage />} />
          <Route path="/instructors/:id" element={<InstructorDetailPage />} />
          <Route path="/pricing" element={<PricingPlansPage />} />
          <Route path="/resources" element={<ResourcesHubPage />} />
        </Route>

      <Route path="/student/dashboard" element={<Navigate to="/learner/dashboard" replace />} />
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
        <Route path="/learning/:id/:slug" element={<LearningPage />} />
        <Route path="/learning/:id/:slug/modules/:moduleId" element={<LearningModuleLessonsPage />} />
        <Route path="/my-courses/:id/:slug" element={<LearnerCourseHubPage />} />
        <Route path="/learner/assignment/:lessonId" element={<AssignmentSubmission />} />
        <Route path="/mock-payment" element={<MockPaymentPage />} />
        <Route path="/payment-result" element={<PaymentResultPage />} />

        {/* New learner experience pages — standard endpoints */}
        <Route path="/learner/dashboard" element={<LearnerDashboard />} />
        <Route path="/learner/my-courses" element={<MyCoursePage />} />
        <Route path="/learner/certificates" element={<MyCertificates />} />
        <Route path="/learner/workspace" element={<LearningWorkspace />} />
        <Route path="/learner/schedule" element={<LiveSessionsSchedule />} />
        <Route path="/learner/settings" element={<ProfileSettings />} />
      </Route>
      <Route
        path="/learner/quizzes"
        element={
          <Authentication allowedRoles={["learner", "student"]}>
            <QuizSubmission />
          </Authentication>
        }
      />
      <Route
        path="/learner/assignments"
        element={
          <Authentication allowedRoles={["learner", "student"]}>
            <AssignmentSubmission />
          </Authentication>
        }
      />
      <Route
        path="/learner/quiz/:courseId/:lessonId"
        element={
          <Authentication allowedRoles={["learner", "student"]}>
            <LearnerQuizTakePage />
          </Authentication>
        }
      />
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
        path="/teacher/courses/:id/grading"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherGradingCenterPage />
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
        path="/teacher/live-sessions"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherLiveSessionPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/live-sessions/:courseId"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <TeacherLiveSessionPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/discussions"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <DiscussionBoardManagementPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:courseId/discussions"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <DiscussionBoardManagementPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/analytics"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <StudentAnalyticsPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/courses/:courseId/analytics"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <StudentAnalyticsPage />
          </Authentication>
        }
      />
      {/* New TSX converted pages */}
      <Route
        path="/teacher/course-manager"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <CourseManagerPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/grading-station"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <GradingFeedbackStationPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/assignment-builder"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <AssignmentBuilderPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/instructor-dashboard"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <CourseManagerDashboardPage />
          </Authentication>
        }
      />
      <Route
        path="/teacher/course-builder"
        element={
          <Authentication allowedRoles={["course_manager", "teacher"]}>
            <CourseBuilderPage />
          </Authentication>
        }
      />
      <Route path="/marketplace" element={<ExampleMarketplacePage />} />
      {/* Test route without authentication */}
      <Route path="/test-course-builder" element={<CourseBuilderPage />} />
      <Route
        path="/live-sessions"
        element={
          <Authentication allowedRoles={["learner", "student"]}>
            <LiveSessionViewer />
          </Authentication>
        }
      />
      <Route
        path="/live-session/:sessionId"
        element={
          <Authentication allowedRoles={["learner", "student"]}>
            <LiveSessionViewer />
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
    </>
  );
}