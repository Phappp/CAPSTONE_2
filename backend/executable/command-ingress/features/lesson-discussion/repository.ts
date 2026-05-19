/**
 * Repository cho Discussion feature
 * Sử dụng raw SQL query như pattern trong project
 */
import AppDataSource from "../../../../lib/database";
import {
  DiscussionListItem,
  DiscussionDetail,
  ReplyListItem,
  CreateDiscussionRequest,
  UpdateDiscussionRequest,
  CreateReplyRequest,
  DiscussionStatus,
  DiscussionListQuery,
  ReplyListQuery,
} from "./types";

type DiscussionRow = {
  id: number;
  lesson_id: number;
  user_id: number;
  user_name: string;
  user_avatar_url: string | null;
  user_role: string | null;
  title: string;
  content: string;
  is_pinned: number;
  is_resolved: number;
  view_count: number;
  reply_count: number;
  created_at: Date | string;
  updated_at: Date | string;
};

type ReplyRow = {
  id: number;
  discussion_id: number;
  user_id: number;
  user_name: string;
  user_avatar_url: string | null;
  user_role: string | null;
  parent_reply_id: number | null;
  content: string;
  is_instructor_reply: number;
  created_at: Date | string;
  updated_at: Date | string;
};

const BASE_DISCUSSION_SELECT = `
  SELECT 
    d.id,
    d.lesson_id,
    d.user_id,
    u.full_name AS user_name,
    u.avatar_url AS user_avatar_url,
    COALESCE(
      (SELECT r.name FROM user_roles ur 
       JOIN roles r ON r.id = ur.role_id 
       WHERE ur.user_id = u.id 
       ORDER BY FIELD(r.name, 'teacher', 'course_manager', 'admin', 'learner')
       LIMIT 1),
      NULL
    ) AS user_role,
    d.title,
    d.content,
    d.is_pinned,
    d.is_resolved,
    d.view_count,
    d.reply_count,
    d.created_at,
    d.updated_at
`;

const BASE_REPLY_SELECT = `
  SELECT 
    r.id,
    r.discussion_id,
    r.user_id,
    u.full_name AS user_name,
    u.avatar_url AS user_avatar_url,
    COALESCE(
      (SELECT r2.name FROM user_roles ur2 
       JOIN roles r2 ON r2.id = ur2.role_id 
       WHERE ur2.user_id = u.id 
       ORDER BY FIELD(r2.name, 'teacher', 'course_manager', 'admin', 'learner')
       LIMIT 1),
      NULL
    ) AS user_role,
    r.parent_reply_id,
    r.content,
    r.is_instructor_reply,
    r.created_at,
    r.updated_at
`;

