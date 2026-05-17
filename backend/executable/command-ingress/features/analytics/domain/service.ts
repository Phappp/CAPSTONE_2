/**
 * Analytics Service
 * Cung cấp các API phân tích học viên cho giảng viên
 */

import AppDataSource from "../../../../../lib/database";
import CourseEnrollment from "../../../../../internal/model/course_enrollment";
import LessonProgress from "../../../../../internal/model/lesson_progress";
import QuizAttempt from "../../../../../internal/model/quiz_attempt";
import Submission from "../../../../../internal/model/submissions";
import SubmissionFeedback from "../../../../../internal/model/submission_feedback";
import Course from "../../../../../internal/model/course";
import User from "../../../../../internal/model/user";
import { DataSource } from "typeorm";

export type RiskLevel = "high" | "medium" | "low";

export type RiskRow = {
  id: string;
  user_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  course_id: number;
  course_title: string;
  engagement_pct: number;
  quiz_avg_pct: number | null;
  assignment_avg_pct: number | null;
  risk: RiskLevel;
  last_activity_at: string | null;
};

export type ProgressBucket = {
  label: string;
  value_count: number;
  value_pct: number;
};

export type HeatmapPoint = {
  day: number; // 0 = Monday, 6 = Sunday
  hour_slot: number; // 0 = 0-8h, 1 = 8-12h, 2 = 12-16h, 3 = 16-20h, 4 = 20-24h
  activity_count: number;
  level: number; // 0-4
};

export type AtRiskSummary = {
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  total_enrolled: number;
  at_risk_pct: number;
};

export class AnalyticsService {
  private db: DataSource;

  constructor() {
    this.db = AppDataSource;
  }

