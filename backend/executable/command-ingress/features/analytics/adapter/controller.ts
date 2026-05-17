/**
 * Analytics Controller
 */

import { Request, Response } from "express";
import { analyticsService, RiskRow, AtRiskSummary, ProgressBucket, HeatmapPoint } from "../domain/service";

export class AnalyticsController {
  /**
   * GET /api/v1/courses/:courseId/analytics/risk
   * Lấy danh sách học viên với phân tích risk
   */
  async getRiskAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const courseId = parseInt(req.params.courseId);
      const filter = (req.query.filter as "all" | "at_risk") || "all";

      if (isNaN(courseId)) {
        res.status(400).json({ success: false, message: "Invalid course ID" });
        return;
      }

      const risks: RiskRow[] = await analyticsService.getRiskAnalysis(courseId, filter);
      
      res.json({
        success: true,
        data: risks,
        total: risks.length,
      });
    } catch (error) {
      console.error("[AnalyticsController] getRiskAnalysis error:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to get risk analysis" 
      });
    }
  }

  /**
   * GET /api/v1/courses/:courseId/analytics/at-risk-summary
   * Lấy tóm tắt số lượng học viên at-risk
   */
  async getAtRiskSummary(req: Request, res: Response): Promise<void> {
    try {
      const courseId = parseInt(req.params.courseId);

      if (isNaN(courseId)) {
        res.status(400).json({ success: false, message: "Invalid course ID" });
        return;
      }

      const summary: AtRiskSummary = await analyticsService.getAtRiskSummary(courseId);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("[AnalyticsController] getAtRiskSummary error:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to get at-risk summary" 
      });
    }
  }

  /**
   * GET /api/v1/courses/:courseId/analytics/progress-distribution
   * Lấy phân bố tiến độ học tập
   */
  async getProgressDistribution(req: Request, res: Response): Promise<void> {
    try {
      const courseId = parseInt(req.params.courseId);

      if (isNaN(courseId)) {
        res.status(400).json({ success: false, message: "Invalid course ID" });
        return;
      }

      const distribution: ProgressBucket[] = await analyticsService.getProgressDistribution(courseId);
      
      res.json({
        success: true,
        data: distribution,
      });
    } catch (error) {
      console.error("[AnalyticsController] getProgressDistribution error:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to get progress distribution" 
      });
    }
  }

  /**
   * GET /api/v1/courses/:courseId/analytics/engagement-heatmap
   * Lấy engagement heatmap
   */
  async getEngagementHeatmap(req: Request, res: Response): Promise<void> {
    try {
      const courseId = parseInt(req.params.courseId);
      const days = parseInt(req.query.days as string) || 7;

      if (isNaN(courseId)) {
        res.status(400).json({ success: false, message: "Invalid course ID" });
        return;
      }

      const heatmap: HeatmapPoint[] = await analyticsService.getEngagementHeatmap(courseId, days);
      
      res.json({
        success: true,
        data: heatmap,
        days,
      });
    } catch (error) {
      console.error("[AnalyticsController] getEngagementHeatmap error:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to get engagement heatmap" 
      });
    }
  }
}

export const analyticsController = new AnalyticsController();
