import { useNavigate } from "react-router-dom";
import MindBridgeHeader from "../../components/MindBridgeHeader";
import MindBridgeFooter from "../../components/MindBridgeFooter";
import "./PricingPlansPage.css";

interface PricingPlan {
  key: string;
  name: string;
  price: string;
  unit?: string;
  description: string;
  features: { label: string; included: boolean }[];
  cta: { label: string; variant: "primary" | "outline" };
  highlight?: boolean;
}

const PLANS: PricingPlan[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    unit: "/month",
    description: "Basic access for individuals starting their learning journey.",
    features: [
      { label: "Access to 5 free courses", included: true },
      { label: "Community support", included: true },
      { label: "Standard course materials", included: true },
      { label: "No AI assistance", included: false },
    ],
    cta: { label: "Get Started", variant: "primary" },
  },
  {
    key: "academic",
    name: "Academic",
    price: "$0",
    unit: "/month",
    description: "Exclusive for learners & instructors with a .edu email.",
    features: [
      { label: "Everything in Free", included: true },
      { label: "LLM Study Assistant (Basic)", included: true },
      { label: "10 AI Quizzes per month", included: true },
      { label: "Verified student badge", included: true },
    ],
    cta: { label: "Verify .edu Email", variant: "outline" },
  },
  {
    key: "pro",
    name: "Pro",
    price: "$10",
    unit: "/month",
    description: "Advanced tools for serious learners and instructors.",
    features: [
      { label: "Unlimited AI Quizzes & Assignments", included: true },
      { label: "LLM Study Assistant", included: true },
      { label: "Priority Instructor support", included: true },
      { label: "Full Course Library access", included: true },
      { label: "Offline course viewing", included: true },
    ],
    cta: { label: "Upgrade to Pro", variant: "primary" },
    highlight: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "Tailored solutions for organizations and large teams.",
    features: [
      { label: "SSO & User management", included: true },
      { label: "Custom learning paths", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "Advanced analytics & reporting", included: true },
    ],
    cta: { label: "Contact Sales", variant: "primary" },
  },
];

export default function PricingPlansPage() {
  const navigate = useNavigate();

  const handleCta = (plan: PricingPlan) => {
    if (plan.key === "enterprise") {
      navigate("/contact");
      return;
    }
    navigate("/register");
  };

  return (
    <div className="mb-public pricing-page bg-[#F8FAFC] font-body text-on-surface">
      <MindBridgeHeader active="pricing" />

      <main>
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="font-headline text-4xl md:text-6xl font-extrabold text-primary mb-6 tracking-tight">
              Flexible Pricing for Future-Proof Learning
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto font-body">
              Empower your educational journey with tools designed for modern learners. Choose the plan that scales with your ambition.
            </p>
          </div>
        </section>

        <section className="pb-24 px-4">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {PLANS.map((plan) => (
                <div
                  key={plan.key}
                  className={
                    plan.highlight
                      ? "bg-white p-8 border-2 border-[#0D9488] flex flex-col h-full rounded-xl shadow-xl relative lg:-translate-y-4"
                      : "bg-white p-8 border border-slate-200 flex flex-col h-full rounded-lg"
                  }
                >
                  {plan.highlight && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0D9488] text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase">
                      BEST CHOICE
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-primary mb-2">{plan.name}</h3>
                    <div className="flex items-baseline">
                      <span className="text-4xl font-extrabold text-primary">{plan.price}</span>
                      {plan.unit && <span className="text-on-surface-variant ml-2">{plan.unit}</span>}
                    </div>
                    <p className="mt-4 text-on-surface-variant">{plan.description}</p>
                  </div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    {plan.features.map((f, idx) => (
                      <li
                        key={idx}
                        className={
                          f.included
                            ? "flex items-start gap-3"
                            : "flex items-start gap-3 opacity-40"
                        }
                      >
                        <span
                          className={
                            f.included
                              ? "material-symbols-outlined text-[#0D9488] pricing-icon-filled"
                              : "material-symbols-outlined"
                          }
                        >
                          {f.included ? "check_circle" : "block"}
                        </span>
                        <span className="text-on-surface">{f.label}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => handleCta(plan)}
                    className={
                      plan.cta.variant === "primary"
                        ? "w-full bg-[#0D9488] text-white py-4 rounded-lg font-bold hover:bg-[#0b7a70] transition-colors"
                        : "w-full border-2 border-[#0D9488] text-[#0D9488] py-4 rounded-lg font-bold hover:bg-[#0D9488]/5 transition-colors"
                    }
                  >
                    {plan.cta.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-24">
          <div className="relative h-64 w-full rounded-xl overflow-hidden shadow-2xl">
            <img
              alt="Team working together"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAFUl7w4_ixha-5EY0PRHeaM6Aa3FgouyR7iT-jfLcipZb_PkxNdpy5QtjTsPz6HxgoVIPYBtbUxBr3ZgIAtid3kdqXU74y8b9X3I8-hYfvwMwZqiZ9RR1I9J4l-WDmDhYwyJoaMn2hZmCH6bqrpyW097sexMzdjaAsXVpKo33MNC7s-4Uj55Jusj7vTr74wMGsNkSV4WAaHQ9AS5aJzo1k8TEKVhAY_lGmJwQcab2kAoUAYW-RL394rln9j3oVlj8kyDB02vDGQ"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-transparent flex flex-col justify-center p-12">
              <h2 className="text-white font-headline text-3xl font-bold mb-4">
                Trusted by 500+ Organizations
              </h2>
              <p className="text-slate-300 max-w-md">
                Join the thousands of learners who have transformed their careers with MindBridge&apos;s AI-powered platform.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MindBridgeFooter />
    </div>
  );
}
