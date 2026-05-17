/**
 * Analytics Routes
 */

import express from "express";
import { analyticsController } from "./controller";
import requireAuthorizedUser from "../../../middlewares/auth";

const initAnalyticsRoute = () => {
  const router = express.Router();

  // Risk analysis
  router.route('/courses/:courseId/analytics/risk')
    .get(requireAuthorizedUser, analyticsController.getRiskAnalysis.bind(analyticsController));

  // At-risk summary
  router.route('/courses/:courseId/analytics/at-risk-summary')
    .get(requireAuthorizedUser, analyticsController.getAtRiskSummary.bind(analyticsController));

  // Progress distribution
  router.route('/courses/:courseId/analytics/progress-distribution')
    .get(requireAuthorizedUser, analyticsController.getProgressDistribution.bind(analyticsController));

  // Engagement heatmap
  router.route('/courses/:courseId/analytics/engagement-heatmap')
    .get(requireAuthorizedUser, analyticsController.getEngagementHeatmap.bind(analyticsController));

  return router;
};

export default initAnalyticsRoute;
