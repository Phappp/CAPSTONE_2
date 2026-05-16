import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PrivacyPage.css";
import transLogo from "../assets/trans-logo-2.png";

const SECTION_IDS = ["introduction", "data-collection", "how-we-use", "sharing", "security"] as const;
type SectionId = (typeof SECTION_IDS)[number];

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

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("introduction");

  useEffect(() => {
    const handleScroll = () => {
      for (const section of SECTION_IDS) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItemClass = (id: SectionId) =>
    `mb-privacy__toc-link${activeSection === id ? " mb-privacy__toc-link--active" : ""}`;

  return (
    <div className="mb-privacy-page">
      <MindBridgeNavbar />

      <div className="mb-privacy__body">
        <header className="mb-privacy__header">
          <div className="mb-privacy__header-inner">
            <h1 className="mb-privacy__title">Privacy Policy</h1>
            <p className="mb-privacy__subtitle">Last Updated: 25, March 2026</p>
          </div>
        </header>

        <main className="mb-privacy__main">
          <aside className="mb-privacy__aside">
            <div className="mb-privacy__sticky">
              <nav className="mb-privacy__toc">
                <a className={navItemClass("introduction")} href="#introduction">Introduction</a>
                <a className={navItemClass("data-collection")} href="#data-collection">Data Collection</a>
                <a className={navItemClass("how-we-use")} href="#how-we-use">How We Use Data</a>
                <a className={navItemClass("sharing")} href="#sharing">Information Sharing</a>
                <a className={navItemClass("security")} href="#security">Data Security</a>
              </nav>
              <div className="mb-privacy__help">
                <p className="mb-privacy__help-tag">Need Help?</p>
                <p className="mb-privacy__help-text">Questions about your data privacy?</p>
                <a className="mb-privacy__help-link" href="mailto:privacy@mindbridge.co">
                  Contact Legal Team
                </a>
              </div>
            </div>
          </aside>

          <article className="mb-privacy__article">
            <section className="mb-privacy__section" id="introduction">
              <h2 className="mb-privacy__section-title">1. Introduction</h2>
              <p className="mb-privacy__paragraph">
                At MindBridge Co., we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform and use our adaptive learning services.
              </p>
              <p className="mb-privacy__paragraph">
                By accessing or using our services, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy.
              </p>
            </section>

            <section className="mb-privacy__section" id="data-collection">
              <h2 className="mb-privacy__section-title">2. Data Collection</h2>
              <h3 className="mb-privacy__subheading">Personal Information You Provide</h3>
              <p className="mb-privacy__paragraph">
                We collect personal information that you voluntarily provide to us when you register on the platform, express an interest in obtaining information about us or our products, or otherwise when you contact us.
              </p>
              <ul className="mb-privacy__list">
                <li>
                  <span className="mb-privacy__list-label">Account Credentials:</span> Name, email address, password, and similar security information.
                </li>
                <li>
                  <span className="mb-privacy__list-label">Profile Data:</span> Educational background, learning goals, and professional experience.
                </li>
                <li>
                  <span className="mb-privacy__list-label">Payment Data:</span> We collect data necessary to process your payment if you make purchases.
                </li>
              </ul>
            </section>

            <section className="mb-privacy__section" id="how-we-use">
              <h2 className="mb-privacy__section-title">3. How We Use Data</h2>
              <p className="mb-privacy__paragraph">
                We process your personal information for these purposes in reliance on our legitimate business interests.
              </p>
              <div className="mb-privacy__cards">
                <div className="mb-privacy__card">
                  <span className="material-symbols-outlined mb-privacy__card-icon">psychology</span>
                  <h4 className="mb-privacy__card-title">Personalization</h4>
                  <p className="mb-privacy__card-text">
                    To tailor learning paths and curriculum recommendations based on user performance.
                  </p>
                </div>
                <div className="mb-privacy__card">
                  <span className="material-symbols-outlined mb-privacy__card-icon">shield_person</span>
                  <h4 className="mb-privacy__card-title">Account Security</h4>
                  <p className="mb-privacy__card-text">
                    To maintain the safety and integrity of our platform through verification and monitoring.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-privacy__section" id="sharing">
              <h2 className="mb-privacy__section-title">4. Information Sharing</h2>
              <p className="mb-privacy__paragraph">
                We only share information with your consent, to comply with laws, or to fulfill business obligations.
              </p>
              <div className="mb-privacy__callout">
                <span className="material-symbols-outlined mb-privacy__callout-icon">info</span>
                <span>
                  We do not sell, rent, or trade your personal information to third parties for their marketing purposes. Any data shared with sub-processors is governed by strict Data Processing Agreements.
                </span>
              </div>
            </section>

            <section className="mb-privacy__section" id="security">
              <h2 className="mb-privacy__section-title">5. Data Security</h2>
              <p className="mb-privacy__paragraph">
                We implement appropriate technical and organizational security measures designed to protect the security of any personal information we process.
              </p>
              <p className="mb-privacy__paragraph">
                However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.
              </p>
            </section>

            <div className="mb-privacy__feedback">
              <p className="mb-privacy__feedback-prompt">Was this policy clear and helpful?</p>
              <div className="mb-privacy__feedback-actions">
                <button type="button" className="mb-privacy__feedback-btn">
                  <span className="material-symbols-outlined">thumb_up</span> Yes
                </button>
                <button type="button" className="mb-privacy__feedback-btn">
                  <span className="material-symbols-outlined">thumb_down</span> No
                </button>
              </div>
            </div>
          </article>
        </main>
      </div>

      <MindBridgeFooter />
    </div>
  );
}
