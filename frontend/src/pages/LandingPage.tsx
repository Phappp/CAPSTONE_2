import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LandingPage.css";
import transLogo from "../assets/trans-logo-2.png";

type Certification = {
  icon: string;
  label: string;
  sub: string;
};

const CERTIFICATIONS: Certification[] = [
  { icon: "workspace_premium", label: "Ivy League Partner", sub: "Accredited" },
  { icon: "verified", label: "Global Tech Award", sub: "Innovation 2025" },
  { icon: "military_tech", label: "Mastery Badge", sub: "Student Milestone" },
  { icon: "school", label: "EU Certified", sub: "Education Standards" },
];

const BENTO_PATTERN_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDQY1PapR9SfzAnBMHMcwuQhdKDYJOA4D-K554DWLWhK0ZCxi7Bm1VVPxaICrkuKs3QKrvJ9Gstx8hjc6YNwD9fyYndyXVPBaqQyM3NzEWWPjgwRUNjwKNgjBhS7BixQcSgu6sYfQznO03uI8qCpdKeXW_2wciUppIunGGACtmfyVRMInb5aMXbS3f4wOFg0ZdsApEj_yu8S1iYtnviHA2wDOIaGAtsUb9Qh1xvzbs7DdJgGWKRWl8EbZbxX72w3Qt8z98g0bHzZg";
const VIDEO_POSTER_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBXvct5HrjMKAIS-xbkY1XVyYhvz9pMjBjTUDC9xuEo0uW2qEDRcNDciWQULXZxQ8l2M0QXrjsYNCjdxNMGvLqlbrCKRQNK_ZMJSbIFYFwWNJSOfCGld151oSrqbQDMCxB3Fz5NxxLPBF5dhnw5VqDodFo2NyXWrLmbJ6CoL8RjGcwvBwqXkgTpJhB-dnMq1bSpwO7383kl7O1g3z8WlHwaOpZQiIPnNcCm12DDDbNFlKdHpgplpRgwioR93qDWFshf5xPNebwzPg";
const CTA_PATTERN_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCwxWdCPac3naoLW3IgZ9bsbc4QrThXKiQOjPD4cmGrGqU8DfSOcquva1RV7YZLDjTwcFZ238mzLqYSVmS94neUk5yJf_lbnERW72r8Iv3sywln-XtUxx5X4NtEAv5yXFapZiu9Pb0ywuRgpY9quiOdW37nSDcUISQPfOKEYKTuwFCR5KIW7itEBXH11OKk5UzcgCLuzezhW_T2XKk4daXNG0Fb8Ol_5cUWSxN46oIDBqu48s6Ul6rQ2XMFN_lHhK7hnNF3znvzyw";

