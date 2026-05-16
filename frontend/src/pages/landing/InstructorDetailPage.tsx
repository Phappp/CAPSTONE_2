import { Link, useParams } from "react-router-dom";
import MindBridgeHeader from "../../components/MindBridgeHeader";
import MindBridgeFooter from "../../components/MindBridgeFooter";
import "./InstructorDetailPage.css";

interface InstructorCourse {
  slug: string;
  title: string;
  category: string;
  description: string;
  price: string;
  image: string;
}

interface InstructorProfile {
  id: string;
  name: string;
  title: string;
  bio: string[];
  avatar: string;
  stats: { students: string; courses: number; rating: number };
  credentials: { icon: string; title: string; sub: string }[];
  courses: InstructorCourse[];
  testimony: { quote: string; author: string; avatar: string };
}

const DEFAULT_PROFILE: InstructorProfile = {
  id: "sarah-jenkins",
  name: "Dr. Sarah Jenkins",
  title: "Lead AI Researcher & Educator",
  avatar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCQWbSP6l4jjWpUqhyNzmaKicl4UD0XC4wu0eneuTaqQUfbp5j64sSu0AnSLRuplKdgW5485bobbmH4lkTFi7tHBkprYcSQkK34iryL_sE2XRnpIOiH3Osim8ZDraIFEVzU721vIawWMIlgiBUB8ODiqwBYgZyzNId91o5y3TCKPqLGmK1MSC6uoPBcTcYNe0ugFr3_XII6gEq_byXKtGOj372-KoUXi5jkO4jZS5ocPEuZIJV2HRvK18eFrI81YLp45vT3Pp21Tw",
  stats: { students: "12,450", courses: 8, rating: 4.9 },
  bio: [
    "Dr. Sarah Jenkins is a distinguished computer scientist and artificial intelligence researcher with over 15 years of experience in both academia and industry. Holding a Ph.D. from Stanford University, she has spearheaded numerous projects involving large-scale neural network architectures and ethical AI implementation.",
    "At MindBridge, Dr. Jenkins focuses on making complex AI concepts accessible to learners of all levels. Her teaching philosophy centers on \"learning by doing,\" integrating practical coding projects with deep theoretical foundations. She has previously served as a consultant for Fortune 500 companies, helping them integrate machine learning into their core business strategies.",
    "Her research has been published in leading journals including Nature Machine Intelligence and she is a frequent speaker at global conferences like NeurIPS and ICML.",
  ],
  credentials: [
    { icon: "school", title: "Ph.D. Computer Science", sub: "Stanford University" },
    { icon: "workspace_premium", title: "Google AI Fellow", sub: "2018 - 2021" },
    { icon: "menu_book", title: "Published Author", sub: "“Modern Neural Nets” (O’Reilly)" },
  ],
  courses: [
    {
      slug: "advanced-neural-networks",
      title: "Advanced Neural Networks",
      category: "AI / ML",
      description: "Master the architectures of the future, from Transformers to GANs.",
      price: "$129.99",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCW3aiWHg4Zjn8JJiHqQtyM3Pf8mOhzyGc8gKakADBsoXivWyfh1_PF5LqLLnjNRbI-MA8UxlLI4puX2lnQvw1cSGcmm0vMmZ8wnlgxbPMS0H3oE1LqCYHl72s0Qren4hw6ieRNolmR2SAR_l7GvQQVZlgQTJDH6P9qb5cnrnsKd7b94pUwZFkPOfbbXn9NXH_GCyI-sgw2lMW0WmQz_Ya1-P5pFsKw-8LAnnRdjjQK2O6cw6BeBguVsPxaWnjL8_grxahJgn7l1A",
    },
    {
      slug: "ml-fundamentals",
      title: "Machine Learning Fundamentals",
      category: "Data Science",
      description: "Build a rock-solid foundation in supervised and unsupervised learning.",
      price: "$89.99",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDiyns2D6uAOvev_7xblkPw5Uc3zURgEhq5lZ93jdGvIO0BMDNzEL3k437iLo9WiHZ7VJA7f_7APRZhIltX4Cn-o0uOcTHPEWq7wu7iz16XcWdxCknRD4tdugPyG9B7YUC8s1G8nNzd2SV_jFbCVbP0xNQCILPPmZhj2kw2qzqHlI4JO8O1g-qLnhFTUYWT7-DYOXh80c5rFJco1V9hvCte9uTkOBh_QaByUKdrmj29bzMpTGnsDw9okcBuGl1GyPDbbbnjOCdvKQ",
    },
    {
      slug: "nlp-python",
      title: "NLP with Python",
      category: "Programming",
      description: "Master Natural Language Processing using modern libraries and LLMs.",
      price: "$109.99",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBNiXewtD1wOC83rP-9EpZv0rxkEQB5HOSVztDT-pe_BufQ_zMods_SwaIQQWC2sV9nvWGSWv74qEOVOfrmmnWmpkPLxyohVq5X3nHPMa7iXasyCmdJJRF7dZZQ5pKE-5MrqGzEmgbvsslXGS2p9mVCZU61-vZKw4aMlUroCc1RGj23-fUdMj0ez_IfbYL31zA37zlJex0aRwd6b3VXUu8iPlBGQH0rwluPlHjxWZA1fZunty92dI_T-v_SBICeBdZt_WhWsw6Xnw",
    },
    {
      slug: "ai-ethics-policy",
      title: "AI Ethics & Policy",
      category: "AI Ethics",
      description: "Navigate the complex landscape of bias, fairness, and safety in AI.",
      price: "$149.99",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDLmM7d_tfat40y9erhn-BH1pTIKc9E9Z_uJBvRqv4qyIr0tJIOmZ1tunzUGKsec9mlwQkY1AoT7V0VU83-Evo50VVDOrI7UWxwSpcCv3A9ZCg6Btv0EWC_KDVnzltsyqbActZRpp42cEZET_BJN4d2R0sdNW6MkgFM6mEFqSwsAssOZzWuuPxPUlALw90IGTC7swgPSCtGkgGBN_KiHdMKCcEDJDy45JP31XystZ45Y2qzygN87yR83Xc83xpLFzku1BMfXDiviA",
    },
  ],
  testimony: {
    quote:
      "Dr. Jenkins has an incredible ability to simplify the most complex topics. Her AI course completely changed my career path.",
    author: "Marcus Thorne, Senior Developer",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuABJTw-1-pVqcmEt8nqHgF3QAklGPsiqgVKxlF7NwNMn4q91GSOsohiWELRTrzbIUNuX-xUbwEffqZfP1Wbh368dnnHZQ9LsMC3LXo-sy_mtQDC4QZWIxEU8IetSvOGT3UCsdwmiMDfr9azFiMUlx3t7BONf3St5GUfFB7iITCBoOk9feEVa5kPlcLFuw0gD3UTOStpjzepD14Ck3z_tjIwePl9x9a54nSsUjgnsr9y0Nh33cTeVEQ6OzwEKBg0sgD8d7hpZ7jV7Q",
  },
};

