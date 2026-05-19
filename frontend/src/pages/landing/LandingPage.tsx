import {
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import MindBridgeHeader from "../../components/MindBridgeHeader";
import MindBridgeFooter from "../../components/MindBridgeFooter";
import "./LandingPage.css";
import "./LandingPage-sections.css";

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
const VIDEO_SRC =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

type Course = {
  id: number;
  title: string;
  instructor: string;
  thumbnail: string;
  category: string;
  level: string;
  rating: number;
  reviewCount: number;
  students: number;
  priceOriginal: number;
  priceSale: number;
  badge?: "Bestseller" | "New" | "Hot";
};

const COURSES: Course[] = [
  {
    id: 1,
    title: "AI Prompt Engineering Masterclass",
    instructor: "Dr. Linh Tran",
    thumbnail: "/assets/courses/ai-prompt.svg",
    category: "AI & Machine Learning",
    level: "Intermediate",
    rating: 4.9,
    reviewCount: 2810,
    students: 18420,
    priceOriginal: 89,
    priceSale: 39,
    badge: "Bestseller",
  },
  {
    id: 2,
    title: "Full-Stack Web Development 2026",
    instructor: "Khoa Nguyen",
    thumbnail: "/assets/courses/fullstack.svg",
    category: "Tech Stack",
    level: "Beginner",
    rating: 4.8,
    reviewCount: 4192,
    students: 27340,
    priceOriginal: 119,
    priceSale: 49,
  },
  {
    id: 3,
    title: "Data Analytics with Python & SQL",
    instructor: "Prof. Maria Santos",
    thumbnail: "/assets/courses/data-analytics.svg",
    category: "Data Science",
    level: "Intermediate",
    rating: 4.7,
    reviewCount: 1830,
    students: 9520,
    priceOriginal: 99,
    priceSale: 44,
    badge: "Hot",
  },
  {
    id: 4,
    title: "UX & UI Design Fundamentals",
    instructor: "Aiko Yamamoto",
    thumbnail: "/assets/courses/ux-ui-design.svg",
    category: "Design",
    level: "Beginner",
    rating: 4.9,
    reviewCount: 2245,
    students: 14200,
    priceOriginal: 79,
    priceSale: 29,
    badge: "New",
  },
  {
    id: 5,
    title: "Digital Marketing & Growth",
    instructor: "James Carter",
    thumbnail: "/assets/courses/digital-marketing.svg",
    category: "Business",
    level: "All Levels",
    rating: 4.6,
    reviewCount: 1611,
    students: 8390,
    priceOriginal: 109,
    priceSale: 45,
  },
  {
    id: 6,
    title: "Business Strategy for Founders",
    instructor: "Olivia Park",
    thumbnail: "/assets/courses/business-strategy.svg",
    category: "Business",
    level: "Advanced",
    rating: 4.8,
    reviewCount: 980,
    students: 6210,
    priceOriginal: 149,
    priceSale: 59,
  },
];

type RoadmapStep = {
  icon: string;
  title: string;
  desc: string;
  tag: string;
};

const ROADMAP_STEPS: RoadmapStep[] = [
  {
    icon: "psychology",
    title: "Smart Diagnosis",
    desc: "Our AI assesses your skills, goals, and learning style in under five minutes — no guesswork required.",
    tag: "Step 1",
  },
  {
    icon: "auto_awesome",
    title: "Personalized Path",
    desc: "Receive a curriculum that adapts every week based on quizzes, time spent, and progress milestones.",
    tag: "Step 2",
  },
  {
    icon: "trending_up",
    title: "Adaptive Lessons",
    desc: "Difficulty, pacing, and examples shift in real time. You spend more time on weak areas and skip what you already master.",
    tag: "Step 3",
  },
  {
    icon: "verified",
    title: "Skill Mastery",
    desc: "Hands-on projects, peer feedback, and AI-graded checkpoints confirm true mastery — not just completion.",
    tag: "Step 4",
  },
  {
    icon: "rocket_launch",
    title: "Career Launch",
    desc: "Verified certificates, portfolio reviews, and recruiter matchmaking bridge you to your next opportunity.",
    tag: "Step 5",
  },
];

type FlashDeal = {
  id: number;
  title: string;
  image: string;
  originalPrice: number;
  salePrice: number;
  discountPct: number;
  claimed: number;
  total: number;
};

const FLASH_DEALS: FlashDeal[] = [
  {
    id: 1,
    title: "AI Engineering Bootcamp",
    image: "/assets/flash/ai-bootcamp.svg",
    originalPrice: 199,
    salePrice: 79,
    discountPct: 60,
    claimed: 132,
    total: 200,
  },
  {
    id: 2,
    title: "Cloud Architect Certification Track",
    image: "/assets/flash/cloud-architect.svg",
    originalPrice: 249,
    salePrice: 119,
    discountPct: 52,
    claimed: 86,
    total: 150,
  },
  {
    id: 3,
    title: "Product Management Intensive",
    image: "/assets/flash/product-management.svg",
    originalPrice: 179,
    salePrice: 69,
    discountPct: 61,
    claimed: 167,
    total: 250,
  },
];

type Testimonial = {
  id: number;
  name: string;
  initials: string;
  avatarColor: string;
  role: string;
  rating: number;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    initials: "SJ",
    avatarColor: "linear-gradient(135deg, #0d9488, #2dd4bf)",
    role: "Junior Data Scientist · Acme Analytics",
    rating: 5,
    quote:
      "MindBridge rewrote my career path. The adaptive quizzes spotted my weak spots in statistics, and within four months I landed my first analytics role. Every lesson felt tailored to me.",
  },
  {
    id: 2,
    name: "Daniel Pham",
    initials: "DP",
    avatarColor: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    role: "Frontend Engineer · Nova Studio",
    rating: 5,
    quote:
      "I tried three other platforms before this. Nothing compares to how MindBridge sequences lessons. The AI coach felt like a senior engineer mentoring me at 2 a.m. — patient, precise, and always there.",
  },
  {
    id: 3,
    name: "Priya Mehta",
    initials: "PM",
    avatarColor: "linear-gradient(135deg, #f59e0b, #ef4444)",
    role: "UX Designer · Bloom Health",
    rating: 5,
    quote:
      "The portfolio reviews and live sessions changed everything. I went from copy-pasting tutorials to leading design critiques. The platform respects your time and your ambition.",
  },
  {
    id: 4,
    name: "Marco Reyes",
    initials: "MR",
    avatarColor: "linear-gradient(135deg, #3b82f6, #06b6d4)",
    role: "Cloud Engineer · Vertex Cloud",
    rating: 4.5,
    quote:
      "From total beginner to AWS-certified in six months. The personalized roadmap kept me consistent, and I didn't waste a single hour on content I didn't need.",
  },
  {
    id: 5,
    name: "Aiko Tanaka",
    initials: "AT",
    avatarColor: "linear-gradient(135deg, #ec4899, #f472b6)",
    role: "Product Manager · Lumen Labs",
    rating: 5,
    quote:
      "The case-study modules helped me ship my first PRD with confidence. My mentor's feedback loop was sharper than any bootcamp I had tried — I felt unstuck within the first week.",
  },
  {
    id: 6,
    name: "Liam O'Connor",
    initials: "LO",
    avatarColor: "linear-gradient(135deg, #22c55e, #84cc16)",
    role: "Backend Developer · Tessera Systems",
    rating: 5,
    quote:
      "The system-design track is gold. I went from anxious about whiteboard interviews to comfortable defending tradeoffs in front of staff engineers. Worth every minute.",
  },
  {
    id: 7,
    name: "Noor Hassan",
    initials: "NH",
    avatarColor: "linear-gradient(135deg, #14b8a6, #0ea5e9)",
    role: "ML Engineer · Halo AI",
    rating: 5,
    quote:
      "I loved how the AI coach surfaced foundational gaps before pushing me into deep learning. By the time I touched transformers, I actually understood why each layer mattered.",
  },
  {
    id: 8,
    name: "Elena Costa",
    initials: "EC",
    avatarColor: "linear-gradient(135deg, #a855f7, #d946ef)",
    role: "DevOps Lead · Northwind Cloud",
    rating: 4.5,
    quote:
      "The hands-on labs mirror real production incidents. Our team adopted three of the runbooks I built during the course — it directly raised my impact at work.",
  },
  {
    id: 9,
    name: "Hiroshi Sato",
    initials: "HS",
    avatarColor: "linear-gradient(135deg, #ef4444, #f97316)",
    role: "iOS Developer · Maple Studios",
    rating: 5,
    quote:
      "Swift concurrency finally clicked thanks to the visual timelines. I shipped a major refactor in two weekends without a single race condition slipping into review.",
  },
  {
    id: 10,
    name: "Ava Brooks",
    initials: "AB",
    avatarColor: "linear-gradient(135deg, #f43f5e, #fb7185)",
    role: "Growth Marketer · Bright Loop",
    rating: 5,
    quote:
      "The analytics course translated jargon into decisions I could defend in front of leadership. My campaigns now have a clear hypothesis, not just a creative gut feel.",
  },
  {
    id: 11,
    name: "Kwame Mensah",
    initials: "KM",
    avatarColor: "linear-gradient(135deg, #0ea5e9, #6366f1)",
    role: "Security Engineer · Ironvault",
    rating: 5,
    quote:
      "Red-team labs were intense in the best way. I uncovered two real misconfigurations in our staging environment the same week I finished the OWASP module.",
  },
  {
    id: 12,
    name: "Sofia Rinaldi",
    initials: "SR",
    avatarColor: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    role: "Full-stack Engineer · Atlas Retail",
    rating: 5,
    quote:
      "I came back to coding after a five-year break. MindBridge respected my prior experience and let me skip what I knew — the only platform that didn't waste my time.",
  },
];

