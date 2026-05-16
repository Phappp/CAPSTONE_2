import { Link } from "react-router-dom";
import PublicSiteHeader from "../../components/PublicSiteHeader";
import PublicSiteFooter from "../../components/PublicSiteFooter";
import "./InstructorsDirectoryPage.css";

interface Instructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  courseCount: number;
  verified?: boolean;
  topRated?: boolean;
}

const INSTRUCTORS: Instructor[] = [
  {
    id: "aris-thorne",
    name: "Dr. Aris Thorne",
    title: "AI Ethics Expert",
    bio: "Specializing in the intersection of neural networks and societal impact with 15 years of academic research.",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBFsh6HLaJt5ZUedbCTvM32eJvSNOwpq9deuDWN-1UiCasQC7KZqAQLXPNa2Jp74bkVLORMkvYyc0rbuR-eImPUeeBMzcTfeTGcA-F0hX5wPop3Z455adm9ZRFSQlFxrnYD9bp8P3HMrVvR4K357Tmj0GRI2v63nwTqQkRu21ntSwziIumAhc3bIweQJH3wwXPBdLteYjMvqpqjm9sfHUFA1QkaK6v5pfr7Yu96VGQTHAswgRjHfnNrJT2x1k8BaIDuMEXAd2z1yQ",
    courseCount: 12,
    verified: true,
    topRated: true,
  },
  {
    id: "sarah-jenkins",
    name: "Sarah Jenkins",
    title: "Lead Product Designer",
    bio: "Former Design Director at major tech hubs, focused on accessible systems and high-conversion UI/UX.",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKkSMJkwTuA1Un5BGeC98JTb5arAcP1wV4jw7bQW7TPAwawHt7Us7fSaIOn-lSUGyxYRAw0pIZHbEGl0W7Oh3SjkGpPRGpfJm4l0g3Rz8lwFCS__dzAWpUJlL4ihnSd7F6MHrwH0JdUUwotRMm8keXcnijcXcqfPqU2zxn6nX72RXPR0_2vwRd9Y8bUAe5tDBD7JVCzN74ID7nG5G2EBwkl91gtN04oGm0sC4xvZKV5JqMuDyUikeWjR6fDciCbstklnvyNebX8Q",
    courseCount: 8,
    topRated: true,
  },
  {
    id: "marcus-vane",
    name: "Marcus Vane",
    title: "Cloud Architect",
    bio: "Certified Solutions Architect helping students master distributed systems and scalable infrastructure.",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAWX7-8uk_uiCQg_7RupIf63OfaWg9n8wjLOn3UzVIesn4odHIK5NtEQdk0zQ7rQGivzxH0-lhjYiDtlJz6IrgK2179HzNVOba7e5oUKWPt0ijkEt5YMovZN3G9XyRgSuQBpluBNadKkoaGYhpgtPjSr3GFzIHVRyF0joqXq4arggWjTakahjUwr7kR3ZxJBBMAsckqoP00pYyevgfJ_MGJbMWPUXLE9Kd5bPBaeZPIRFDcFyACdCe-39v9-XOFXPIGkQKaH-L0ZQ",
    courseCount: 15,
    topRated: true,
  },
  {
    id: "elena-rodriguez",
    name: "Elena Rodriguez",
    title: "Strategic Marketing",
    bio: "Expert in growth hacking and brand storytelling, with a track record of scaling startups to global markets.",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCJzQYtOWj8FSq2xk4XaZPW0tRg2WtffIR8sLWafzenl4s_gMJbglwdyx-YAjmruGwVuj24HoesH-W44O3zFhHpTRtieZvUD8BGS2AJjJelXYwrKZ_JulHx3UqsquovjFNNeFfMAeqkPQ02LSADRm_jbGTrWql5BS_htvyuaa5EYm5sxWbFabz5ipYtejjmOEvFXmzRGJonRNW4xGAXTaPJTRMAmw9raA4oCL8T7KNNrM4-0uyaodeXb7tpNxBmmuBKvrygjnAuZg",
    courseCount: 6,
    verified: true,
    topRated: true,
  },
  {
    id: "jameson-blake",
    name: "Jameson Blake",
    title: "Fintech Innovation",
    bio: "Decentralized finance expert specializing in blockchain security and future monetary policy.",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBuh_UftXHB7SesMlZKxYiuPIrindSu-Rc9V8MG8opW27ZCgicL5czhyznKwBHyZwUO848pGdj1K3HkjUhvab1pu7GmlbvwLZZ13m_jkFDEjyM5mz24jZBsAQ_l0A078lCRRT7B6FFZqRHi3fbp4yZkSL01jvavS9AkEMcKBBzOotc1dY_vP9su5BJTusUFDRZSHMV2sYqvHGVa0DQ-yQbJJp5hD3gXV8dHxq4JgjiRr8f3bNIfh-TL4NOXy2zF-7T4Ayrn3sBgbA",
    courseCount: 9,
    topRated: true,
  },
  {
    id: "maya-patel",
    name: "Maya Patel",
    title: "Content Strategy",
    bio: "Teaching the art of digital presence and engagement through data-driven narrative construction.",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkkvxxgqR04BG9CKklN_my8SwKN4OIYcXlnjHGY8f3JofqzWwn0SP0uEkxSzioNmdQV-_d1xRWA84IDjvGusM5_QppikIOviu9805hu0iZLlfYhvJACQj_YLaVOuBmJe0BIjZdljImsxzNdu6KOTTiCZXpb6Z4tTUUuldmd4QkrYFIlw8ZPAo05osMPfGxTPmPYSRPjdhdKa7Tl97zXChKvIhyPaYgGGSfDCrCwMmfPioZNhezr_RqYPPUsY8FEbwJ05uQq6eS8A",
    courseCount: 11,
    topRated: true,
  },
  {
    id: "chen-wei",
    name: "Chen Wei",
    title: "Full Stack Developer",
    bio: "Master of React, Node, and Rust. Focused on building high-performance web applications.",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCAtRKxQzyUfxugm7o_UFguWLMFuLX9YAkvHz_0hzPpY1RDfh4JrLyGiFLA9CmKS6mHoJ9pZTLPmobG0IlVJS6frBznlzFYnfGz-X9bOIeXZRoJlhtwKMWbgHIIdvR5KGULo0lf-8S6zyCBmeVBPWJK4SIJsBvrHKH5yhNPhm0bN1ZVixeeLFqZHjmLmtkt3EDSvlV3t3_mdhuW9JJ_EJIdQLfBQhgmYOJorTY--O1UNe2V0p_rgKdbk206xhX0iv-0HMy4QI6Opg",
    courseCount: 20,
    topRated: true,
  },
  {
    id: "sophia-grant",
    name: "Sophia Grant",
    title: "Leadership & Mgmt",
    bio: "Helping new managers transition from individual contributors to inspiring team leaders.",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9W4TcDfI4jh9xnGsOFUhYBNf2Pjv3bJJGud7MZ_Uz0a29WDve-CBWnIZ6e7y0j2bpHu9-qjoyHdGOk5FKlFizPlWH_R2RJNAPObqolUk-W9BMTQJd3IwQpJVqejqSUM1MY9GuW6_rhgvRUDpbfyA0YbjP7k7L0O9v4jbsy59Nyen46v3Um0MB4Ih-mdM9fkvYWmLznGIU2l7o1rtIUkphUrHwjKoMfJQZTx7fLctHxXo9bv8T7jZcYlvpmjHmeyxSN2hu7Um0Vw",
    courseCount: 14,
    verified: true,
    topRated: true,
  },
];

