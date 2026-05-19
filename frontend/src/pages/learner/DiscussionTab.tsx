/**
 * DiscussionTab Component
 * Component hiển thị tab thảo luận bài học trong LearningPage
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Plus,
  Send,
  Pin,
  CheckCircle,
  MessageCircle,
  Trash2,
  X,
  Clock,
  Eye,
} from "lucide-react";
import { useAuth } from "../../contexts/Auth";
import {
  getDiscussions,
  getDiscussionDetail,
  createDiscussion,
  createReply,
  deleteDiscussion,
  deleteReply,
  updateDiscussion,
  type DiscussionListItem,
  type DiscussionDetail,
  type ReplyListItem,
} from "../../api/discussions";
import type { LessonItem } from "../../components/LearnerCourseContentTree";
import "./DiscussionTab.css";

interface DiscussionTabProps {
  lesson: LessonItem;
}

type ViewMode = "list" | "detail";

const DiscussionTab: React.FC<DiscussionTabProps> = ({ lesson }) => {
  const lessonId = lesson.id;
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [discussions, setDiscussions] = useState<DiscussionListItem[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<DiscussionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "resolved">("all");

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<ReplyListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch discussions
  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDiscussions(lessonId, {
        page: 1,
        page_size: 50,
        status: filterStatus === "all" ? undefined : filterStatus,
        sort_by: "created_at",
        sort_dir: "desc",
      });
      if (result?.success) {
        setDiscussions(result.data.items);
      } else {
        setError("Không thể tải danh sách thảo luận");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi tải thảo luận");
    } finally {
      setLoading(false);
    }
  }, [lessonId, filterStatus]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  // Fetch discussion detail
  const handleOpenDiscussion = async (discussionId: number) => {
    setLoading(true);
    try {
      const result = await getDiscussionDetail(lessonId, discussionId);
      if (result?.success) {
        setSelectedDiscussion(result.data);
        setViewMode("detail");
      } else {
        setError("Không thể tải chi tiết thảo luận");
      }
    } catch (err) {
      setError("Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  // Create new discussion
  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createDiscussion(lessonId, {
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      if (result && "success" in result && result.success) {
        setNewTitle("");
        setNewContent("");
        setShowCreateForm(false);
        fetchDiscussions();
      } else if (result && "success" in result && !result.success) {
        setError((result as { message: string }).message);
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi tạo thảo luận");
    } finally {
      setSubmitting(false);
    }
  };

  // Create reply
  const handleCreateReply = async () => {
    if (!replyContent.trim() || !selectedDiscussion) return;

    setSubmitting(true);
    try {
      const result = await createReply(lessonId, selectedDiscussion.id, {
        content: replyContent.trim(),
        parent_reply_id: replyingTo?.id,
      });
      if (result && "success" in result && result.success) {
        setReplyContent("");
        setReplyingTo(null);
        // Refresh discussion detail
        const detailResult = await getDiscussionDetail(lessonId, selectedDiscussion.id);
        if (detailResult?.success) {
          setSelectedDiscussion(detailResult.data);
        }
      } else if (result && "success" in result && !result.success) {
        setError((result as { message: string }).message);
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi gửi reply");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete discussion
  const handleDeleteDiscussion = async (discussionId: number) => {
    if (!confirm("Bạn có chắc muốn xóa thảo luận này?")) return;

    try {
      const result = await deleteDiscussion(lessonId, discussionId);
      if (result && "success" in result && result.success) {
        fetchDiscussions();
        setViewMode("list");
        setSelectedDiscussion(null);
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi xóa");
    }
  };

  // Delete reply
  const handleDeleteReply = async (replyId: number) => {
    if (!selectedDiscussion || !confirm("Bạn có chắc muốn xóa reply này?")) return;

    try {
      const result = await deleteReply(lessonId, selectedDiscussion.id, replyId);
      if (result && "success" in result && result.success) {
        const detailResult = await getDiscussionDetail(lessonId, selectedDiscussion.id);
        if (detailResult?.success) {
          setSelectedDiscussion(detailResult.data);
        }
      }
    } catch (err) {
      setError("Đã xảy ra lỗi khi xóa reply");
    }
  };

  // Mark as resolved
  const handleMarkResolved = async () => {
    if (!selectedDiscussion) return;

    try {
      const result = await updateDiscussion(lessonId, selectedDiscussion.id, {
        is_resolved: !selectedDiscussion.is_resolved,
      });
      if (result && "success" in result && result.success) {
        const detailResult = await getDiscussionDetail(lessonId, selectedDiscussion.id);
        if (detailResult?.success) {
          setSelectedDiscussion(detailResult.data);
        }
        fetchDiscussions();
      }
    } catch (err) {
      setError("Đã xảy ra lỗi");
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  };

  // Build reply tree
  const buildReplyTree = (replies: ReplyListItem[]): ReplyListItem[] => {
    const map = new Map<number, ReplyListItem>();
    const roots: ReplyListItem[] = [];

    replies.forEach(reply => {
      map.set(reply.id, { ...reply, child_replies: [] });
    });

    replies.forEach(reply => {
      const node = map.get(reply.id)!;
      if (reply.parent_reply_id && map.has(reply.parent_reply_id)) {
        map.get(reply.parent_reply_id)!.child_replies!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // Render reply component
  const renderReply = (reply: ReplyListItem, depth = 0) => (
    <div key={reply.id} className={`discussion-reply ${depth > 0 ? "discussion-reply--nested" : ""}`}>
      <div className="discussion-reply__avatar">
        {reply.user_avatar_url ? (
          <img src={reply.user_avatar_url} alt={reply.user_name} />
        ) : (
          <span>{getInitials(reply.user_name)}</span>
        )}
      </div>
      <div className="discussion-reply__content">
        <div className="discussion-reply__header">
          <span className="discussion-reply__author">{reply.user_name}</span>
          {reply.user_role && reply.user_role !== "learner" && (
            <span className={`discussion-reply__badge discussion-reply__badge--${reply.user_role}`}>
              {reply.user_role === "teacher" ? "GV" : reply.user_role === "course_manager" ? "QL" : reply.user_role}
            </span>
          )}
          {reply.is_instructor_reply && (
            <span className="discussion-reply__badge discussion-reply__badge--instructor">
              Giảng viên
            </span>
          )}
          <span className="discussion-reply__time">
            <Clock size={12} />
            {formatTimeAgo(reply.created_at)}
          </span>
        </div>
        {replyingTo?.id === reply.id && (
          <div className="discussion-reply__replying-to">
            Đang trả lời @{reply.user_name}
            <button onClick={() => setReplyingTo(null)}><X size={14} /></button>
          </div>
        )}
        <p className="discussion-reply__text">{reply.content}</p>
        <div className="discussion-reply__actions">
          <button
            className="discussion-reply__action"
            onClick={() => setReplyingTo(reply)}
          >
            <MessageCircle size={14} /> Trả lời
          </button>
          {user?.id === reply.user_id && (
            <button
              className="discussion-reply__action discussion-reply__action--danger"
              onClick={() => handleDeleteReply(reply.id)}
            >
              <Trash2 size={14} /> Xóa
            </button>
          )}
        </div>
        {reply.child_replies?.map(child => renderReply(child, depth + 1))}
      </div>
    </div>
  );

  return (
    <div className="discussion-tab">
      {viewMode === "list" ? (
        <>
          {/* Header */}
          <div className="discussion-tab__header">
            <div className="discussion-tab__header-left">
              <h3 className="discussion-tab__title">
                <MessageSquare size={20} />
                Thảo luận bài học
              </h3>
              <span className="discussion-tab__count">
                {discussions.length} thảo luận
              </span>
            </div>
            <div className="discussion-tab__header-right">
              <select
                className="discussion-tab__filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              >
                <option value="all">Tất cả</option>
                <option value="open">Chưa giải quyết</option>
                <option value="resolved">Đã giải quyết</option>
              </select>
              <button
                className="discussion-tab__create-btn"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={18} />
                Tạo thảo luận
              </button>
            </div>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="discussion-create">
              <div className="discussion-create__header">
                <h4>Tạo thảo luận mới</h4>
                <button onClick={() => setShowCreateForm(false)}>
                  <X size={20} />
                </button>
              </div>
              <input
                type="text"
                className="discussion-create__title"
                placeholder="Tiêu đề thảo luận..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={255}
              />
              <textarea
                className="discussion-create__content"
                placeholder="Nội dung thảo luận..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
              />
              {error && <div className="discussion-create__error">{error}</div>}
              <div className="discussion-create__actions">
                <button
                  className="discussion-create__cancel"
                  onClick={() => setShowCreateForm(false)}
                >
                  Hủy
                </button>
                <button
                  className="discussion-create__submit"
                  onClick={handleCreateDiscussion}
                  disabled={submitting || !newTitle.trim() || !newContent.trim()}
                >
                  {submitting ? "Đang gửi..." : "Đăng thảo luận"}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !showCreateForm && (
            <div className="discussion-tab__error">{error}</div>
          )}

          {/* Loading */}
          {loading && (
            <div className="discussion-tab__loading">
              <div className="discussion-tab__spinner" />
              Đang tải thảo luận...
            </div>
          )}

          {/* Empty State */}
          {!loading && discussions.length === 0 && !showCreateForm && (
            <div className="discussion-tab__empty">
              <MessageSquare size={48} />
              <h4>Chưa có thảo luận nào</h4>
              <p>Hãy là người đầu tiên đặt câu hỏi về bài học này!</p>
              <button onClick={() => setShowCreateForm(true)}>
                <Plus size={18} /> Tạo thảo luận
              </button>
            </div>
          )}

          {/* Discussion List */}
          {!loading && discussions.length > 0 && (
            <div className="discussion-list">
              {discussions.map((discussion) => (
                <div
                  key={discussion.id}
                  className={`discussion-item ${discussion.is_pinned ? "discussion-item--pinned" : ""} ${discussion.is_resolved ? "discussion-item--resolved" : ""}`}
                  onClick={() => handleOpenDiscussion(discussion.id)}
                >
                  <div className="discussion-item__avatar">
                    {discussion.user_avatar_url ? (
                      <img src={discussion.user_avatar_url} alt={discussion.user_name} />
                    ) : (
                      <span>{getInitials(discussion.user_name)}</span>
                    )}
                  </div>
                  <div className="discussion-item__content">
                    <div className="discussion-item__header">
                      {discussion.is_pinned && (
                        <span className="discussion-item__badge discussion-item__badge--pinned">
                          <Pin size={12} /> Đã ghim
                        </span>
                      )}
                      {discussion.is_resolved && (
                        <span className="discussion-item__badge discussion-item__badge--resolved">
                          <CheckCircle size={12} /> Đã giải quyết
                        </span>
                      )}
                      {discussion.user_role && discussion.user_role !== "learner" && (
                        <span className={`discussion-item__badge discussion-item__badge--${discussion.user_role}`}>
                          {discussion.user_role === "teacher" ? "Giảng viên" : discussion.user_role}
                        </span>
                      )}
                    </div>
                    <h4 className="discussion-item__title">{discussion.title}</h4>
                    <p className="discussion-item__excerpt">
                      {discussion.content.substring(0, 150)}
                      {discussion.content.length > 150 ? "..." : ""}
                    </p>
                    <div className="discussion-item__meta">
                      <span className="discussion-item__author">{discussion.user_name}</span>
                      <span className="discussion-item__time">
                        <Clock size={12} /> {formatTimeAgo(discussion.created_at)}
                      </span>
                      <span className="discussion-item__replies">
                        <MessageCircle size={12} /> {discussion.reply_count} trả lời
                      </span>
                      <span className="discussion-item__views">
                        <Eye size={12} /> {discussion.view_count} lượt xem
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Detail View */}
          {selectedDiscussion && (
            <div className="discussion-detail">
              <button
                className="discussion-detail__back"
                onClick={() => {
                  setViewMode("list");
                  setSelectedDiscussion(null);
                  fetchDiscussions();
                }}
              >
                ← Quay lại danh sách
              </button>

              {/* Discussion Header */}
              <div className="discussion-detail__header">
                <div className="discussion-detail__title-row">
                  <h3>{selectedDiscussion.title}</h3>
                  {selectedDiscussion.is_pinned && (
                    <span className="discussion-detail__badge discussion-detail__badge--pinned">
                      <Pin size={14} /> Đã ghim
                    </span>
                  )}
                  {selectedDiscussion.is_resolved && (
                    <span className="discussion-detail__badge discussion-detail__badge--resolved">
                      <CheckCircle size={14} /> Đã giải quyết
                    </span>
                  )}
                </div>
                <div className="discussion-detail__meta">
                  <div className="discussion-detail__author">
                    {selectedDiscussion.user_avatar_url ? (
                      <img src={selectedDiscussion.user_avatar_url} alt={selectedDiscussion.user_name} />
                    ) : (
                      <span>{getInitials(selectedDiscussion.user_name)}</span>
                    )}
                    <span>{selectedDiscussion.user_name}</span>
                    {selectedDiscussion.user_role && selectedDiscussion.user_role !== "learner" && (
                      <span className={`discussion-detail__role discussion-detail__role--${selectedDiscussion.user_role}`}>
                        {selectedDiscussion.user_role}
                      </span>
                    )}
                  </div>
                  <span className="discussion-detail__time">
                    <Clock size={14} /> {formatTimeAgo(selectedDiscussion.created_at)}
                  </span>
                  <span className="discussion-detail__views">
                    <Eye size={14} /> {selectedDiscussion.view_count} lượt xem
                  </span>
                </div>
                <p className="discussion-detail__content">{selectedDiscussion.content}</p>
                <div className="discussion-detail__actions">
                  {(user?.id === selectedDiscussion.user_id || user?.role === "teacher" || user?.role === "course_manager") && (
                    <>
                      <button onClick={handleMarkResolved}>
                        <CheckCircle size={16} />
                        {selectedDiscussion.is_resolved ? "Mở lại" : "Đánh dấu đã giải quyết"}
                      </button>
                      {user?.id === selectedDiscussion.user_id && (
                        <button
                          className="discussion-detail__action--danger"
                          onClick={() => handleDeleteDiscussion(selectedDiscussion.id)}
                        >
                          <Trash2 size={16} /> Xóa
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Replies */}
              <div className="discussion-detail__replies">
                <h4>
                  <MessageCircle size={18} />
                  {selectedDiscussion.reply_count} câu trả lời
                </h4>

                {selectedDiscussion.replies.length === 0 ? (
                  <div className="discussion-detail__no-replies">
                    Chưa có câu trả lời nào. Hãy là người đầu tiên trả lời!
                  </div>
                ) : (
                  <div className="discussion-replies">
                    {buildReplyTree(selectedDiscussion.replies).map(reply => renderReply(reply))}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <div className="discussion-detail__reply-form">
                <div className="discussion-detail__reply-avatar">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} />
                  ) : (
                    <span>{user ? getInitials(user.full_name) : "?"}</span>
                  )}
                </div>
                <div className="discussion-detail__reply-input-wrapper">
                  {replyingTo && (
                    <div className="discussion-detail__replying-to">
                      Đang trả lời @{replyingTo.user_name}
                      <button onClick={() => setReplyingTo(null)}><X size={14} /></button>
                    </div>
                  )}
                  <textarea
                    className="discussion-detail__reply-input"
                    placeholder="Viết câu trả lời..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={3}
                  />
                  <button
                    className="discussion-detail__reply-submit"
                    onClick={handleCreateReply}
                    disabled={submitting || !replyContent.trim()}
                  >
                    <Send size={18} />
                    Gửi
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DiscussionTab;
