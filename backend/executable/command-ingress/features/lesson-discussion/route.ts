/**
 * Routes cho Discussion feature
 */
import express from "express";
import { DiscussionController } from "./controller";
import { DiscussionService } from "./service";
import { DiscussionRepository } from "./repository";
import requireAuthorizedUser, { optionalAuthorizedUser } from "../../middlewares/auth";

export const initDiscussionRoutes = (controller: DiscussionController): express.Router => {
  const router = express.Router({ mergeParams: true });

  // Routes đọc (xem danh sách, chi tiết) - không cần đăng nhập
  router.get("/", optionalAuthorizedUser, controller.getDiscussions);
  router.get("/:discussionId", optionalAuthorizedUser, controller.getDiscussionDetail);

  // Routes ghi (tạo/sửa/xóa) - cần đăng nhập
  router.post("/", requireAuthorizedUser, controller.createDiscussion);
  router.patch("/:discussionId", requireAuthorizedUser, controller.updateDiscussion);
  router.delete("/:discussionId", requireAuthorizedUser, controller.deleteDiscussion);

  // Routes reply
  router.post("/:discussionId/replies", requireAuthorizedUser, controller.createReply);
  router.delete("/:discussionId/replies/:replyId", requireAuthorizedUser, controller.deleteReply);

  return router;
};

// Factory function để tạo controller với dependencies
export function createDiscussionController(): DiscussionController {
  const repo = new DiscussionRepository();
  const service = new DiscussionService(repo);
  return new DiscussionController(service);
}