export default function InstructorsDirectoryPage() {
  return (
    <div className="mb-public instructors-page bg-[#F8FAFC] text-on-background">
      <PublicSiteHeader active="instructors" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-16 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight mb-4 font-headline">
            Learn from the Masters
          </h1>
          <p className="text-slate-600 max-w-2xl text-lg">
            Connect with world-class experts across technology, business, and creative disciplines. Our instructors are hand-picked for their industry impact and teaching excellence.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {INSTRUCTORS.map((ins) => (
            <Link
              key={ins.id}
              to={`/instructors/${ins.id}`}
              className="instructor-card bg-white p-6 border border-slate-100 flex flex-col items-center text-center group"
            >
              <div className="relative mb-6">
                <img
                  alt={ins.name}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-50"
                  src={ins.avatar}
                />
                {ins.verified && (
                  <div className="absolute -bottom-1 -right-1 bg-secondary text-white rounded-full p-1 border-2 border-white">
                    <span className="material-symbols-outlined text-xs instructors-icon-filled">verified</span>
                  </div>
                )}
              </div>
              <h2 className="text-[18px] font-bold text-[#1E293B] mb-1">{ins.name}</h2>
              <p className="text-secondary font-semibold text-sm mb-4">{ins.title}</p>
              <p className="text-[14px] text-[#64748B] leading-relaxed mb-6">{ins.bio}</p>
              <div className="mt-auto flex flex-col gap-3 w-full">
                {ins.topRated && (
                  <span className="tag-hover inline-flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 py-1 px-3 rounded-full">
                    <span className="material-symbols-outlined text-sm instructors-icon-filled">star</span>
                    Top Rated
                  </span>
                )}
                <span className="text-primary font-medium text-sm hover:underline decoration-secondary decoration-2 underline-offset-4 flex items-center justify-center gap-1">
                  View {ins.courseCount} Courses
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-24 bg-primary rounded-2xl p-8 md:p-12 overflow-hidden relative">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-bold text-white mb-4 font-headline">
              Want to become an instructor?
            </h2>
            <p className="text-slate-300 mb-8">
              Join thousands of world-class educators on MindBridge and share your knowledge with millions of students worldwide.
            </p>
            <Link
              to="/register"
              className="inline-block bg-secondary hover:bg-teal-400 text-white font-bold py-3 px-8 rounded-lg transition-all"
            >
              Apply Now
            </Link>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden lg:block flex items-center justify-center">
            <span className="material-symbols-outlined text-[240px] rotate-12">school</span>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
