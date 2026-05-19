/**
 * Service cho Discussion feature
 */
import { DiscussionRepository } from "./repository";
import {
  DiscussionListQuery,
  DiscussionListResult,
  DiscussionDetail,
  CreateDiscussionRequest,
  UpdateDiscussionRequest,
  CreateReplyRequest,
  ReplyListItem,
} from "./types";

type UserRole = {
  userId: number;
  roles: string[];
};

export class DiscussionService {
  constructor(private readonly repo: DiscussionRepository) {}

  /**
   * Kiểm tra user có phải là giảng viên của course chứa lesson không
   * (Đơn giản hóa: chỉ kiểm tra role teacher/course_manager/admin)
   */
  private isInstructor(roles: string[]): boolean {
    return roles.some(r => ["teacher", "course_manager", "admin"].includes(r));
  }

  /**
   * Lấy danh sách discussions cho một lesson
   */
  async getDiscussionsByLesson(
    lessonId: number,
    query: DiscussionListQuery
  ): Promise<DiscussionListResult> {
    const page = query.page || 1;
    const pageSize = query.page_size || 20;
    const { items, total } = await this.repo.findDiscussionsByLessonId(lessonId, query);

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Lấy chi tiết một discussion
   */
  async getDiscussionById(id: number, incrementView: boolean = true): Promise<DiscussionDetail | null> {
    if (incrementView) {
      await this.repo.incrementViewCount(id);
    }
    return this.repo.findDiscussionDetailById(id);
  }

  /**
   * Tạo thread thảo luận mới
   */
  async createDiscussion(
    lessonId: number,
    userId: number,
    data: CreateDiscussionRequest,
    roles: string[]
  ): Promise<DiscussionDetail> {
    // Validate
    if (!data.title?.trim()) {
      throw new Error("Tiêu đề không được để trống");
    }
    if (data.title.length > 255) {
      throw new Error("Tiêu đề không được vượt quá 255 ký tự");
    }
    if (!data.content?.trim()) {
      throw new Error("Nội dung không được để trống");
    }

    const discussion = await this.repo.createDiscussion(lessonId, userId, {
      title: data.title.trim(),
      content: data.content.trim(),
    });

    return {
      ...discussion,
      replies: [],
    };
  }

  /**
   * Cập nhật discussion
   */
  async updateDiscussion(
    id: number,
    userId: number,
    data: UpdateDiscussionRequest,
    roles: string[]
  ): Promise<any> {
    // Validate
    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new Error("Tiêu đề không được để trống");
      }
      if (data.title.length > 255) {
        throw new Error("Tiêu đề không được vượt quá 255 ký tự");
      }
    }
    if (data.content !== undefined && !data.content.trim()) {
      throw new Error("Nội dung không được để trống");
    }

    // Teacher/course_manager/admin có thể pin/resolve bất kỳ thread nào
    // Learner chỉ có thể update thread của mình
    const discussion = await this.repo.findDiscussionById(id);
    if (!discussion) {
      throw new Error("Không tìm thấy thảo luận");
    }

    if (!this.isInstructor(roles) && discussion.user_id !== userId) {
      // Learner chỉ được update title/content, không được pin/resolve
      if (data.is_pinned !== undefined || data.is_resolved !== undefined) {
        throw new Error("Bạn không có quyền thực hiện thao tác này");
      }
    }

    const updated = await this.repo.updateDiscussion(id, userId, {
      title: data.title?.trim(),
      content: data.content?.trim(),
      is_pinned: data.is_pinned,
      is_resolved: data.is_resolved,
    });

    if (!updated) {
      throw new Error("Không thể cập nhật thảo luận");
    }

    return updated;
  }

  /**
   * Xóa discussion
   */
  async deleteDiscussion(id: number, userId: number, roles: string[]): Promise<void> {
    const discussion = await this.repo.findDiscussionById(id);
    if (!discussion) {
      throw new Error("Không tìm thấy thảo luận");
    }

    // Teacher/course_manager/admin có thể xóa bất kỳ thread nào
    // Learner chỉ có thể xóa thread của mình
    if (!this.isInstructor(roles) && discussion.user_id !== userId) {
      throw new Error("Bạn không có quyền xóa thảo luận này");
    }

    await this.repo.deleteDiscussion(id, userId);
  }

  /**
   * Tạo reply cho discussion
   */
  async createReply(
    discussionId: number,
    userId: number,
    data: CreateReplyRequest,
    roles: string[]
  ): Promise<ReplyListItem> {
    if (!data.content?.trim()) {
      throw new Error("Nội dung không được để trống");
    }

    // Validate parent reply exists if provided
    if (data.parent_reply_id) {
      const parentReply = await this.repo.findReplyById(data.parent_reply_id);
      if (!parentReply || parentReply.discussion_id !== discussionId) {
        throw new Error("Reply cha không hợp lệ");
      }
    }

    const isInstructor = this.isInstructor(roles);
    return this.repo.createReply(discussionId, userId, {
      content: data.content.trim(),
      parent_reply_id: data.parent_reply_id || null,
    }, isInstructor);
  }

  /**
   * Xóa reply
   */
  async deleteReply(id: number, userId: number, roles: string[]): Promise<void> {
    const reply = await this.repo.findReplyById(id);
    if (!reply) {
      throw new Error("Không tìm thấy reply");
    }

    // Teacher/course_manager/admin có thể xóa bất kỳ reply nào
    // Learner chỉ có thể xóa reply của mình
    if (!this.isInstructor(roles) && reply.user_id !== userId) {
      throw new Error("Bạn không có quyền xóa reply này");
    }

    await this.repo.deleteReply(id, userId);
  }
}
