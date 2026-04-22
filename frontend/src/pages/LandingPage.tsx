import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import transLogo from "../assets/trans-logo.png";
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  ChartColumnBig,
  CheckCircle2,
  CirclePlay,
  Clock3,
  Compass,
  Cpu,
  GraduationCap,
  Layers3,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  UsersRound,
  Zap,
} from "lucide-react";
import "./LandingPage.css";

type NavSection = {
  id: string;
  label: string;
};

const NAV_SECTIONS: NavSection[] = [
  { id: "section-hero", label: "Trang chủ" },
  { id: "section-features", label: "Tính năng" },
  { id: "section-journey", label: "Lộ trình" },
  { id: "section-pricing", label: "Gói học" },
  { id: "section-faq", label: "FAQ" },
];

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState("section-hero");
  const [visibleRevealIds, setVisibleRevealIds] = useState<Record<string, boolean>>({});
  const [statsReady, setStatsReady] = useState(false);
  const [statValues, setStatValues] = useState({
    learners: 0,
    courses: 0,
    hours: 0,
    rating: 0,
  });
  const sectionIds = useMemo(() => NAV_SECTIONS.map((item) => item.id), []);

  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        root: null,
        threshold: [0.2, 0.35, 0.5, 0.7],
        rootMargin: "-80px 0px -45% 0px",
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [sectionIds]);

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal-id]"));
    if (!revealElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const revealId = (entry.target as HTMLElement).dataset.revealId;
          if (!revealId) return;
          setVisibleRevealIds((prev) => ({ ...prev, [revealId]: true }));
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    revealElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const statsSection = document.getElementById("section-stats");
    if (!statsSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStatsReady(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(statsSection);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!statsReady) return;

    const durationMs = 1400;
    const start = performance.now();
    const targets = {
      learners: 45000,
      courses: 1200,
      hours: 3200000,
      rating: 49,
    };

    const frame = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setStatValues({
        learners: Math.round(targets.learners * eased),
        courses: Math.round(targets.courses * eased),
        hours: Math.round(targets.hours * eased),
        rating: Math.round(targets.rating * eased),
      });
      if (progress < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }, [statsReady]);

  return (
    <div className="landing-page">
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            <img src={transLogo} alt="MindBridge Logo" />
          </Link>

          <nav className="main-nav">
            {NAV_SECTIONS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`nav-link ${activeSection === item.id ? "active" : ""}`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <Link to="/login" className="login-link">
              Đăng nhập
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Bắt đầu
            </Link>
          </div>
        </div>
      </header>

      <section id="section-hero" className="hero-section">
        <div className="container hero-inner">
          <div
            data-reveal-id="hero-left"
            className={`hero-content reveal ${visibleRevealIds["hero-left"] ? "visible" : ""}`}
          >
            <div className="badge">
              <Sparkles size={14} />
              <span>NỀN TẢNG HỌC TẬP THÔNG MINH</span>
            </div>
            <h1 className="hero-title">
              Nâng cấp trải nghiệm học tập với <span className="text-highlight">AI</span> và lộ
              trình cá nhân hóa
            </h1>
            <p className="hero-subtitle">
              MindBridge kết nối học viên, giảng viên và quản trị trên một nền tảng duy nhất. Theo
              dõi tiến độ theo thời gian thực, giao bài linh hoạt và đưa ra gợi ý học tập đúng lúc.
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-dark">
                Tạo tài khoản <ArrowRight size={16} />
              </Link>
              <a href="#section-journey" className="btn btn-outline">
                Xem lộ trình học
              </a>
            </div>
            <div className="hero-metrics-row">
              <div>
                <strong>98%</strong>
                <span>Tỷ lệ hoàn thành khóa học</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Hỗ trợ học tập liên tục</span>
              </div>
              <div>
                <strong>10k+</strong>
                <span>Lượt học mỗi ngày</span>
              </div>
            </div>
          </div>

          <div
            data-reveal-id="hero-right"
            className={`hero-visual reveal reveal-delay-1 ${visibleRevealIds["hero-right"] ? "visible" : ""}`}
          >
            <div className="visual-bg-blur"></div>
            <div className="visual-main-card">
              <div className="metric">
                <div className="metric-icon">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <strong>Lộ trình AI</strong>
                  <p>Tự động tối ưu theo điểm mạnh và điểm yếu</p>
                </div>
              </div>
              <div className="metric">
                <div className="metric-icon">
                  <ChartColumnBig size={20} />
                </div>
                <div>
                  <strong>Phân tích thời gian thực</strong>
                  <p>Báo cáo tiến độ học tập theo bài, chương, khóa</p>
                </div>
              </div>
              <div className="metric">
                <div className="metric-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <strong>Bảo mật và phân quyền</strong>
                  <p>Quản lý truy cập rõ ràng cho từng vai trò</p>
                </div>
              </div>
            </div>
            <div className="visual-float-card">
              <CirclePlay size={18} />
              <span>Xem demo 2 phút</span>
            </div>
          </div>
        </div>
      </section>

      <section id="section-stats" className="stats-strip">
        <div className="container stats-grid">
          <div className="stats-item stat-pop">
            <UsersRound size={18} />
            <strong>{statValues.learners.toLocaleString("en-US")}+</strong>
            <span>Học viên đang hoạt động</span>
          </div>
          <div className="stats-item stat-pop">
            <GraduationCap size={18} />
            <strong>{statValues.courses.toLocaleString("en-US")}+</strong>
            <span>Khóa học chuyên sâu</span>
          </div>
          <div className="stats-item stat-pop">
            <Clock3 size={18} />
            <strong>{(statValues.hours / 1000000).toFixed(1)}M giờ</strong>
            <span>Thời lượng học đã hoàn thành</span>
          </div>
          <div className="stats-item stat-pop">
            <Star size={18} />
            <strong>{(statValues.rating / 10).toFixed(1)}/5</strong>
            <span>Đánh giá trải nghiệm nền tảng</span>
          </div>
        </div>
      </section>

      <section
        id="section-features"
        data-reveal-id="features"
        className={`features-section reveal ${visibleRevealIds["features"] ? "visible" : ""}`}
      >
        <div className="container">
          <div className="section-heading">
            <span className="section-kicker">Tính năng nổi bật</span>
            <h2>Được thiết kế để học nhanh hơn và dạy hiệu quả hơn</h2>
            <p>
              Hệ thống kết hợp AI và dữ liệu học tập để tạo vòng phản hồi liên tục: học, đánh giá,
              đề xuất, cải thiện.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">
                <Compass size={20} />
              </div>
              <h3>Lộ trình học cá nhân hóa</h3>
              <p>Gợi ý nội dung và bài luyện tập theo tiến độ thực tế của từng học viên.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <BookOpenText size={20} />
              </div>
              <h3>Kho học liệu tập trung</h3>
              <p>Quản lý bài giảng, quiz, assignment và tài nguyên trong một không gian thống nhất.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <Cpu size={20} />
              </div>
              <h3>AI hỗ trợ giảng dạy</h3>
              <p>Tạo nhanh câu hỏi, gợi ý phản hồi và phát hiện điểm nghẽn học tập tự động.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <Layers3 size={20} />
              </div>
              <h3>Quản trị học phần linh hoạt</h3>
              <p>Tùy chỉnh mô-đun theo lớp, theo nhóm hoặc theo mục tiêu đầu ra.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <Target size={20} />
              </div>
              <h3>Đánh giá theo năng lực</h3>
              <p>Hệ thống rubric và theo dõi competency rõ ràng, minh bạch cho người học.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <Zap size={20} />
              </div>
              <h3>Vận hành tối ưu hiệu suất</h3>
              <p>Giao diện nhẹ, phản hồi nhanh và khả năng mở rộng theo quy mô tổ chức.</p>
            </article>
          </div>
        </div>
      </section>

      <section
        id="section-journey"
        data-reveal-id="journey"
        className={`journey-section reveal ${visibleRevealIds["journey"] ? "visible" : ""}`}
      >
        <div className="container">
          <div className="section-heading">
            <span className="section-kicker">Lộ trình trải nghiệm</span>
            <h2>Từ đăng ký đến hoàn thành khóa học chỉ với 4 bước</h2>
          </div>

          <div className="journey-timeline">
            <article className="journey-step">
              <span className="step-index">01</span>
              <h3>Tạo tài khoản theo vai trò</h3>
              <p>Học viên, giảng viên hoặc quản trị đều có luồng onboarding riêng.</p>
            </article>
            <article className="journey-step">
              <span className="step-index">02</span>
              <h3>Chọn khóa học và mục tiêu</h3>
              <p>Thiết lập mục tiêu học tập để hệ thống tạo kế hoạch phù hợp.</p>
            </article>
            <article className="journey-step">
              <span className="step-index">03</span>
              <h3>Học và làm bài có phản hồi</h3>
              <p>Nhận đánh giá theo thời gian thực qua quiz, assignment và dashboard.</p>
            </article>
            <article className="journey-step">
              <span className="step-index">04</span>
              <h3>Tổng kết và tối ưu tiếp theo</h3>
              <p>Hệ thống đề xuất nội dung kế tiếp dựa trên dữ liệu năng lực đạt được.</p>
            </article>
          </div>
        </div>
      </section>

      <section
        data-reveal-id="testimonials"
        className={`testimonials-section reveal ${visibleRevealIds["testimonials"] ? "visible" : ""}`}
      >
        <div className="container">
          <div className="section-heading">
            <span className="section-kicker">Phản hồi người dùng</span>
            <h2>Được tin dùng bởi cả học viên lẫn giảng viên</h2>
          </div>
          <div className="testimonials-grid">
            <article className="testimonial-card">
              <div className="stars">
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
              </div>
              <p>
                “Mình nhìn rõ điểm yếu theo từng chương nên cải thiện nhanh hơn rất nhiều so với
                cách học truyền thống.”
              </p>
              <span>Ngọc Anh - Sinh viên CNTT</span>
            </article>
            <article className="testimonial-card">
              <div className="stars">
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
              </div>
              <p>
                “Tính năng quản lý lớp và tạo bài đánh giá giúp mình tiết kiệm rất nhiều thời gian
                chấm và tổng hợp báo cáo.”
              </p>
              <span>Thầy Minh - Giảng viên Data</span>
            </article>
            <article className="testimonial-card">
              <div className="stars">
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
                <Star size={14} />
              </div>
              <p>
                “Dashboard rõ ràng, hiệu năng ổn định. Team quản trị dễ theo dõi chỉ số hoạt động
                của toàn bộ nền tảng.”
              </p>
              <span>Hà Phương - Quản trị học tập</span>
            </article>
          </div>
        </div>
      </section>

      <section
        id="section-pricing"
        data-reveal-id="pricing"
        className={`pricing-section reveal ${visibleRevealIds["pricing"] ? "visible" : ""}`}
      >
        <div className="container">
          <div className="section-heading">
            <span className="section-kicker">Gói sử dụng</span>
            <h2>Linh hoạt từ cá nhân đến tổ chức</h2>
          </div>
          <div className="pricing-grid">
            <article className="pricing-card">
              <h3>Starter</h3>
              <p className="price">Miễn phí</p>
              <ul>
                <li>
                  <CheckCircle2 size={16} /> Truy cập khóa học cơ bản
                </li>
                <li>
                  <CheckCircle2 size={16} /> Quiz và theo dõi tiến độ
                </li>
                <li>
                  <CheckCircle2 size={16} /> 1 lớp học cá nhân
                </li>
              </ul>
              <Link to="/register" className="btn btn-outline full-width">
                Dùng ngay
              </Link>
            </article>
            <article className="pricing-card featured">
              <h3>Pro Learning</h3>
              <p className="price">
                299K <span>/ tháng</span>
              </p>
              <ul>
                <li>
                  <CheckCircle2 size={16} /> Toàn bộ khóa học nâng cao
                </li>
                <li>
                  <CheckCircle2 size={16} /> AI quiz và gợi ý học tập
                </li>
                <li>
                  <CheckCircle2 size={16} /> Báo cáo chi tiết theo năng lực
                </li>
              </ul>
              <Link to="/register" className="btn btn-primary full-width">
                Bắt đầu Pro
              </Link>
            </article>
            <article className="pricing-card">
              <h3>Campus</h3>
              <p className="price">Liên hệ</p>
              <ul>
                <li>
                  <CheckCircle2 size={16} /> Quản trị nhiều lớp và giảng viên
                </li>
                <li>
                  <CheckCircle2 size={16} /> Tùy chỉnh workflow theo tổ chức
                </li>
                <li>
                  <CheckCircle2 size={16} /> Hỗ trợ triển khai chuyên sâu
                </li>
              </ul>
              <Link to="/register" className="btn btn-outline full-width">
                Tư vấn triển khai
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section
        id="section-faq"
        data-reveal-id="faq"
        className={`faq-section reveal ${visibleRevealIds["faq"] ? "visible" : ""}`}
      >
        <div className="container">
          <div className="section-heading">
            <span className="section-kicker">Câu hỏi thường gặp</span>
            <h2>Giải đáp nhanh trước khi bạn bắt đầu</h2>
          </div>
          <div className="faq-grid">
            <article className="faq-item">
              <h4>MindBridge phù hợp với ai?</h4>
              <p>Phù hợp cho cả học viên cá nhân, trung tâm đào tạo và tổ chức giáo dục.</p>
            </article>
            <article className="faq-item">
              <h4>Tôi có thể dùng miễn phí không?</h4>
              <p>Có. Bạn có thể bắt đầu với gói Starter và nâng cấp khi cần tính năng nâng cao.</p>
            </article>
            <article className="faq-item">
              <h4>Dữ liệu học tập có an toàn không?</h4>
              <p>Hệ thống có phân quyền theo vai trò, theo dõi truy cập và chính sách bảo mật rõ ràng.</p>
            </article>
            <article className="faq-item">
              <h4>Có hỗ trợ cho giảng viên tạo đề không?</h4>
              <p>
                Có. Giảng viên có thể tạo quiz/assignment thủ công hoặc dùng AI gợi ý để tiết kiệm
                thời gian.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        data-reveal-id="final-cta"
        className={`cta-section final-cta reveal ${visibleRevealIds["final-cta"] ? "visible" : ""}`}
      >
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <h2>Sẵn sàng bứt tốc hành trình học tập?</h2>
              <p>
                Đăng ký trong 1 phút để trải nghiệm nền tảng học tập thông minh dành cho thời đại
                mới.
              </p>
              <div className="cta-buttons">
                <Link to="/register" className="btn btn-primary">
                  Tạo tài khoản ngay
                </Link>
                <Link to="/login" className="btn btn-outline-light">
                  Tôi đã có tài khoản
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src={transLogo} alt="MindBridge Logo" className="footer-logo" />
              <p className="copyright">© 2026 MindBridge Co. All rights reserved.</p>
            </div>
            <div className="footer-links">
              <h4>Nền tảng</h4>
              <ul>
                <li>
                  <a href="#section-features">Tính năng</a>
                </li>
                <li>
                  <a href="#section-pricing">Gói sử dụng</a>
                </li>
                <li>
                  <a href="#section-faq">FAQ</a>
                </li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Tài khoản</h4>
              <ul>
                <li>
                  <Link to="/register">Đăng ký</Link>
                </li>
                <li>
                  <Link to="/login">Đăng nhập</Link>
                </li>
                <li>
                  <Link to="/forgot-password">Quên mật khẩu</Link>
                </li>
              </ul>
            </div>
            <div className="footer-social">
              <h4>Giá trị cốt lõi</h4>
              <div className="social-icons">
                <span className="social-link">
                  <BookOpenText size={18} />
                </span>
                <span className="social-link">
                  <GraduationCap size={18} />
                </span>
              </div>
              <p className="security-note">Học tập hiệu quả - cá nhân hóa - bảo mật.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}