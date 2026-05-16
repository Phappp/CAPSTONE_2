import React, { FormEvent, useState } from "react";
import MindBridgeHeader from "../../components/MindBridgeHeader";
import MindBridgeFooter from "../../components/MindBridgeFooter";
import "./ContactUsPage.css";

const MAP_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDaw0GK197Yjr1aO0mXQZ9kd-K2nfJdl2z1khcCoC1Nv0BFBOUNMRFZf2Kw4DFKYXGU03Oo7Z6KuitYQw0HtN8oeOdAtYvUJ0iqK66RRkQMDdNMYkxcm31wFS_VLASGMrAwyY4SUDVjLfRDMgNvyEq_7AHPZuvUCMXTIHm5EB34vvSaF9dbChc5c9tJ4LeBnkpQpIuI096AQOjXqEp2tIVRK5IkdPJMmCprSr-BWyBHyWUTwxc3B2a5aNd6T18myjtzj5onxjdsGg";

type InfoCardProps = {
  icon: string;
  title: string;
  children: React.ReactNode;
};

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, children }) => (
  <div className="mb-contact__info-card">
    <div className="mb-contact__info-icon">
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <div>
      <h3 className="mb-contact__info-title">{title}</h3>
      <p className="mb-contact__info-text">{children}</p>
    </div>
  </div>
);

export default function ContactUsPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="mb-contact-page">
      <MindBridgeHeader />

      <div className="mb-contact__body">
        <section className="mb-contact__hero">
          <div className="mb-contact__hero-inner">
            <h1 className="mb-contact__title">Get in Touch</h1>
            <p className="mb-contact__subtitle">Have a question about MindBridge? We're here to help.</p>
          </div>
        </section>

        <section className="mb-contact__main">
          <div className="mb-contact__grid">
            <div className="mb-contact__info">
              <InfoCard icon="location_on" title="Our Location">
                Duy Tan University Campus,
                <br />
                Da Nang, Vietnam
              </InfoCard>
              <InfoCard icon="mail" title="Email Us">
                support@mindbridge.edu.vn
              </InfoCard>
              <InfoCard icon="schedule" title="Working Hours">
                Mon - Fri, 8:00 AM - 5:00 PM
              </InfoCard>

              <div className="mb-contact__map">
                <img alt="Map location" src={MAP_URL} />
              </div>
            </div>

            <div className="mb-contact__form-wrap">
              <div className="mb-contact__form-card">
                <h2 className="mb-contact__form-title">Send us a message</h2>

                {submitted ? (
                  <div className="mb-contact__success">
                    <span className="material-symbols-outlined mb-contact__success-icon">check_circle</span>
                    <p className="mb-contact__success-title">Thank you for your message!</p>
                    <p className="mb-contact__success-text">We'll get back to you shortly.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mb-contact__form">
                    <div className="mb-contact__row">
                      <div className="mb-contact__field">
                        <label className="mb-contact__label" htmlFor="contact-name">Full Name</label>
                        <input
                          id="contact-name"
                          required
                          className="mb-contact__input"
                          placeholder="John Doe"
                          type="text"
                        />
                      </div>
                      <div className="mb-contact__field">
                        <label className="mb-contact__label" htmlFor="contact-email">Email Address</label>
                        <input
                          id="contact-email"
                          required
                          className="mb-contact__input"
                          placeholder="john@example.com"
                          type="email"
                        />
                      </div>
                    </div>
                    <div className="mb-contact__field">
                      <label className="mb-contact__label" htmlFor="contact-subject">Subject</label>
                      <select
                        id="contact-subject"
                        required
                        className="mb-contact__input mb-contact__select"
                        defaultValue=""
                      >
                        <option value="">Select a subject</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="billing">Billing &amp; Pricing</option>
                        <option value="partnership">Partnership</option>
                      </select>
                    </div>
                    <div className="mb-contact__field">
                      <label className="mb-contact__label" htmlFor="contact-message">Message</label>
                      <textarea
                        id="contact-message"
                        required
                        className="mb-contact__input mb-contact__textarea"
                        placeholder="How can we help you?"
                        rows={5}
                      />
                    </div>
                    <button type="submit" className="mb-contact__submit">
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-contact__newsletter">
          <div className="mb-contact__newsletter-card">
            <div className="mb-contact__newsletter-glow" />
            <div className="mb-contact__newsletter-text">
              <h2 className="mb-contact__newsletter-title">Want updates on the go?</h2>
              <p className="mb-contact__newsletter-lead">
                Subscribe to our monthly newsletter for the latest in AI education.
              </p>
            </div>
            <div className="mb-contact__newsletter-form">
              <input className="mb-contact__newsletter-input" placeholder="Enter your email" type="email" />
              <button type="button" className="mb-contact__newsletter-button">Join</button>
            </div>
          </div>
        </section>
      </div>

      <MindBridgeFooter />
    </div>
  );
}