type Stat = {
  value: number;
  suffix: string;
  label: string;
  icon: string;
};

const STATS: Stat[] = [
  { value: 10000, suffix: "+", label: "Active Learners", icon: "groups" },
  { value: 500, suffix: "+", label: "Curated Courses", icon: "library_books" },
  { value: 95, suffix: "%", label: "Satisfaction Rate", icon: "favorite" },
  { value: 120, suffix: "+", label: "Expert Instructors", icon: "school" },
];

type FaqItem = {
  id: number;
  q: string;
  a: string;
};

const FAQS: FaqItem[] = [
  {
    id: 0,
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards, PayPal, Apple Pay, Google Pay, and major regional gateways including Momo, VNPay, and ZaloPay. Enterprise customers can pay by invoice.",
  },
  {
    id: 1,
    q: "Can I get a refund if a course is not right for me?",
    a: "Yes. Every individual course is backed by a 14-day, no-questions-asked refund guarantee. Subscription plans can be canceled at any time and you keep access until the end of the billing period.",
  },
  {
    id: 2,
    q: "How do I receive my certificate after finishing a course?",
    a: "Once you complete all required modules and pass the final assessment with at least 80 percent, your verified certificate is generated automatically and added to your profile. You can share it via a unique URL, on LinkedIn, or download it as a PDF.",
  },
  {
    id: 3,
    q: "Are courses self-paced or scheduled?",
    a: "Most courses are fully self-paced so you can learn around your life. Selected cohort-based programs follow a weekly schedule with live sessions, and the next start date is always shown on the course page.",
  },
  {
    id: 4,
    q: "Do I get lifetime access to purchased courses?",
    a: "Yes. Any course you purchase individually is yours to revisit forever, including all future updates from the instructor. Subscription content is accessible while your subscription is active.",
  },
  {
    id: 5,
    q: "Is there a discount for students or teams?",
    a: "Verified students get an automatic 30 percent discount on individual courses. Teams of five or more enjoy enterprise pricing and can request a custom demo from our Sales team.",
  },
];