const MindBridgeNavbar: React.FC = () => {
  const navigate = useNavigate();
  return (
    <nav className="mb-nav">
      <div className="mb-nav__inner">
        <Link to="/" className="mb-nav__brand">
          <img alt="MindBridge Logo" className="mb-nav__logo" src={transLogo} />
        </Link>
        <div className="mb-nav__links">
          <Link to="/" className="mb-nav__link">Courses</Link>
          <Link to="/" className="mb-nav__link">Instructors</Link>
          <Link to="/" className="mb-nav__link">Pricing</Link>
          <Link to="/" className="mb-nav__link">Resources</Link>
        </div>
        <div className="mb-nav__cta">
          <button type="button" className="mb-nav__login" onClick={() => navigate("/login")}>
            Login
          </button>
          <button type="button" className="mb-nav__get-started" onClick={() => navigate("/register")}>
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};

const MindBridgeFooter: React.FC = () => (
  <footer className="mb-footer">
    <div className="mb-footer__grid">
      <div className="mb-footer__col">
        <div className="mb-footer__brand">
          <img alt="MindBridge Logo" className="mb-footer__logo" src={transLogo} />
        </div>
        <p className="mb-footer__copy">© 2026 MindBridge Co. The Intelligent Workspace.</p>
      </div>
      <div className="mb-footer__col">
        <p className="mb-footer__heading">Product</p>
        <Link className="mb-footer__link" to="/">Courses</Link>
        <Link className="mb-footer__link" to="/">Instructors</Link>
        <Link className="mb-footer__link" to="/">Pricing</Link>
      </div>
      <div className="mb-footer__col">
        <p className="mb-footer__heading">Company</p>
        <Link className="mb-footer__link" to="/privacy">Privacy Policy</Link>
        <Link className="mb-footer__link" to="/privacy">Terms of Service</Link>
        <Link className="mb-footer__link" to="/privacy">Cookie Policy</Link>
        <Link className="mb-footer__link" to="/contact">Contact Us</Link>
      </div>
      <div className="mb-footer__col">
        <p className="mb-footer__heading">Connect</p>
        <div className="mb-footer__socials">
          <a className="mb-footer__social" href="#">
            <span className="material-symbols-outlined mb-footer__social-icon">public</span>
          </a>
          <a className="mb-footer__social" href="#">
            <span className="material-symbols-outlined mb-footer__social-icon">alternate_email</span>
          </a>
        </div>
        <p className="mb-footer__note">✦ Privacy and security are built into everything we do.</p>
      </div>
    </div>
  </footer>
);

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="mb-landing-page">
      <MindBridgeNavbar />

      <div className="mb-landing__body">
        {/* Hero */}
        <section className="mb-hero">
          <div className="mb-hero__inner">
            <div className="mb-hero__copy">
              <div className="mb-hero__badge">
                <span
                  className="material-symbols-outlined mb-hero__badge-icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                AI-POWERED LLM
              </div>
              <h1 className="mb-hero__title">
                The Intelligent Bridge to <span className="mb-hero__title-accent">Modern Learning</span>
              </h1>
              <p className="mb-hero__subtitle">
                Redefining education through editorial precision and LLM intelligence. A workspace that adapts to your curiosity.
              </p>
              <div className="mb-hero__actions">
                <button
                  type="button"
                  className="mb-btn mb-btn--cta"
                  onClick={() => navigate("/register")}
                >
                  Get Started
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button type="button" className="mb-btn mb-btn--ghost" onClick={() => navigate("/login")}>
                  Become an Instructor
                </button>
              </div>
            </div>

            <div className="mb-hero__visual">
              <div className="mb-hero__halo" />
              <div className="mb-hero__visual-stack">
                <div className="mb-glass mb-hero__card-main">
                  <div className="mb-hero__card-top">
                    <div className="mb-hero__dots">
                      <span className="mb-hero__dot mb-hero__dot--error" />
                      <span className="mb-hero__dot mb-hero__dot--secondary" />
                      <span className="mb-hero__dot mb-hero__dot--primary" />
                    </div>
                    <span className="mb-hero__progress">Progress: 84%</span>
                  </div>
                  <div className="mb-hero__bars">
                    <div className="mb-hero__bar" style={{ width: "75%" }} />
                    <div className="mb-hero__bar" style={{ width: "100%" }} />
                    <div className="mb-hero__bar" style={{ width: "50%" }} />
                  </div>
                  <div className="mb-hero__chiprow">
                    <div className="mb-hero__chip-icon">
                      <span className="material-symbols-outlined">psychology</span>
                    </div>
                    <div className="mb-hero__chip-meta">
                      <div className="mb-hero__chip-bar mb-hero__chip-bar--accent" />
                      <div className="mb-hero__chip-bar" />
                    </div>
                  </div>
                </div>

                <div className="mb-glass mb-hero__insight">
                  <div className="mb-hero__insight-icon">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      auto_awesome
                    </span>
                  </div>
                  <div>
                    <p className="mb-hero__insight-title">AI Insight</p>
                    <p className="mb-hero__insight-sub">Personalized quiz generated.</p>
                  </div>
                </div>

                <div className="mb-glass mb-hero__health">
                  <p className="mb-hero__health-title">Course Health</p>
                  <div className="mb-hero__health-bars">
                    <div style={{ height: "40%" }} />
                    <div style={{ height: "60%" }} />
                    <div className="mb-hero__health-bars--peak" style={{ height: "90%" }} />
                    <div style={{ height: "50%" }} />
                    <div style={{ height: "75%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Features */}
        <section className="mb-bento">
          <div className="mb-bento__inner">
            <div className="mb-bento__head">
              <div>
                <h2 className="mb-bento__title">Intelligent by Design</h2>
                <p className="mb-bento__lead">
                  Our features are built to eliminate friction and amplify comprehension using state-of-the-art AI.
                </p>
              </div>
              <div className="mb-bento__tags">
                <span className="mb-bento__tag">SCALABLE</span>
                <span className="mb-bento__tag">SECURE</span>
              </div>
            </div>

            <div className="mb-bento__grid">
              <div className="mb-bento__cell mb-bento__cell--main">
                <div className="mb-bento__cell-body">
                  <div>
                    <div className="mb-bento__icon mb-bento__icon--secondary">
                      <span className="material-symbols-outlined">quiz</span>
                    </div>
                    <h3 className="mb-bento__cell-title">AI-Driven Quizzes</h3>
                    <p className="mb-bento__cell-lead">
                      Dynamic assessments that evolve based on student performance, ensuring no gap in knowledge goes unaddressed.
                    </p>
                  </div>
                  <div className="mb-bento__chips">
                    <span className="mb-bento__chip">Predictive Logic</span>
                    <span className="mb-bento__chip">Automated Grading</span>
                  </div>
                </div>
                <div className="mb-bento__cell-gradient" />
                <img alt="Pattern" className="mb-bento__cell-pattern" src={BENTO_PATTERN_URL} />
              </div>

              <div className="mb-bento__cell mb-bento__cell--dark">
                <div className="mb-bento__icon mb-bento__icon--ghost">
                  <span className="material-symbols-outlined mb-bento__icon-text--accent">videocam</span>
                </div>
                <div>
                  <h3 className="mb-bento__cell-title mb-bento__cell-title--invert">Live Sessions</h3>
                  <p className="mb-bento__cell-lead mb-bento__cell-lead--invert">
                    Real-time collaboration with integrated transcription and AI summaries.
                  </p>
                </div>
              </div>

              <div className="mb-bento__cell mb-bento__cell--light">
                <div className="mb-bento__icon mb-bento__icon--secondary-soft">
                  <span className="material-symbols-outlined mb-bento__icon-text--secondary">assignment_turned_in</span>
                </div>
                <div>
                  <h3 className="mb-bento__cell-title">Dynamic Assignments</h3>
                  <p className="mb-bento__cell-lead">
                    Assignments that adapt context and difficulty to the learner's specific pace.
                  </p>
                </div>
              </div>

              <div className="mb-bento__cell mb-bento__cell--analytics">
                <div className="mb-bento__analytics-body">
                  <h3 className="mb-bento__cell-title">Predictive Analytics</h3>
                  <p className="mb-bento__cell-lead">
                    Spot trends before they happen. Our system predicts student success rates with 94% accuracy.
                  </p>
                </div>
                <div className="mb-bento__analytics-graph">
                  <div className="mb-bento__analytics-bar" style={{ width: "100%" }} />
                  <div className="mb-bento__analytics-bar" style={{ width: "80%" }} />
                  <div className="mb-bento__analytics-bar mb-bento__analytics-bar--strong" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TVC Video */}
        <section className="mb-tvc">
          <div className="mb-tvc__overlay">
            <div className="mb-tvc__cluster">
              <button type="button" className="mb-tvc__play">
                <span
                  className="material-symbols-outlined mb-tvc__play-icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </button>
              <p className="mb-tvc__caption">Watch how it works</p>
            </div>
          </div>
          <img alt="AI Platform in Action" className="mb-tvc__poster" src={VIDEO_POSTER_URL} />
        </section>

        {/* Certifications */}
        <section className="mb-certs">
          <div className="mb-certs__inner">
            <div className="mb-certs__head">
              <h2 className="mb-certs__title">Recognized Excellence</h2>
              <p className="mb-certs__lead">Industry-leading certifications and student milestones.</p>
            </div>
            <div className="mb-certs__grid">
              {CERTIFICATIONS.map((item) => (
                <div key={item.label} className="mb-certs__card">
                  <div className="mb-certs__icon">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <p className="mb-certs__label">{item.label}</p>
                  <p className="mb-certs__sub">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mb-cta-section">
          <div className="mb-cta-card">
            <div className="mb-cta-card__bg">
              <img alt="Background pattern" src={CTA_PATTERN_URL} />
            </div>
            <div className="mb-cta-card__content">
              <h2 className="mb-cta-card__title">Ready to Bridge the Gap?</h2>
              <p className="mb-cta-card__lead">
                Join over 10,000 instructors who are already shaping the future of education with MindBridge.
              </p>
              <div className="mb-cta-card__actions">
                <button
                  type="button"
                  className="mb-btn mb-btn--secondary"
                  onClick={() => navigate("/login")}
                >
                  Start Free Trial
                </button>
                <button type="button" className="mb-btn mb-btn--outline-light" onClick={() => navigate("/contact")}>
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <MindBridgeFooter />
    </div>
  );
}
