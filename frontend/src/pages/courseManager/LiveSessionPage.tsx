import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/Auth";
import {
  apiListLiveSessions,
  apiCreateLiveSession,
  apiDeleteLiveSession,
  apiStartLiveSession,
  apiEndLiveSession,
  LiveSession,
} from "../../services/liveSessionClient";
import CommonModal from "../../components/CommonModal";
import JitsiRoom from "../../components/live/JitsiRoom";
import { Video, Calendar, Trash2, Play, StopCircle, Plus } from "lucide-react";
import "./LiveSessionPage.css";

interface Course {
  id: number;
  title: string;
  slug: string;
}

export default function TeacherLiveSessionPage() {
  const { user, accessToken: token } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId?: string }>();

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<LiveSession | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCourseId, setFormCourseId] = useState<number | null>(null);
  const [formScheduledAt, setFormScheduledAt] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Jitsi room state
  const [activeRoom, setActiveRoom] = useState<{
    session: LiveSession;
    isHost: boolean;
  } | null>(null);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const result = await apiListLiveSessions(
        courseId ? { courseId: Number(courseId) } : {},
        token
      );
      setSessions(result.items);
    } catch (err: any) {
      setError(err.message || "Failed to load Live Sessions list");
    } finally {
      setLoading(false);
    }
  }, [token, courseId]);

  // Fetch courses for dropdown
  const fetchCourses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/courses/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.items) {
        setCourses(data.items);
        if (data.items.length > 0 && !courseId) {
          setFormCourseId(data.items[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  }, [token, courseId]);

  useEffect(() => {
    fetchSessions();
    fetchCourses();
  }, [fetchSessions, fetchCourses]);

  // Set courseId from URL params
  useEffect(() => {
    if (courseId) {
      setFormCourseId(Number(courseId));
    }
  }, [courseId]);

  // Create session
  const handleCreateSession = async () => {
    if (!formTitle.trim() || !formCourseId || !token) return;

    try {
      setFormSubmitting(true);
      await apiCreateLiveSession(
        {
          courseId: formCourseId,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          scheduledAt: formScheduledAt || null,
        },
        token
      );
      setShowCreateModal(false);
      setFormTitle("");
      setFormDescription("");
      setFormScheduledAt("");
      fetchSessions();
    } catch (err: any) {
      alert(err.message || "Failed to create live session");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete session
  const handleDeleteSession = async () => {
    if (!sessionToDelete || !token) return;

    try {
      await apiDeleteLiveSession(sessionToDelete.id, token);
      setShowDeleteModal(false);
      setSessionToDelete(null);
      fetchSessions();
    } catch (err: any) {
      alert(err.message || "Failed to delete live session");
    }
  };

  // Start session
  const handleStartSession = async (session: LiveSession) => {
    if (!token) return;

    try {
      const updated = await apiStartLiveSession(session.id, token);
      fetchSessions();
      setActiveRoom({ session: updated, isHost: true });
    } catch (err: any) {
      alert(err.message || "Failed to start live session");
    }
  };

  // End session
  const handleEndSession = async (session: LiveSession) => {
    if (!token) return;

    try {
      await apiEndLiveSession(session.id, token);
      fetchSessions();
      setActiveRoom(null);
    } catch (err: any) {
      alert(err.message || "Failed to end live session");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No schedule";
    const date = new Date(dateStr);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusThreedge = (status: string) => {
    switch (status) {
      case "live":
        return <span className="live-badge">On Stream</span>;
      case "ended":
        return <span className="ended-badge">Ended</span>;
      default:
        return <span className="scheduled-badge">Scheduled</span>;
    }
  };

  // Render Jitsi room if active
  if (activeRoom) {
    return (
      <JitsiRoom
        roomName={activeRoom.session.jitsiRoomName}
        userName={user?.full_name || "Instructor"}
        isHost={activeRoom.isHost}
        onClose={() => {
          setActiveRoom(null);
          fetchSessions();
        }}
      />
    );
  }

  return (
    <div className="live-session-page">
      <div className="live-session-page__header">
        <div className="live-session-page__title-row">
          <Video size={28} />
          <h1>Manage Live Sessions</h1>
        </div>
        <button
          className="btn-create"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={20} />
          Create first live session
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <Video size={64} strokeWidth={1} />
          <p>No live sessions available.</p>
          <button
            className="btn-create"
            onClick={() => setShowCreateModal(true)}
          >
            Create first live session
          </button>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-card__info">
                <h3>{session.title}</h3>
                {session.courseTitle && (
                  <p className="course-name">{session.courseTitle}</p>
                )}
                {session.description && (
                  <p className="session-description">{session.description}</p>
                )}
                <div className="session-meta">
                  <span className="meta-item">
                    <Calendar size={14} />
                    {formatDate(session.scheduledAt)}
                  </span>
                  {getStatusThreedge(session.status)}
                </div>
              </div>
              <div className="session-card__actions">
                {session.status === "scheduled" && (
                  <button
                    className="btn-start"
                    onClick={() => handleStartSession(session)}
                  >
                    <Play size={16} />
                    Start Live
                  </button>
                )}
                {session.status === "live" && (
                  <button
                    className="btn-end"
                    onClick={() => handleEndSession(session)}
                  >
                    <StopCircle size={16} />
                    End
                  </button>
                )}
                {session.status === "scheduled" && (
                  <button
                    className="btn-delete"
                    onClick={() => {
                      setSessionToDelete(session);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CommonModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Live Session"
        onConfirm={() => {}}
      >
        <div className="create-form">
          <div className="form-group">
            <label>Course</label>
            <select
              value={formCourseId || ""}
              onChange={(e) => setFormCourseId(Number(e.target.value))}
              disabled={!!courseId}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="VD: Session week 5 - React Hooks"
              maxLength={255}
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Description of the live session..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Schedule (Optional)</label>
            <input
              type="datetime-local"
              value={formScheduledAt}
              onChange={(e) => setFormScheduledAt(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              className="btn-cancel"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn-submit"
              onClick={handleCreateSession}
              disabled={!formTitle.trim() || !formCourseId || formSubmitting}
            >
              {formSubmitting ? "Creating..." : "Create Live Session"}
            </button>
          </div>
        </div>
      </CommonModal>

      {/* Delete Confirmation Modal */}
      <CommonModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        message={`Are you sure you want to delete the live session "${sessionToDelete?.title}"? This action cannot be undone.`}
        showCancel={true}
        destructive={true}
        onConfirm={handleDeleteSession}
      />
    </div>
  );
}