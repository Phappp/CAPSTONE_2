// LiveSessionViewer.tsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/Auth";
import { apiListLiveSessions, apiGetLiveSession, LiveSession } from "../../services/liveSessionClient";
import JitsiRoom from "../../components/live/JitsiRoom";
import AvatarMenu from "../../components/AvatarMenu";
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  User,
  BookOpen,
  Circle,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  Compass,
  Menu,
  X,
} from "lucide-react";
import "./LiveSessionViewer.css";

// Sidebar Menu Items
const menuItems = [
  { path: "/student/dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { path: "/courses", label: "Khám phá", icon: Compass },
  { path: "/live-sessions", label: "Buổi Live", icon: Video },
];

export default function LiveSessionViewer() {
  const { user, accessToken: token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams<{ sessionId?: string }>();

  // State
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<{
    session: LiveSession;
    isHost: boolean;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await apiListLiveSessions({}, token);
      setSessions(result.items);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách buổi live");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Check if there's a sessionId in URL to auto-join
  useEffect(() => {
    if (sessionId && token && !activeRoom) {
      apiGetLiveSession(Number(sessionId), token)
        .then((session) => {
          if (session.status === "live") {
            setActiveRoom({ session, isHost: false });
          }
        })
        .catch(() => {});
    }
  }, [sessionId, token, activeRoom]);

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Chưa có lịch";
    const date = new Date(dateStr);
    return date.toLocaleString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge component
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return (
          <span className="badge badge--live">
            <Circle size={8} fill="white" stroke="none" />
            Đang diễn ra
          </span>
        );
      case "ended":
        return <span className="badge badge--ended">Đã kết thúc</span>;
      default:
        return <span className="badge badge--scheduled">Sắp diễn ra</span>;
    }
  };

  // Handle join session
  const handleJoinSession = (session: LiveSession) => {
    setActiveRoom({ session, isHost: false });
  };

  // Close mobile menu
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // If in active room, show Jitsi room
  if (activeRoom) {
    return (
      <JitsiRoom
        roomName={activeRoom.session.jitsiRoomName}
        userName={user?.full_name || "Học viên"}
        isHost={activeRoom.isHost}
        onClose={() => {
          setActiveRoom(null);
          navigate("/live-sessions");
        }}
      />
    );
  }

  // Filter sessions by status
  const liveSessions = sessions.filter(s => s.status === "live");
  const upcomingSessions = sessions.filter(s => s.status === "scheduled");
  const endedSessions = sessions.filter(s => s.status === "ended");

  return (
    <div className="app-layout">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-sidebar-overlay" onClick={closeMobileMenu} />
      )}

      {/* Navigation Sidebar */}
      <nav 
        className="catalog__nav"
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
      >
        <div className="catalog__navBrand">
          <Link to="/student/dashboard" className="catalog__navLogo">
            M
          </Link>
        </div>
        <div className="catalog__navItems">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`catalog__navItem ${isActive ? "catalog__navItem--active" : ""}`}
                title={item.label}
              >
                <item.icon size={22} />
                <span className="catalog__navLabel">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <div className="container live-session-viewer">
          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ 
              position: 'absolute', 
              top: '16px', 
              left: '16px',
              zIndex: 50,
              display: window.innerWidth <= 768 ? 'flex' : 'none'
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Header Section */}
          <div className="live-session-viewer__header">
            <div className="live-session-viewer__title-row">
              <Video size={28} strokeWidth={1.5} color="#006b5f" />
              <h1>Buổi học trực tiếp</h1>
            </div>
            <p className="live-session-viewer__subtitle">
              Tham gia các lớp học live với giảng viên và tương tác trực tiếp
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="loading-state">
              <Loader2 className="loading-spinner" />
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && sessions.length === 0 && (
            <div className="empty-state">
              <Video size={56} strokeWidth={1.2} />
              <p>Hiện tại chưa có buổi học live nào</p>
              <span className="hint">
                Hãy quay lại sau để tham gia các buổi học thú vị nhé!
              </span>
            </div>
          )}

          {/* Sessions Content */}
          {!loading && !error && sessions.length > 0 && (
            <div className="sessions-container">
              {/* Live Sessions Section */}
              {liveSessions.length > 0 && (
                <div className="section">
                  <h2 className="section-title">
                    <span className="live-indicator"></span>
                    Đang diễn ra ({liveSessions.length})
                  </h2>
                  <div className="sessions-grid">
                    {liveSessions.map((session) => (
                      <div key={session.id} className="session-card session-card--live">
                        <div className="session-card__badge">
                          {getStatusBadge(session.status)}
                        </div>
                        <div className="session-card__content">
                          <h3>{session.title}</h3>
                          {session.courseTitle && (
                            <div className="course-name">
                              <BookOpen size={10} />
                              {session.courseTitle}
                            </div>
                          )}
                          {session.hostName && (
                            <p className="host-name">
                              <User size={12} />
                              {session.hostName}
                            </p>
                          )}
                          {session.description && (
                            <p className="session-description">{session.description}</p>
                          )}
                        </div>
                        <div className="session-card__footer">
                          <button 
                            className="btn-join" 
                            onClick={() => handleJoinSession(session)}
                          >
                            <ExternalLink size={16} />
                            Tham gia ngay
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Sessions Section */}
              {upcomingSessions.length > 0 && (
                <div className="section">
                  <h2 className="section-title">
                    <Calendar size={20} strokeWidth={1.5} color="#006b5f" />
                    Sắp diễn ra ({upcomingSessions.length})
                  </h2>
                  <div className="sessions-list">
                    {upcomingSessions.map((session) => (
                      <div key={session.id} className="session-card">
                        <div className="session-card__info">
                          <h3>{session.title}</h3>
                          {session.courseTitle && (
                            <div className="course-name">
                              <BookOpen size={10} />
                              {session.courseTitle}
                            </div>
                          )}
                          <div className="session-meta">
                            <span className="meta-item">
                              <Calendar size={12} />
                              {formatDate(session.scheduledAt)}
                            </span>
                            {session.hostName && (
                              <span className="meta-item">
                                <User size={12} />
                                {session.hostName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="session-card__actions">
                          {getStatusBadge(session.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ended Sessions Section */}
              {endedSessions.length > 0 && (
                <div className="section">
                  <h2 className="section-title">
                    <Clock size={20} strokeWidth={1.5} color="#94a3b8" />
                    Đã kết thúc ({endedSessions.length})
                  </h2>
                  <div className="sessions-list sessions-list--muted">
                    {endedSessions.slice(0, 10).map((session) => (
                      <div key={session.id} className="session-card session-card--ended">
                        <div className="session-card__info">
                          <h3>{session.title}</h3>
                          {session.courseTitle && (
                            <div className="course-name">
                              <BookOpen size={10} />
                              {session.courseTitle}
                            </div>
                          )}
                          <div className="session-meta">
                            <span className="meta-item">
                              <Clock size={12} />
                              {formatDate(session.endedAt)}
                            </span>
                            {session.hostName && (
                              <span className="meta-item">
                                <User size={12} />
                                {session.hostName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="session-card__actions">
                          {getStatusBadge(session.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}