export default function InstructorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const profile = DEFAULT_PROFILE;
  const displayId = id ?? profile.id;

  return (
    <div className="mb-public instructor-detail-page bg-background font-body text-on-background">
      <MindBridgeHeader active="instructors" />

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <section className="instructor-hero-bg rounded-xl overflow-hidden shadow-xl p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
          <div className="flex-shrink-0">
            <img
              alt={profile.name}
              className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-teal-500/30 object-cover shadow-2xl"
              src={profile.avatar}
            />
          </div>
          <div className="flex-grow text-center md:text-left space-y-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight font-headline">
                {profile.name}
              </h1>
              <p className="text-teal-400 text-lg md:text-xl font-medium">{profile.title}</p>
              {displayId && (
                <p className="text-slate-500 text-xs uppercase tracking-widest pt-1">
                  Instructor ID: {displayId}
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-4">
              <div className="flex flex-col items-center md:items-start">
                <span className="text-on-primary-container text-xs uppercase tracking-wider font-bold">Students</span>
                <span className="text-2xl font-bold text-white">{profile.stats.students}</span>
              </div>
              <div className="w-px h-10 bg-slate-700 hidden sm:block"></div>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-on-primary-container text-xs uppercase tracking-wider font-bold">Courses</span>
                <span className="text-2xl font-bold text-white">{profile.stats.courses}</span>
              </div>
              <div className="w-px h-10 bg-slate-700 hidden sm:block"></div>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-on-primary-container text-xs uppercase tracking-wider font-bold">Rating</span>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-white">{profile.stats.rating}</span>
                  <span className="material-symbols-outlined text-yellow-400 instructor-detail-icon-filled">star</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-center md:justify-start pt-6">
              <Link
                to="/contact"
                className="bg-secondary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined">mail</span>
                Contact Instructor
              </Link>
              <button
                type="button"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-all"
              >
                <span className="material-symbols-outlined">share</span>
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 space-y-6">
              <h2 className="text-2xl font-bold text-primary font-headline flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">person</span>
                </span>
                About the Instructor
              </h2>
              <div className="max-w-none text-on-surface-variant leading-relaxed space-y-4">
                {profile.bio.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex justify-between items-end">
                <h2 className="text-2xl font-bold text-primary font-headline">
                  Courses by {profile.name}
                </h2>
                <Link to="/courses" className="text-teal-600 font-semibold hover:underline text-sm">
                  See all {profile.stats.courses} courses
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.courses.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/courses/${c.slug}`}
                    className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="h-48 relative overflow-hidden">
                      <img alt={c.title} className="w-full h-full object-cover" src={c.image} />
                      <div className="absolute top-4 left-4 bg-primary/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                        {c.category}
                      </div>
                    </div>
                    <div className="p-6 flex-grow flex flex-col">
                      <h3 className="text-lg font-bold text-primary mb-2 line-clamp-1">{c.title}</h3>
                      <p className="text-on-surface-variant text-sm mb-4 line-clamp-2">{c.description}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-xl font-black text-primary">{c.price}</span>
                        <span className="bg-secondary text-white px-4 py-2 rounded-lg font-bold text-sm">
                          View Course
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-primary font-headline">Credentials</h3>
              <ul className="space-y-4">
                {profile.credentials.map((c) => (
                  <li key={c.title} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-teal-600">{c.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-primary">{c.title}</p>
                      <p className="text-xs text-on-surface-variant">{c.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface-container rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-primary font-headline">Connect</h3>
              <div className="flex flex-wrap gap-2">
                <a href="#" className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary-container hover:bg-teal-500 hover:text-white transition-all shadow-sm">
                  <span className="material-symbols-outlined text-sm">link</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-primary-container hover:bg-teal-500 hover:text-white transition-all shadow-sm">
                  <span className="material-symbols-outlined">language</span>
                </a>
              </div>
            </div>

            <div className="bg-white rounded-xl border-l-4 border-teal-500 p-6 shadow-sm space-y-4">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="material-symbols-outlined text-teal-500 text-sm instructor-detail-icon-filled"
                  >
                    star
                  </span>
                ))}
              </div>
              <p className="text-sm text-on-surface-variant italic">
                &quot;{profile.testimony.quote}&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                  <img alt="Student" className="w-full h-full object-cover" src={profile.testimony.avatar} />
                </div>
                <span className="text-xs font-bold text-primary">{profile.testimony.author}</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <MindBridgeFooter />
    </div>
  );
}