/* ----- Utility hooks ----- */

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isExpired: diff === 0,
  };
}

function useCountUp(target: number, active: boolean, duration = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let start: number | null = null;
    let frame = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
      else setValue(target);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);
  return value;
}

function useInView<T extends Element>(
  ref: RefObject<T | null>,
  options?: IntersectionObserverInit,
) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true);
        obs.disconnect();
      }
    }, options);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, options, seen]);
  return seen;
}

/* ----- Sub-components ----- */

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="mb-stars" aria-label={`Rating: ${value} out of 5`}>
      {Array.from({ length: full }).map((_, i) => (
        <span
          key={`f${i}`}
          className="material-symbols-outlined mb-stars__star mb-stars__star--filled"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
      ))}
      {half && (
        <span
          className="material-symbols-outlined mb-stars__star mb-stars__star--filled"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star_half
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <span
          key={`e${i}`}
          className="material-symbols-outlined mb-stars__star"
        >
          star
        </span>
      ))}
    </span>
  );
}

function CoursesCarousel() {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(3);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setPerView(1);
      else if (w < 1024) setPerView(2);
      else setPerView(3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxIndex = Math.max(0, COURSES.length - perView);
  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [index, maxIndex]);

  const handlePrev = () => setIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setIndex((i) => Math.min(maxIndex, i + 1));

  return (
    <section className="mb-courses">
      <div className="mb-courses__inner">
        <div className="mb-courses__head">
          <div>
            <span className="mb-section-pill">
              <span className="material-symbols-outlined">trending_up</span>
              Trending Now
            </span>
            <h2 className="mb-section-title">Top Courses This Month</h2>
            <p className="mb-section-lead">
              Hand-picked programs loved by thousands of learners — start with a deal today.
            </p>
          </div>
          <div className="mb-courses__controls">
            <button
              type="button"
              className="mb-courses__arrow"
              onClick={handlePrev}
              disabled={index === 0}
              aria-label="Previous courses"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              className="mb-courses__arrow"
              onClick={handleNext}
              disabled={index === maxIndex}
              aria-label="Next courses"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="mb-courses__viewport">
          <div
            ref={trackRef}
            className="mb-courses__track"
            style={{
              transform: `translateX(calc(-${index} * (100% / ${perView})))`,
              ["--per-view" as string]: perView,
            }}
          >
            {COURSES.map((course) => (
              <article
                key={course.id}
                className="mb-course-card"
                style={{ flex: `0 0 calc(100% / ${perView})` }}
              >
                <div className="mb-course-card__media">
                  <img src={course.thumbnail} alt={course.title} loading="lazy" />
                  {course.badge && (
                    <span
                      className={`mb-course-card__badge mb-course-card__badge--${course.badge.toLowerCase()}`}
                    >
                      {course.badge}
                    </span>
                  )}
                  <span className="mb-course-card__category">{course.category}</span>
                </div>
                <div className="mb-course-card__body">
                  <p className="mb-course-card__level">{course.level}</p>
                  <h3 className="mb-course-card__title">{course.title}</h3>
                  <p className="mb-course-card__instructor">by {course.instructor}</p>
                  <div className="mb-course-card__rating">
                    <span className="mb-course-card__rating-value">
                      {course.rating.toFixed(1)}
                    </span>
                    <Stars value={course.rating} />
                    <span className="mb-course-card__rating-count">
                      ({course.reviewCount.toLocaleString()})
                    </span>
                  </div>
                  <p className="mb-course-card__students">
                    <span className="material-symbols-outlined">groups</span>
                    {course.students.toLocaleString()} learners enrolled
                  </p>
                  <div className="mb-course-card__price">
                    <span className="mb-course-card__price-sale">
                      ${course.priceSale}
                    </span>
                    <span className="mb-course-card__price-original">
                      ${course.priceOriginal}
                    </span>
                    <span className="mb-course-card__price-tag">
                      Save ${course.priceOriginal - course.priceSale}
                    </span>
                  </div>
                  <div className="mb-course-card__actions">
                    <button
                      type="button"
                      className="mb-course-card__buy"
                      onClick={() => navigate("/register")}
                    >
                      <span className="material-symbols-outlined">flash_on</span>
                      Buy Now
                    </button>
                    <button
                      type="button"
                      className="mb-course-card__cart"
                      onClick={() => navigate("/register")}
                      aria-label="Add to cart"
                    >
                      <span className="material-symbols-outlined">shopping_cart</span>
                      Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mb-courses__pager">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              className={`mb-courses__dot ${
                i === index ? "mb-courses__dot--active" : ""
              }`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LearningRoadmap() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [layout, setLayout] = useState<{
    firstCenter: number;
    lastCenter: number;
    activeCenter: number;
  } | null>(null);
  const [waveKey, setWaveKey] = useState(0);

  const lastIndex = ROADMAP_STEPS.length - 1;
  const isLast = active === lastIndex;
  const step = ROADMAP_STEPS[active];

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const first = nodeRefs.current[0];
      const last = nodeRefs.current[lastIndex];
      const current = nodeRefs.current[active];
      if (!track || !first || !last || !current) return;
      const trackLeft = track.getBoundingClientRect().left;
      const centerOf = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2 - trackLeft;
      };
      setLayout({
        firstCenter: centerOf(first),
        lastCenter: centerOf(last),
        activeCenter: centerOf(current),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, lastIndex]);

  useEffect(() => {
    if (isLast) setWaveKey((k) => k + 1);
  }, [isLast]);

  return (
    <section className="mb-roadmap">
      <div className="mb-roadmap__inner">
        <div className="mb-roadmap__head">
          <span className="mb-section-pill mb-section-pill--invert">
            <span className="material-symbols-outlined">route</span>
            AI Roadmap
          </span>
          <h2 className="mb-section-title mb-section-title--invert">
            Dynamic Learning Roadmap
          </h2>
          <p className="mb-section-lead mb-section-lead--invert">
            Hover or tap a node — watch the rocket fly to your next milestone.
          </p>
        </div>

        <div className="mb-roadmap__board">
          <div className="mb-roadmap__track" ref={trackRef}>
            {layout && (
              <>
                <div
                  className="mb-roadmap__line"
                  style={{
                    left: `${layout.firstCenter}px`,
                    width: `${Math.max(0, layout.lastCenter - layout.firstCenter)}px`,
                  }}
                  aria-hidden
                />
                <div
                  className="mb-roadmap__line-fill"
                  style={{
                    left: `${layout.firstCenter}px`,
                    width: `${Math.max(0, layout.activeCenter - layout.firstCenter)}px`,
                  }}
                  aria-hidden
                />
                {isLast && (
                  <div
                    key={waveKey}
                    className="mb-roadmap__wave"
                    style={{
                      left: `${layout.firstCenter}px`,
                      width: `${Math.max(0, layout.lastCenter - layout.firstCenter)}px`,
                    }}
                    aria-hidden
                  />
                )}
                <div
                  className="mb-roadmap__rocket"
                  style={{ left: `${layout.activeCenter}px` }}
                  aria-hidden
                >
                  <span className="mb-roadmap__rocket-trail" aria-hidden />
                  <span
                    className="material-symbols-outlined mb-roadmap__rocket-icon"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    rocket_launch
                  </span>
                </div>
              </>
            )}

            {ROADMAP_STEPS.map((s, i) => (
              <button
                key={s.title}
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                type="button"
                className={`mb-roadmap__node ${
                  i <= active ? "mb-roadmap__node--reached" : ""
                } ${i === active ? "mb-roadmap__node--active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                <span className="mb-roadmap__node-circle">
                  <span className="material-symbols-outlined">{s.icon}</span>
                </span>
                <span className="mb-roadmap__node-label">{s.title}</span>
                <span className="mb-roadmap__node-tag">{s.tag}</span>
              </button>
            ))}
          </div>

          <div className="mb-roadmap__detail" key={active}>
            <div className="mb-roadmap__detail-icon">
              <span className="material-symbols-outlined">{step.icon}</span>
            </div>
            <div>
              <p className="mb-roadmap__detail-tag">{step.tag}</p>
              <h3 className="mb-roadmap__detail-title">{step.title}</h3>
              <p className="mb-roadmap__detail-desc">{step.desc}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlashSales() {
  const navigate = useNavigate();
  const target = useMemo(() => {
    const t = new Date();
    t.setHours(24, 0, 0, 0);
    return t;
  }, []);
  const { hours, minutes, seconds } = useCountdown(target);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="mb-flash">
      <div className="mb-flash__glow" aria-hidden />
      <div className="mb-flash__inner">
        <div className="mb-flash__head">
          <div className="mb-flash__head-copy">
            <span className="mb-section-pill mb-section-pill--accent">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
              Flash Sale
            </span>
            <h2 className="mb-section-title">Limited-Time Offers</h2>
            <p className="mb-section-lead">
              Save up to 60% on selected courses today only. Hurry — these end soon.
            </p>
          </div>
          <div className="mb-flash__countdown" aria-label="Time remaining">
            <div className="mb-flash__unit">
              <span className="mb-flash__digits">{pad(hours)}</span>
              <span className="mb-flash__unit-label">Hours</span>
            </div>
            <span className="mb-flash__colon">:</span>
            <div className="mb-flash__unit">
              <span className="mb-flash__digits">{pad(minutes)}</span>
              <span className="mb-flash__unit-label">Minutes</span>
            </div>
            <span className="mb-flash__colon">:</span>
            <div className="mb-flash__unit mb-flash__unit--pulse">
              <span className="mb-flash__digits">{pad(seconds)}</span>
              <span className="mb-flash__unit-label">Seconds</span>
            </div>
          </div>
        </div>

        <div className="mb-flash__grid">
          {FLASH_DEALS.map((deal) => {
            const pct = Math.round((deal.claimed / deal.total) * 100);
            return (
              <article key={deal.id} className="mb-flash-card">
                <div className="mb-flash-card__media">
                  <img src={deal.image} alt={deal.title} loading="lazy" />
                  <span className="mb-flash-card__discount">
                    -{deal.discountPct}%
                  </span>
                </div>
                <div className="mb-flash-card__body">
                  <h3 className="mb-flash-card__title">{deal.title}</h3>
                  <div className="mb-flash-card__prices">
                    <span className="mb-flash-card__sale">${deal.salePrice}</span>
                    <span className="mb-flash-card__original">
                      ${deal.originalPrice}
                    </span>
                  </div>
                  <div className="mb-flash-card__progress" aria-hidden>
                    <div
                      className="mb-flash-card__progress-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mb-flash-card__progress-text">
                    <strong>{deal.claimed}</strong> of {deal.total} spots claimed
                  </p>
                  <button
                    type="button"
                    className="mb-flash-card__cta"
                    onClick={() => navigate("/register")}
                  >
                    Claim Offer
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatCard({ stat, active }: { stat: Stat; active: boolean }) {
  const value = useCountUp(stat.value, active);
  return (
    <div className="mb-stats__card">
      <span className="material-symbols-outlined mb-stats__icon">{stat.icon}</span>
      <p className="mb-stats__value">
        {value.toLocaleString()}
        <span className="mb-stats__suffix">{stat.suffix}</span>
      </p>
      <p className="mb-stats__label">{stat.label}</p>
    </div>
  );
}

function LiveStatistics() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, { threshold: 0.3 });

  return (
    <section className="mb-stats" ref={sectionRef}>
      <div className="mb-stats__inner">
        <div className="mb-stats__head">
          <span className="mb-section-pill">
            <span className="material-symbols-outlined">analytics</span>
            Live Statistics
          </span>
          <h2 className="mb-section-title">Trusted by Learners Worldwide</h2>
          <p className="mb-section-lead">
            Real numbers from a growing global community of curious minds.
          </p>
        </div>
        <div className="mb-stats__grid">
          {STATS.map((s) => (
            <StatCard key={s.label} stat={s} active={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSlider() {
  const marqueeItems = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className="mb-test">
      <div className="mb-test__inner">
        <div className="mb-test__head">
          <span className="mb-section-pill">
            <span className="material-symbols-outlined">reviews</span>
            Student Stories
          </span>
          <h2 className="mb-section-title">What Our Learners Say</h2>
          <p className="mb-section-lead">
            Real stories, real outcomes — from people who started right where you are.
          </p>
        </div>

        <div className="mb-test__viewport">
          <div className="mb-test__track" aria-label="Student testimonials">
            {marqueeItems.map((t, i) => (
              <div
                className="mb-test__slide"
                key={`${t.id}-${i}`}
                aria-hidden={i >= TESTIMONIALS.length}
              >
                <article className="mb-test__card">
                  <span
                    className="material-symbols-outlined mb-test__quote-icon"
                    aria-hidden
                  >
                    format_quote
                  </span>
                  <Stars value={t.rating} />
                  <p className="mb-test__quote">{t.quote}</p>
                  <div className="mb-test__person">
                    <div
                      className="mb-test__avatar"
                      style={{ background: t.avatarColor }}
                      aria-hidden
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="mb-test__name">{t.name}</p>
                      <p className="mb-test__role">{t.role}</p>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQAccordion() {
  const [openId, setOpenId] = useState<number | null>(0);
  return (
    <section className="mb-faq">
      <div className="mb-faq__inner">
        <div className="mb-faq__head">
          <span className="mb-section-pill">
            <span className="material-symbols-outlined">help</span>
            FAQ
          </span>
          <h2 className="mb-section-title">Frequently Asked Questions</h2>
          <p className="mb-section-lead">
            Everything you need to know before getting started with MindBridge.
          </p>
        </div>
        <div className="mb-faq__list">
          {FAQS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={`mb-faq__item ${isOpen ? "mb-faq__item--open" : ""}`}
              >
                <button
                  type="button"
                  className="mb-faq__q"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                >
                  <span className="mb-faq__q-text">{item.q}</span>
                  <span
                    className="material-symbols-outlined mb-faq__chevron"
                    aria-hidden
                  >
                    expand_more
                  </span>
                </button>
                <div className="mb-faq__a-wrap">
                  <p className="mb-faq__a">{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----- Main page ----- */

export default function LandingPage() {
  const navigate = useNavigate();
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handlePlay = () => {
    setVideoPlaying(true);
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => {
        /* user-initiated; will retry via native controls */
      });
    });
  };

  return (
    <div className="mb-landing-page">
      <MindBridgeHeader />

      <div className="mb-landing__body">
        {/* Hero */}
        <section className="mb-hero">
          <div className="mb-hero__inner">
            <div className="mb-hero__copy mb-reveal">
              <div className="mb-hero__badge mb-hero__badge--animated">
                <span
                  className="material-symbols-outlined mb-hero__badge-icon"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                AI-POWERED LLM
              </div>
              <h1 className="mb-hero__title mb-hero__title--animated">
                The Intelligent Bridge to{" "}
                <span className="mb-hero__title-accent mb-hero__title-accent--shimmer">
                  Modern Learning
                </span>
              </h1>
              <p className="mb-hero__subtitle">
                Redefining education through editorial precision and LLM intelligence.
                A workspace that adapts to your curiosity.
              </p>
              <div className="mb-hero__actions">
                <button
                  type="button"
                  className="mb-btn mb-btn--cta mb-btn--lift"
                  onClick={() => navigate("/register")}
                >
                  Get Started
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button
                  type="button"
                  className="mb-btn mb-btn--ghost mb-btn--lift"
                  onClick={() => navigate("/login")}
                >
                  Become an Instructor
                </button>
              </div>
            </div>

            <div className="mb-hero__visual">
              <div className="mb-hero__halo mb-hero__halo--pulse" />
              <div className="mb-hero__visual-stack">
                <div className="mb-glass mb-hero__card-main mb-hero__card-main--float">
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

                <div className="mb-glass mb-hero__insight mb-hero__insight--float">
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

                <div className="mb-glass mb-hero__health mb-hero__health--float">
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

        {/* TVC Video — now interactive */}
        <section className="mb-tvc">
          {!videoPlaying ? (
            <>
              <div className="mb-tvc__overlay">
                <div className="mb-tvc__cluster">
                  <button
                    type="button"
                    className="mb-tvc__play mb-tvc__play--pulse"
                    onClick={handlePlay}
                    aria-label="Play promotional video"
                  >
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
              <img
                alt="AI Platform in Action"
                className="mb-tvc__poster"
                src={VIDEO_POSTER_URL}
              />
            </>
          ) : (
            <video
              ref={videoRef}
              className="mb-tvc__video"
              src={VIDEO_SRC}
              poster={VIDEO_POSTER_URL}
              controls
              autoPlay
              playsInline
            />
          )}
        </section>

        {/* NEW: Trending Courses */}
        <CoursesCarousel />

        {/* NEW: Dynamic Learning Roadmap */}
        <LearningRoadmap />

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

        {/* NEW: Flash Sales */}
        <FlashSales />

        {/* NEW: Live Statistics */}
        <LiveStatistics />

        {/* NEW: Student Testimonials */}
        <TestimonialsSlider />

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
                  className="mb-btn mb-btn--secondary mb-btn--lift"
                  onClick={() => navigate("/login")}
                >
                  Start Free Trial
                </button>
                <button
                  type="button"
                  className="mb-btn mb-btn--outline-light mb-btn--lift"
                  onClick={() => navigate("/contact")}
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* NEW: FAQ */}
        <FAQAccordion />
      </div>

      <MindBridgeFooter />
    </div>
  );
}
