import { Link } from "react-router-dom";
import transLogo from "../assets/trans-logo-2.png";
import "./MindBridgeFooter.css";

export default function MindBridgeFooter() {
  return (
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
          <Link className="mb-footer__link" to="/courses">Courses</Link>
          <Link className="mb-footer__link" to="/instructors">Instructors</Link>
          <Link className="mb-footer__link" to="/pricing">Pricing</Link>
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
}
