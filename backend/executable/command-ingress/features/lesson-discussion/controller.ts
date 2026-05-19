/**
 * Controller cho Discussion feature
 */
import { Response } from "express";
import { HttpRequest } from "../../types";
import { DiscussionService } from "./service";
import {
  CreateDiscussionRequest,
  UpdateDiscussionRequest,
  CreateReplyRequest,
  DiscussionListQuery,
  ReplyListQuery,
} from "./types";

// Mock user roles - trong thực tế nên lấy từ auth service
async function getUserRoles(userId: number): Promise<string[]> {
  const AppDataSource = (await import("../../../../lib/database")).default;
  
  const rows = await AppDataSource.query(
    `SELECT r.name FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId]
  ) as { name: string }[];
  
  return rows.map(r => r.name.toLowerCase());
}

export class DiscussionController {
  constructor(private readonly service: DiscussionService) {}

  /**
   * GET /lessons/:lessonId/discussions
   * Lấy danh sách discussions cho một lesson
   */
  getDiscussions = async (req: HttpRequest, res: Response) => {
    try {
      const lessonId = Number(req.params.lessonId);
      if (!lessonId) {
        return res.status(400).json({
          success: false,
          message: "ID bài học không hợp lệ",
        });
      }

      const query: DiscussionListQuery = {
        page: req.query.page ? Number(req.query.page) : 1,
        page_size: req.query.page_size ? Number(req.query.page_size) : 20,
        status: req.query.status as any,
        sort_by: req.query.sort_by as any,
        sort_dir: req.query.sort_dir as any,
      };

      const result = await this.service.getDiscussionsByLesson(lessonId, query);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy danh sách thảo luận",
      });
    }
  };

  /**
   * GET /lessons/:lessonId/discussions/:discussionId
   * Lấy chi tiết một discussion
   */
  getDiscussionDetail = async (req: HttpRequest, res: Response) => {
    try {
      const discussionId = Number(req.params.discussionId);
      if (!discussionId) {
        return res.status(400).json({
          success: false,
          message: "ID thảo luận không hợp lệ",
        });
      }

      const discussion = await this.service.getDiscussionById(discussionId);

      if (!discussion) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thảo luận",
        });
      }

      return res.status(200).json({
        success: true,
        data: discussion,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy chi tiết thảo luận",
      });
    }
  };

  /**
   * POST /lessons/:lessonId/discussions
   * Tạo thread thảo luận mới
   */
  createDiscussion = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const lessonId = Number(req.params.lessonId);
      if (!lessonId) {
        return res.status(400).json({
          success: false,
          message: "ID bài học không hợp lệ",
        });
      }

      const data: CreateDiscussionRequest = {
        title: req.body.title,
        content: req.body.content,
      };

      const roles = await getUserRoles(userId);
      const discussion = await this.service.createDiscussion(lessonId, userId, data, roles);

      return res.status(201).json({
        success: true,
        message: "Tạo thảo luận thành công",
        data: discussion,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể tạo thảo luận",
      });
    }
  };

  /**
   * PATCH /lessons/:lessonId/discussions/:discussionId
   * Cập nhật discussion
   */
  updateDiscussion = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const discussionId = Number(req.params.discussionId);
      if (!discussionId) {
        return res.status(400).json({
          success: false,
          message: "ID thảo luận không hợp lệ",
        });
      }

      const data: UpdateDiscussionRequest = {
        title: req.body.title,
        content: req.body.content,
        is_pinned: req.body.is_pinned,
        is_resolved: req.body.is_resolved,
      };

      const roles = await getUserRoles(userId);
      const discussion = await this.service.updateDiscussion(discussionId, userId, data, roles);

      return res.status(200).json({
        success: true,
        message: "Cập nhật thảo luận thành công",
        data: discussion,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể cập nhật thảo luận",
      });
    }
  };

  /**
   * DELETE /lessons/:lessonId/discussions/:discussionId
   * Xóa discussion
   */
  deleteDiscussion = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const discussionId = Number(req.params.discussionId);
      if (!discussionId) {
        return res.status(400).json({
          success: false,
          message: "ID thảo luận không hợp lệ",
        });
      }

      const roles = await getUserRoles(userId);
      await this.service.deleteDiscussion(discussionId, userId, roles);

      return res.status(200).json({
        success: true,
        message: "Xóa thảo luận thành công",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể xóa thảo luận",
      });
    }
  };

  /**
   * POST /lessons/:lessonId/discussions/:discussionId/replies
   * Tạo reply cho discussion
   */
  createReply = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const discussionId = Number(req.params.discussionId);
      if (!discussionId) {
        return res.status(400).json({
          success: false,
          message: "ID thảo luận không hợp lệ",
        });
      }

      const data: CreateReplyRequest = {
        content: req.body.content,
        parent_reply_id: req.body.parent_reply_id,
      };

      const roles = await getUserRoles(userId);
      const reply = await this.service.createReply(discussionId, userId, data, roles);

      return res.status(201).json({
        success: true,
        message: "Gửi reply thành công",
        data: reply,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể gửi reply",
      });
    }
  };

  /**
   * DELETE /lessons/:lessonId/discussions/:discussionId/replies/:replyId
   * Xóa reply
   */
  deleteReply = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const replyId = Number(req.params.replyId);
      if (!replyId) {
        return res.status(400).json({
          success: false,
          message: "ID reply không hợp lệ",
        });
      }

      const roles = await getUserRoles(userId);
      await this.service.deleteReply(replyId, userId, roles);

      return res.status(200).json({
        success: true,
        message: "Xóa reply thành công",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể xóa reply",
      });
    }
  };
}