function formatDiscussionRow(row: DiscussionRow): DiscussionListItem {
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    user_id: row.user_id,
    user_name: row.user_name,
    user_avatar_url: row.user_avatar_url,
    user_role: row.user_role,
    title: row.title,
    content: row.content,
    is_pinned: Boolean(row.is_pinned),
    is_resolved: Boolean(row.is_resolved),
    view_count: row.view_count,
    reply_count: row.reply_count,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function formatReplyRow(row: ReplyRow): ReplyListItem {
  return {
    id: row.id,
    discussion_id: row.discussion_id,
    user_id: row.user_id,
    user_name: row.user_name,
    user_avatar_url: row.user_avatar_url,
    user_role: row.user_role,
    parent_reply_id: row.parent_reply_id,
    content: row.content,
    is_instructor_reply: Boolean(row.is_instructor_reply),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export class DiscussionRepository {
  /**
   * Tạo thread thảo luận mới
   */
  async createDiscussion(
    lessonId: number,
    userId: number,
    data: CreateDiscussionRequest
  ): Promise<DiscussionListItem> {
    const result = await AppDataSource.query(
      `INSERT INTO lesson_discussions (lesson_id, user_id, title, content) VALUES (?, ?, ?, ?)`,
      [lessonId, userId, data.title, data.content]
    );

    const discussion = await this.findDiscussionById(Number(result.insertId));
    if (!discussion) {
      throw new Error("Không thể tạo thảo luận");
    }
    return discussion;
  }

  /**
   * Tìm discussion theo ID
   */
  async findDiscussionById(id: number): Promise<DiscussionListItem | null> {
    const rows = await AppDataSource.query(
      `${BASE_DISCUSSION_SELECT}
       FROM lesson_discussions d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = ?`,
      [id]
    ) as DiscussionRow[];

    if (!rows.length) return null;
    return formatDiscussionRow(rows[0]);
  }

  /**
   * Lấy chi tiết discussion với replies
   */
  async findDiscussionDetailById(id: number): Promise<DiscussionDetail | null> {
    const discussion = await this.findDiscussionById(id);
    if (!discussion) return null;

    const replies = await this.getRepliesByDiscussionId(id, { page: 1, page_size: 100 });

    return {
      ...discussion,
      replies: replies.items,
    };
  }

  /**
   * Danh sách discussions theo lesson
   */
  async findDiscussionsByLessonId(
    lessonId: number,
    query: DiscussionListQuery
  ): Promise<{ items: DiscussionListItem[]; total: number }> {
    const page = query.page || 1;
    const pageSize = query.page_size || 20;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = ["d.lesson_id = ?"];
    const params: any[] = [lessonId];

    // Filter by status
    if (query.status && query.status !== "all") {
      if (query.status === "resolved") {
        conditions.push("d.is_resolved = 1");
      } else {
        conditions.push("d.is_resolved = 0");
      }
    }

    const whereClause = conditions.join(" AND ");

    // Sort
    const sortColumn = query.sort_by === "reply_count" ? "reply_count"
      : query.sort_by === "view_count" ? "view_count"
      : "created_at";
    const sortDir = query.sort_dir === "asc" ? "ASC" : "DESC";
    const pinnedOrder = query.sort_by !== "created_at" ? "d.is_pinned DESC," : "";

    // Get total count
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM lesson_discussions d WHERE ${whereClause}`,
      params
    ) as [{ total: number }];
    const total = countResult[0]?.total || 0;

    // Get items
    const rows = await AppDataSource.query(
      `${BASE_DISCUSSION_SELECT}
       FROM lesson_discussions d
       JOIN users u ON u.id = d.user_id
       WHERE ${whereClause}
       ORDER BY ${pinnedOrder} d.${sortColumn} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    ) as DiscussionRow[];

    return {
      items: rows.map(formatDiscussionRow),
      total,
    };
  }

  /**
   * Cập nhật discussion
   */
  async updateDiscussion(
    id: number,
    userId: number,
    data: UpdateDiscussionRequest
  ): Promise<DiscussionListItem | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      fields.push("title = ?");
      params.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push("content = ?");
      params.push(data.content);
    }
    if (data.is_pinned !== undefined) {
      fields.push("is_pinned = ?");
      params.push(data.is_pinned ? 1 : 0);
    }
    if (data.is_resolved !== undefined) {
      fields.push("is_resolved = ?");
      params.push(data.is_resolved ? 1 : 0);
    }

    if (fields.length === 0) {
      return this.findDiscussionById(id);
    }

    params.push(id, userId);
    await AppDataSource.query(
      `UPDATE lesson_discussions SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      params
    );

    return this.findDiscussionById(id);
  }

  /**
   * Xóa discussion
   */
  async deleteDiscussion(id: number, userId: number): Promise<boolean> {
    const result = await AppDataSource.query(
      `DELETE FROM lesson_discussions WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return (result as any).affectedRows > 0;
  }

  /**
   * Tăng view count
   */
  async incrementViewCount(id: number): Promise<void> {
    await AppDataSource.query(
      `UPDATE lesson_discussions SET view_count = view_count + 1 WHERE id = ?`,
      [id]
    );
  }

  /**
   * Tạo reply
   */
  async createReply(
    discussionId: number,
    userId: number,
    data: CreateReplyRequest,
    isInstructor: boolean
  ): Promise<ReplyListItem> {
    const result = await AppDataSource.query(
      `INSERT INTO lesson_discussion_replies (discussion_id, user_id, parent_reply_id, content, is_instructor_reply)
       VALUES (?, ?, ?, ?, ?)`,
      [discussionId, userId, data.parent_reply_id || null, data.content, isInstructor ? 1 : 0]
    );

    // Update reply count
    await AppDataSource.query(
      `UPDATE lesson_discussions SET reply_count = reply_count + 1 WHERE id = ?`,
      [discussionId]
    );

    const reply = await this.findReplyById(Number(result.insertId));
    if (!reply) {
      throw new Error("Không thể tạo reply");
    }
    return reply;
  }

  /**
   * Tìm reply theo ID
   */
  async findReplyById(id: number): Promise<ReplyListItem | null> {
    const rows = await AppDataSource.query(
      `${BASE_REPLY_SELECT}
       FROM lesson_discussion_replies r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = ?`,
      [id]
    ) as ReplyRow[];

    if (!rows.length) return null;
    return formatReplyRow(rows[0]);
  }

  /**
   * Lấy replies theo discussion ID (flat list, sẽ build tree ở service)
   */
  async getRepliesByDiscussionId(
    discussionId: number,
    query: ReplyListQuery
  ): Promise<{ items: ReplyListItem[]; total: number }> {
    const page = query.page || 1;
    const pageSize = query.page_size || 50;
    const offset = (page - 1) * pageSize;

    // Get total count
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM lesson_discussion_replies WHERE discussion_id = ?`,
      [discussionId]
    ) as [{ total: number }];
    const total = countResult[0]?.total || 0;

    // Get items - instructor replies first, then by created_at
    const rows = await AppDataSource.query(
      `${BASE_REPLY_SELECT}
       FROM lesson_discussion_replies r
       JOIN users u ON u.id = r.user_id
       WHERE r.discussion_id = ?
       ORDER BY r.is_instructor_reply DESC, r.created_at ASC`,
      [discussionId]
    ) as ReplyRow[];

    return {
      items: rows.map(formatReplyRow),
      total,
    };
  }

  /**
   * Xóa reply
   */
  async deleteReply(id: number, userId: number): Promise<boolean> {
    // Get discussion_id first
    const rows = await AppDataSource.query(
      `SELECT discussion_id FROM lesson_discussion_replies WHERE id = ? AND user_id = ?`,
      [id, userId]
    ) as [{ discussion_id: number }?];

    if (!rows.length) return false;

    const discussionId = rows[0].discussion_id;

    const result = await AppDataSource.query(
      `DELETE FROM lesson_discussion_replies WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if ((result as any).affectedRows > 0) {
      // Update reply count
      await AppDataSource.query(
        `UPDATE lesson_discussions SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = ?`,
        [discussionId]
      );
      return true;
    }
    return false;
  }
}