  /**
   * Lấy danh sách học viên với phân tích risk
   */
  async getRiskAnalysis(
    courseId: number,
    filter: "all" | "at_risk" = "all"
  ): Promise<RiskRow[]> {
    const enrollmentRepo = this.db.getRepository(CourseEnrollment);
    const quizAttemptRepo = this.db.getRepository(QuizAttempt);
    const submissionRepo = this.db.getRepository(Submission);
    const lessonProgressRepo = this.db.getRepository(LessonProgress);
    const userRepo = this.db.getRepository(User);
    const courseRepo = this.db.getRepository(Course);

    // Get course info
    const course = await courseRepo.findOne({ where: { id: courseId } });
    if (!course) return [];

    // Get enrolled students
    const enrollments = await enrollmentRepo
      .createQueryBuilder("enrollment")
      .innerJoinAndSelect("enrollment.user", "user")
      .where("enrollment.course_id = :courseId", { courseId })
      .andWhere("enrollment.status IN (:...statuses)", { statuses: ["active", "completed"] })
      .getMany();

    const results: RiskRow[] = [];

    for (const enrollment of enrollments) {
      const user = enrollment.user;

      // Calculate engagement based on lesson progress
      const totalProgress = await lessonProgressRepo
        .createQueryBuilder("lp")
        .select("SUM(lp.time_spent_seconds)", "total")
        .where("lp.user_id = :userId", { userId: user.id })
        .andWhere("lp.course_id = :courseId", { courseId })
        .getRawOne();

      const maxExpectedTime = 60 * 60 * 10; // 10 hours in seconds
      const totalTime = Number(totalProgress?.total) || 0;
      const engagementPct = Math.min(100, Math.round((totalTime / maxExpectedTime) * 100));

      // Calculate quiz average - join through lesson -> module
      const quizAttempts = await quizAttemptRepo
        .createQueryBuilder("qa")
        .innerJoin("qa.quiz", "quiz")
        .innerJoin("quiz.lesson", "lesson")
        .innerJoin("lesson.module", "module")
        .select("AVG(qa.score)", "avgScore")
        .where("qa.user_id = :userId", { userId: user.id })
        .andWhere("module.course_id = :courseId", { courseId })
        .andWhere("qa.status = :status", { status: "graded" })
        .getRawOne();

      const quizAvgPct = quizAttempts?.avgScore ? Number(quizAttempts.avgScore) : null;

      // Calculate assignment average - join through lesson -> module -> submission -> submission_feedback
      const assignmentSubmissions = await submissionRepo
        .createQueryBuilder("s")
        .innerJoin("s.assignment", "a")
        .innerJoin("a.lesson", "lesson")
        .innerJoin("lesson.module", "module")
        .innerJoin("submission_feedback", "sf", "sf.submission_id = s.id")
        .select("AVG(sf.score)", "avgScore")
        .where("s.user_id = :userId", { userId: user.id })
        .andWhere("module.course_id = :courseId", { courseId })
        .andWhere("s.status = :status", { status: "graded" })
        .getRawOne();

      const assignmentAvgPct = assignmentSubmissions?.avgScore ? Number(assignmentSubmissions.avgScore) : null;

      // Calculate risk level
      // High: engagement < 30% AND (quiz < 50% OR no quiz)
      // Medium: engagement < 50% AND (quiz < 70% OR no quiz)
      // Low: otherwise
      let risk: RiskLevel = "low";
      if (engagementPct < 30 && (quizAvgPct === null || quizAvgPct < 50)) {
        risk = "high";
      } else if (engagementPct < 50 && (quizAvgPct === null || quizAvgPct < 70)) {
        risk = "medium";
      }

      // Apply filter
      if (filter === "at_risk" && risk === "low") continue;

      results.push({
        id: `enrollment-${enrollment.id}`,
        user_id: user.id,
        name: user.full_name || user.email || "Unknown",
        email: user.email || "",
        avatar_url: user.avatar_url || null,
        course_id: courseId,
        course_title: course.title,
        engagement_pct: engagementPct,
        quiz_avg_pct: quizAvgPct,
        assignment_avg_pct: assignmentAvgPct,
        risk,
        last_activity_at: enrollment.last_accessed_at?.toISOString() || null,
      });
    }

    // Sort by risk level (high first), then by engagement (low first)
    return results.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      const riskDiff = riskOrder[a.risk] - riskOrder[b.risk];
      if (riskDiff !== 0) return riskDiff;
      return a.engagement_pct - b.engagement_pct;
    });
  }

  /**
   * Lấy tóm tắt at-risk
   */
  async getAtRiskSummary(courseId: number): Promise<AtRiskSummary> {
    const risks = await this.getRiskAnalysis(courseId, "all");
    
    const highRiskCount = risks.filter(r => r.risk === "high").length;
    const mediumRiskCount = risks.filter(r => r.risk === "medium").length;
    const lowRiskCount = risks.filter(r => r.risk === "low").length;
    const total = risks.length;

    return {
      high_risk_count: highRiskCount,
      medium_risk_count: mediumRiskCount,
      low_risk_count: lowRiskCount,
      total_enrolled: total,
      at_risk_pct: total > 0 ? Math.round(((highRiskCount + mediumRiskCount) / total) * 100) : 0,
    };
  }

  /**
   * Lấy phân bố tiến độ học tập
   */
  async getProgressDistribution(courseId: number): Promise<ProgressBucket[]> {
    const enrollmentRepo = this.db.getRepository(CourseEnrollment);

    const enrollments = await enrollmentRepo
      .createQueryBuilder("enrollment")
      .select("enrollment.progress_percent", "progress")
      .addSelect("COUNT(*)", "count")
      .where("enrollment.course_id = :courseId", { courseId })
      .andWhere("enrollment.status IN (:...statuses)", { statuses: ["active", "completed"] })
      .groupBy("enrollment.progress_percent")
      .getRawMany();

    const total = enrollments.reduce((sum, e) => sum + Number(e.count), 0);

    // Group into buckets
    const buckets: Record<string, number> = {
      "0-25%": 0,
      "26-50%": 0,
      "51-75%": 0,
      "76-99%": 0,
      "100%": 0,
    };

    for (const e of enrollments) {
      const progress = Number(e.progress) || 0;
      const count = Number(e.count);
      
      if (progress <= 25) buckets["0-25%"] += count;
      else if (progress <= 50) buckets["26-50%"] += count;
      else if (progress <= 75) buckets["51-75%"] += count;
      else if (progress < 100) buckets["76-99%"] += count;
      else buckets["100%"] += count;
    }

    return Object.entries(buckets).map(([label, value_count]) => ({
      label,
      value_count,
      value_pct: total > 0 ? Math.round((value_count / total) * 100) : 0,
    }));
  }

  /**
   * Lấy engagement heatmap (7 ngày × 5 khung giờ)
   */
  async getEngagementHeatmap(
    courseId: number,
    days: number = 7
  ): Promise<HeatmapPoint[]> {
    const lessonProgressRepo = this.db.getRepository(LessonProgress);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const activities = await lessonProgressRepo
      .createQueryBuilder("lp")
      .select("lp.updated_at", "updatedAt")
      .where("lp.course_id = :courseId", { courseId })
      .andWhere("lp.updated_at >= :since", { since })
      .getRawMany();

    // Initialize heatmap grid: 7 days × 5 time slots
    const grid: number[][] = Array.from({ length: 7 }, () => Array(5).fill(0));

    for (const activity of activities) {
      const date = new Date(activity.updatedAt);
      const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Mon=0, Sun=6
      const hour = date.getHours();
      
      // Map hour to slot: 0=0-8, 1=8-12, 2=12-16, 3=16-20, 4=20-24
      let slot: number;
      if (hour < 8) slot = 0;
      else if (hour < 12) slot = 1;
      else if (hour < 16) slot = 2;
      else if (hour < 20) slot = 3;
      else slot = 4;

      grid[dayOfWeek][slot]++;
    }

    // Find max for normalization
    const maxActivity = Math.max(1, ...grid.flat());

    // Convert to response format
    const result: HeatmapPoint[] = [];
    for (let day = 0; day < 7; day++) {
      for (let slot = 0; slot < 5; slot++) {
        const count = grid[day][slot];
        // Level 0-4 based on activity percentage
        const pct = count / maxActivity;
        let level: number;
        if (count === 0) level = 0;
        else if (pct < 0.25) level = 1;
        else if (pct < 0.5) level = 2;
        else if (pct < 0.75) level = 3;
        else level = 4;

        result.push({
          day,
          hour_slot: slot,
          activity_count: count,
          level,
        });
      }
    }

    return result;
  }
}

export const analyticsService = new AnalyticsService();
