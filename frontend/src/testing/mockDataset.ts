/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * MindBridge LMS — Production-Grade Mock Testing Dataset
 *
 * Seeded fixtures consumed by the E2E suite described in TESTING_WORKFLOW.md.
 * All identifiers, slugs, hashes, and timestamps are deterministic so the
 * harness can replay flows across CI runs without flakiness.
 *
 * Scope:
 *   - 30 users (2 admin + 8 course managers + 20 learners)
 *   - 12 published courses, 48 modules, 144 lessons
 *   - 240+ quiz questions (MCQ + short answer + coding snippets)
 *   - 5 rubric-graded assignments + 12 learner submissions
 *   - 18 grading records (≥15) with rubric breakdown
 *   - 36 payment transactions across SUCCESS / PENDING / FAILED / EXPIRED / REFUNDED
 *   - 16 live sessions, 32 enrollments
 *
 * NOTE: Password hashes use the standard bcrypt $2b$ envelope at cost 12.
 * They are FAKE values intended for FE wiring; the backend seeder should
 * regenerate real hashes from `password_plaintext` when populating the DB.
 */

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export type Role = "admin" | "course_manager" | "learner";
export type AccountStatus = "active" | "pending" | "banned" | "deleted";
export type CourseStatus = "draft" | "pending_review" | "published" | "archived";
export type Level = "beginner" | "intermediate" | "advanced";
export type LessonType = "video" | "text" | "quiz" | "assignment" | "live";
export type TransactionStatus =
  | "SUCCESS"
  | "PENDING"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED";
export type PaymentProvider = "momo" | "vnpay" | "stripe" | "manual";
export type LiveSessionStatus = "scheduled" | "live" | "ended";
export type EnrollmentStatus = "active" | "completed" | "dropped" | "expired";
export type QuizQuestionType =
  | "multiple_choice"
  | "short_answer"
  | "code_snippet";

export interface ManagerVerification {
  status: "pending" | "verified" | "rejected" | "suspended";
  review_note: string | null;
  reviewed_at: string | null;
}

export interface MockUser {
  id: number;
  email: string;
  password_plaintext: string;
  password_hash: string;
  full_name: string;
  avatar_url: string | null;
  roles: Role[];
  primary_role: Role;
  is_2fa_enabled: boolean;
  email_verified: boolean;
  status: AccountStatus;
  locale: string;
  timezone: string;
  country: string;
  bio: string | null;
  phone: string | null;
  headline: string | null;
  expertise: string[];
  created_at: string;
  last_login: string | null;
  manager_verification: ManagerVerification | null;
}

export interface MockTotpSeed {
  user_id: number;
  base32_secret: string;
  algorithm: "SHA1" | "SHA256";
  digits: 6;
  period_seconds: 30;
  recovery_codes: string[];
}

export interface MockInstructorView {
  id: number;
  full_name: string;
  avatar_url: string | null;
  headline: string;
}

export interface MockCourse {
  id: number;
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  thumbnail_url: string;
  level: Level;
  category: string;
  language: "en" | "vi";
  price: number;
  original_price: number;
  currency: "USD";
  rating: number;
  rating_count: number;
  learners_count: number;
  duration_hours: number;
  best_seller: boolean;
  tags: string[];
  what_you_learn: string[];
  prerequisites: string[];
  owner_id: number;
  co_instructor_ids: number[];
  status: CourseStatus;
  is_active: boolean;
  has_certificate: boolean;
  estimated_hours: number;
  created_at: string;
  published_at: string | null;
}

export interface MockModule {
  id: number;
  course_id: number;
  title: string;
  description: string;
  order_index: number;
}

export interface MockLesson {
  id: number;
  module_id: number;
  course_id: number;
  title: string;
  lesson_type: LessonType;
  order_index: number;
  duration_seconds: number;
  is_published: boolean;
  content_url: string | null;
  description: string;
  resource_kind: "video" | "youtube" | "pdf" | "word" | "other";
}

export interface MockQuizOption {
  id: number;
  option_text: string;
  is_correct: boolean;
}

export interface MockQuizQuestion {
  id: number;
  course_id: number;
  lesson_id: number;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  difficulty: "easy" | "medium" | "hard";
  options: MockQuizOption[];
  expected_answer: string | null;
  explanation: string;
}

export interface MockAssignmentAttachment {
  file_name: string;
  file_path: string;
  signed_url: string;
  file_size: number;
}

export interface MockAssignmentRubric {
  id: string;
  criterion: string;
  weight_percent: number;
  description: string;
  max_points: number;
}

export interface MockAssignment {
  id: number;
  course_id: number;
  lesson_id: number;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  passing_score: number;
  allow_late_submission: boolean;
  late_submission_days: number;
  late_penalty_percent: number;
  allow_resubmission: boolean;
  max_resubmissions: number;
  allowed_formats: string[];
  attachments: MockAssignmentAttachment[];
  assignment_kind: "file_prompt" | "short_answer";
  rubric: MockAssignmentRubric[];
  time_limit_minutes: number | null;
  instructor_id: number;
}

export interface MockAssignmentSubmission {
  id: number;
  assignment_id: number;
  learner_id: number;
  submitted_at: string;
  file_name: string;
  file_path: string;
  file_size: number;
  status: "submitted" | "graded" | "returned" | "late";
  resubmission_count: number;
  notes: string | null;
}

export interface MockRubricBreakdownEntry {
  rubric_id: string;
  criterion: string;
  weight_percent: number;
  earned_points: number;
  comment: string;
}

export interface MockGradingRecord {
  id: number;
  submission_id: number;
  assignment_id: number;
  graded_by_id: number;
  score: number;
  passed: boolean;
  feedback_text: string;
  rubric_breakdown: MockRubricBreakdownEntry[];
  graded_at: string;
  ai_assist_used: boolean;
}

export interface MockTransaction {
  id: number;
  order_ref: string;
  course_id: number;
  user_id: number;
  provider: PaymentProvider;
  status: TransactionStatus;
  amount: number;
  currency: "USD" | "VND";
  provider_order_ref: string;
  provider_txn_ref: string | null;
  paid_at: string | null;
  expired_at: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

export interface MockLiveSession {
  id: number;
  courseId: number;
  courseTitle: string;
  title: string;
  description: string;
  hostId: number;
  hostName: string;
  jitsiRoomName: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  status: LiveSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MockEnrollment {
  id: number;
  user_id: number;
  course_id: number;
  enrolled_at: string;
  progress_percent: number;
  status: EnrollmentStatus;
  last_activity_at: string;
  current_module_id: number | null;
  current_lesson_id: number | null;
  completed_lessons: number;
}

// ---------------------------------------------------------------------------
// USERS — 2 admins + 8 course managers + 20 learners = 30 profiles
// ---------------------------------------------------------------------------

const HASH = (label: string): string =>
  `$2b$12$mockbridge.${label.padEnd(22, "x").slice(0, 22)}.h4sh3dPasswordEnv`;

export const MOCK_USERS: MockUser[] = [
  // -------- ADMINS --------
  {
    id: 1,
    email: "aleksandra.iversen@mindbridge.io",
    password_plaintext: "Admin#Stockholm-2026!",
    password_hash: HASH("admin_iversen"),
    full_name: "Aleksandra Iversen",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-1-iversen.webp",
    roles: ["admin"],
    primary_role: "admin",
    is_2fa_enabled: true,
    email_verified: true,
    status: "active",
    locale: "en-SE",
    timezone: "Europe/Stockholm",
    country: "Sweden",
    bio: "Platform Operations Director. Owns the trust & safety program and revenue reconciliation policy.",
    phone: "+46 70 412 8821",
    headline: "Director, Platform Operations",
    expertise: ["Trust & Safety", "Revenue Auditing", "GDPR Compliance"],
    created_at: "2025-04-12T08:15:00.000Z",
    last_login: "2026-05-17T22:09:14.000Z",
    manager_verification: null,
  },
  {
    id: 2,
    email: "rajesh.krishnamurthy@mindbridge.io",
    password_plaintext: "Admin#Bengaluru-2026!",
    password_hash: HASH("admin_krishnamurthy"),
    full_name: "Rajesh Krishnamurthy",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-2-krishnamurthy.webp",
    roles: ["admin"],
    primary_role: "admin",
    is_2fa_enabled: true,
    email_verified: true,
    status: "active",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    country: "India",
    bio: "Senior Curriculum Auditor — oversees admin review pipeline and instructor verification SLAs.",
    phone: "+91 80 4587 2034",
    headline: "Senior Curriculum Auditor",
    expertise: ["Course Auditing", "Instructor Verification", "Content Moderation"],
    created_at: "2025-05-04T03:42:11.000Z",
    last_login: "2026-05-18T01:24:55.000Z",
    manager_verification: null,
  },

  // -------- COURSE MANAGERS --------
  {
    id: 3,
    email: "meilin.chen@mindbridge.io",
    password_plaintext: "Teach#GenerativeAI-2026!",
    password_hash: HASH("cm_chen"),
    full_name: "Dr. Mei-Lin Chen",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-3-chen.webp",
    roles: ["course_manager"],
    primary_role: "course_manager",
    is_2fa_enabled: true,
    email_verified: true,
    status: "active",
    locale: "en-US",
    timezone: "America/Los_Angeles",
    country: "United States",
    bio: "Ph.D. in Machine Learning from Stanford. 9 years building LLM evaluation pipelines at OpenAI and Anthropic.",
    phone: "+1 415 209 7733",
    headline: "Ph.D. in Machine Learning · Ex-OpenAI Research",
    expertise: ["LLM Fine-Tuning", "RAG", "Evaluation Harnesses"],
    created_at: "2025-06-18T16:02:00.000Z",
    last_login: "2026-05-17T19:48:22.000Z",
    manager_verification: { status: "verified", review_note: "Stanford Ph.D. transcript validated.", reviewed_at: "2025-06-20T10:00:00.000Z" },
  },
  {
    id: 4,
    email: "tobias.lindqvist@mindbridge.io",
    password_plaintext: "Teach#Distributed-2026!",
    password_hash: HASH("cm_lindqvist"),
    full_name: "Prof. Tobias Lindqvist",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-4-lindqvist.webp",
    roles: ["course_manager"],
    primary_role: "course_manager",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-CH",
    timezone: "Europe/Zurich",
    country: "Switzerland",
    bio: "Associate Professor of Distributed Systems at ETH Zürich. Maintainer of two open-source Raft implementations.",
    phone: "+41 44 632 7811",
    headline: "Associate Professor, ETH Zürich · Distributed Systems",
    expertise: ["Go", "Raft Consensus", "Service Meshes"],
    created_at: "2025-07-02T09:30:00.000Z",
    last_login: "2026-05-16T17:11:08.000Z",
    manager_verification: { status: "verified", review_note: "Faculty page verified at ETH portal.", reviewed_at: "2025-07-04T08:30:00.000Z" },
  },
  {
    id: 5,
    email: "adaeze.okonkwo@mindbridge.io",
    password_plaintext: "Teach#QuantFinance-2026!",
    password_hash: HASH("cm_okonkwo"),
    full_name: "Dr. Adaeze Okonkwo",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-5-okonkwo.webp",
    roles: ["course_manager"],
    primary_role: "course_manager",
    is_2fa_enabled: true,
    email_verified: true,
    status: "active",
    locale: "en-GB",
    timezone: "Europe/London",
    country: "United Kingdom",
    bio: "Quantitative Finance Lecturer at LSE. Former Senior Quant at Goldman Sachs FICC strats desk.",
    phone: "+44 20 7405 9210",
    headline: "Quantitative Finance Lecturer, LSE",
    expertise: ["Risk Modeling", "Python Pandas", "Stochastic Calculus"],
    created_at: "2025-07-15T11:45:00.000Z",
    last_login: "2026-05-17T08:14:30.000Z",
    manager_verification: { status: "verified", review_note: "LSE employment letter confirmed.", reviewed_at: "2025-07-17T12:10:00.000Z" },
  },
  {
    id: 6,
    email: "marcus.friedrich@mindbridge.io",
    password_plaintext: "Teach#CloudArch-2026!",
    password_hash: HASH("cm_friedrich"),
    full_name: "Marcus Friedrich",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-6-friedrich.webp",
    roles: ["course_manager"],
    primary_role: "course_manager",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-DE",
    timezone: "Europe/Berlin",
    country: "Germany",
    bio: "Senior Cloud Architect with 12 years across AWS Professional Services and Hashicorp consulting.",
    phone: "+49 30 5489 1102",
    headline: "Senior Cloud Architect · Ex-AWS ProServe",
    expertise: ["AWS Well-Architected", "Terraform", "Kubernetes"],
    created_at: "2025-08-01T07:20:00.000Z",
    last_login: "2026-05-18T06:55:41.000Z",
    manager_verification: { status: "verified", review_note: "AWS Professional certification verified.", reviewed_at: "2025-08-03T09:00:00.000Z" },
  },
  {
    id: 7,
    email: "yuna.park@mindbridge.io",
    password_plaintext: "Teach#Cybersec-2026!",
    password_hash: HASH("cm_park"),
    full_name: "Dr. Yuna Park",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-7-park.webp",
    roles: ["course_manager"],
    primary_role: "course_manager",
    is_2fa_enabled: true,
    email_verified: true,
    status: "active",
    locale: "en-KR",
    timezone: "Asia/Seoul",
    country: "South Korea",
    bio: "Cybersecurity Researcher at KAIST. Disclosed 14 CVEs in identity-provider OIDC implementations.",
    phone: "+82 42 350 4419",
    headline: "Cybersecurity Researcher, KAIST",
    expertise: ["Zero Trust", "Threat Hunting", "OIDC / OAuth Internals"],
    created_at: "2025-08-12T13:05:00.000Z",
    last_login: "2026-05-17T11:32:00.000Z",
    manager_verification: { status: "verified", review_note: "CVE attribution confirmed via MITRE.", reviewed_at: "2025-08-14T10:00:00.000Z" },
  },
  {
    id: 8,
    email: "carla.henriques@mindbridge.io",
    password_plaintext: "Teach#Design-2026!",
    password_hash: HASH("cm_henriques"),
    full_name: "Carla Henriques",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-8-henriques.webp",
    roles: ["course_manager"],
    primary_role: "course_manager",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-PT",
    timezone: "Europe/Lisbon",
    country: "Portugal",
    bio: "Principal Product Designer. Led design system at Spotify (Encore) and shipped two Material-adjacent design libraries.",
    phone: "+351 21 388 5572",
    headline: "Principal Product Designer · Ex-Spotify Encore",
    expertise: ["Design Systems", "Accessibility (WCAG)", "Figma Tokens"],
    created_at: "2025-09-04T15:50:00.000Z",
    last_login: "2026-05-15T20:01:13.000Z",
    manager_verification: { status: "verified", review_note: "Portfolio + Spotify reference accepted.", reviewed_at: "2025-09-06T11:30:00.000Z" },
  },
  {
    id: 9,
    email: "hossein.mahmoudi@mindbridge.io",
    password_plaintext: "Teach#Bioinfo-2026!",
    password_hash: HASH("cm_mahmoudi"),
    full_name: "Dr. Hossein Mahmoudi",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-9-mahmoudi.webp",
    roles: ["course_manager"],
    primary_role: "course_manager",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-CH",
    timezone: "Europe/Zurich",
    country: "Switzerland",
    bio: "Bioinformatics Group Leader at EPFL. Co-author of 38 peer-reviewed papers on genome assembly pipelines.",
    phone: "+41 21 693 4480",
    headline: "Bioinformatics Group Leader, EPFL",
    expertise: ["Genomic Pipelines", "Nextflow", "Variant Calling"],
    created_at: "2025-09-20T10:11:00.000Z",
    last_login: "2026-05-17T15:42:18.000Z",
    manager_verification: { status: "verified", review_note: "ORCID + EPFL faculty page confirmed.", reviewed_at: "2025-09-22T09:00:00.000Z" },
  },
  {
    id: 10,
    email: "bhargavi.subramanian@mindbridge.io",
    password_plaintext: "Teach#DataEng-2026!",
    password_hash: HASH("cm_subramanian"),
    full_name: "Dr. Bhargavi Subramanian",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-10-subramanian.webp",
    roles: ["course_manager"],
    primary_role: "course_manager",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    country: "India",
    bio: "Staff Data Engineer at IBM Research. Built petabyte-scale Spark + Kafka ingestion fabric for The Weather Company.",
    phone: "+91 80 2204 3318",
    headline: "Staff Data Engineer, IBM Research",
    expertise: ["Apache Spark", "Kafka Streams", "Lakehouse Architecture"],
    created_at: "2025-10-06T12:22:00.000Z",
    last_login: "2026-05-16T09:18:55.000Z",
    manager_verification: { status: "verified", review_note: "IBM ID + publications verified.", reviewed_at: "2025-10-08T10:00:00.000Z" },
  },

  // -------- LEARNERS (20) --------
  {
    id: 11,
    email: "daniel.petrov@learner.mindbridge.io",
    password_plaintext: "Learn#Sofia-2026!",
    password_hash: HASH("lrn_petrov"),
    full_name: "Daniel Petrov",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-11-petrov.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-BG",
    timezone: "Europe/Sofia",
    country: "Bulgaria",
    bio: "Backend engineer at a Sofia-based fintech, upskilling on event-driven architectures.",
    phone: "+359 88 412 9920",
    headline: "Backend Engineer, Paysera-EU",
    expertise: ["Java", "PostgreSQL"],
    created_at: "2025-11-12T08:00:00.000Z",
    last_login: "2026-05-17T20:33:00.000Z",
    manager_verification: null,
  },
  {
    id: 12,
    email: "anais.lefebvre@learner.mindbridge.io",
    password_plaintext: "Learn#Paris-2026!",
    password_hash: HASH("lrn_lefebvre"),
    full_name: "Anaïs Lefebvre",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-12-lefebvre.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: true,
    email_verified: true,
    status: "active",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    country: "France",
    bio: "Master's student at École Polytechnique focusing on applied mathematics for finance.",
    phone: "+33 1 69 33 41 80",
    headline: "Graduate Student, École Polytechnique",
    expertise: ["Statistics", "Python"],
    created_at: "2025-11-18T14:21:00.000Z",
    last_login: "2026-05-18T07:02:14.000Z",
    manager_verification: null,
  },
  {
    id: 13,
    email: "ravi.iyer@learner.mindbridge.io",
    password_plaintext: "Learn#Chennai-2026!",
    password_hash: HASH("lrn_iyer"),
    full_name: "Ravi Iyer",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-13-iyer.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    country: "India",
    bio: "Software engineer transitioning into ML platform work; prior experience at Freshworks.",
    phone: "+91 98 4012 8090",
    headline: "Software Engineer, Freshworks",
    expertise: ["TypeScript", "Node.js"],
    created_at: "2025-11-25T19:48:00.000Z",
    last_login: "2026-05-17T13:18:44.000Z",
    manager_verification: null,
  },
  {
    id: 14,
    email: "mei.tanaka@learner.mindbridge.io",
    password_plaintext: "Learn#Osaka-2026!",
    password_hash: HASH("lrn_tanaka"),
    full_name: "Mei Tanaka",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-14-tanaka.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "ja-JP",
    timezone: "Asia/Tokyo",
    country: "Japan",
    bio: "Data analyst at Rakuten Osaka office; interested in moving from BI to data engineering.",
    phone: "+81 6 6122 4408",
    headline: "Data Analyst, Rakuten",
    expertise: ["SQL", "Looker"],
    created_at: "2025-12-02T05:55:00.000Z",
    last_login: "2026-05-15T22:48:51.000Z",
    manager_verification: null,
  },
  {
    id: 15,
    email: "khalid.almansour@learner.mindbridge.io",
    password_plaintext: "Learn#Riyadh-2026!",
    password_hash: HASH("lrn_almansour"),
    full_name: "Khalid Al-Mansour",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-15-almansour.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "ar-SA",
    timezone: "Asia/Riyadh",
    country: "Saudi Arabia",
    bio: "Risk analyst at Saudi National Bank exploring Python automation for compliance reporting.",
    phone: "+966 11 425 7791",
    headline: "Risk Analyst, Saudi National Bank",
    expertise: ["Excel", "Compliance"],
    created_at: "2025-12-09T10:30:00.000Z",
    last_login: "2026-05-17T05:01:00.000Z",
    manager_verification: null,
  },
  {
    id: 16,
    email: "sofia.vargas@learner.mindbridge.io",
    password_plaintext: "Learn#Bogota-2026!",
    password_hash: HASH("lrn_vargas"),
    full_name: "Sofía Vargas",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-16-vargas.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "es-CO",
    timezone: "America/Bogota",
    country: "Colombia",
    bio: "Product manager at Rappi; pivoting toward LLM-powered product experiences.",
    phone: "+57 1 743 0982",
    headline: "Product Manager, Rappi",
    expertise: ["Product Strategy", "Agile"],
    created_at: "2025-12-14T16:10:00.000Z",
    last_login: "2026-05-17T17:55:39.000Z",
    manager_verification: null,
  },
  {
    id: 17,
    email: "lukas.nieminen@learner.mindbridge.io",
    password_plaintext: "Learn#Helsinki-2026!",
    password_hash: HASH("lrn_nieminen"),
    full_name: "Lukas Nieminen",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-17-nieminen.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "fi-FI",
    timezone: "Europe/Helsinki",
    country: "Finland",
    bio: "SRE at Wolt — preparing for the CKA exam and consolidating production-grade Kubernetes knowledge.",
    phone: "+358 9 8519 4421",
    headline: "Site Reliability Engineer, Wolt",
    expertise: ["Linux", "Prometheus"],
    created_at: "2025-12-22T07:43:00.000Z",
    last_login: "2026-05-18T08:11:25.000Z",
    manager_verification: null,
  },
  {
    id: 18,
    email: "chiamaka.eze@learner.mindbridge.io",
    password_plaintext: "Learn#Lagos-2026!",
    password_hash: HASH("lrn_eze"),
    full_name: "Chiamaka Eze",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-18-eze.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-NG",
    timezone: "Africa/Lagos",
    country: "Nigeria",
    bio: "Founder of a YC-backed health-tech startup, learning to evaluate LLM features before shipping.",
    phone: "+234 1 270 8814",
    headline: "Founder & CEO, Curacare Health",
    expertise: ["Entrepreneurship", "Healthcare"],
    created_at: "2026-01-04T09:00:00.000Z",
    last_login: "2026-05-17T19:21:09.000Z",
    manager_verification: null,
  },
  {
    id: 19,
    email: "emanuele.ricci@learner.mindbridge.io",
    password_plaintext: "Learn#Milan-2026!",
    password_hash: HASH("lrn_ricci"),
    full_name: "Emanuele Ricci",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-19-ricci.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "it-IT",
    timezone: "Europe/Rome",
    country: "Italy",
    bio: "DevOps engineer at a Milan-based e-commerce; preparing to migrate from EC2 to EKS.",
    phone: "+39 02 8732 4501",
    headline: "DevOps Engineer, YOOX Net-a-Porter",
    expertise: ["Docker", "Ansible"],
    created_at: "2026-01-11T11:35:00.000Z",
    last_login: "2026-05-17T15:08:12.000Z",
    manager_verification: null,
  },
  {
    id: 20,
    email: "hanna.kovaleva@learner.mindbridge.io",
    password_plaintext: "Learn#Tallinn-2026!",
    password_hash: HASH("lrn_kovaleva"),
    full_name: "Hanna Kovaleva",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-20-kovaleva.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "et-EE",
    timezone: "Europe/Tallinn",
    country: "Estonia",
    bio: "Cybersecurity analyst at the Estonian Information System Authority (RIA).",
    phone: "+372 663 0421",
    headline: "Security Analyst, RIA Estonia",
    expertise: ["SOC Tooling", "SIEM"],
    created_at: "2026-01-18T13:14:00.000Z",
    last_login: "2026-05-16T20:42:00.000Z",
    manager_verification: null,
  },
  {
    id: 21,
    email: "theo.vasiliou@learner.mindbridge.io",
    password_plaintext: "Learn#Athens-2026!",
    password_hash: HASH("lrn_vasiliou"),
    full_name: "Theo Vasiliou",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-21-vasiliou.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "el-GR",
    timezone: "Europe/Athens",
    country: "Greece",
    bio: "Recent MSc graduate in CS from NTUA, focused on systems programming and concurrency.",
    phone: "+30 21 0772 4581",
    headline: "MSc Graduate, NTUA",
    expertise: ["C++", "Rust"],
    created_at: "2026-01-25T18:00:00.000Z",
    last_login: "2026-05-17T22:51:14.000Z",
    manager_verification: null,
  },
  {
    id: 22,
    email: "aarav.sharma@learner.mindbridge.io",
    password_plaintext: "Learn#Mumbai-2026!",
    password_hash: HASH("lrn_sharma"),
    full_name: "Aarav Sharma",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-22-sharma.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    country: "India",
    bio: "Junior data scientist at Razorpay; reviewing fundamentals before transitioning to ML engineering.",
    phone: "+91 22 6181 3320",
    headline: "Data Scientist I, Razorpay",
    expertise: ["scikit-learn", "Tableau"],
    created_at: "2026-02-02T06:48:00.000Z",
    last_login: "2026-05-18T01:09:11.000Z",
    manager_verification: null,
  },
  {
    id: 23,
    email: "lucia.moretti@learner.mindbridge.io",
    password_plaintext: "Learn#Naples-2026!",
    password_hash: HASH("lrn_moretti"),
    full_name: "Lucia Moretti",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-23-moretti.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "it-IT",
    timezone: "Europe/Rome",
    country: "Italy",
    bio: "UX designer at a Naples-based consultancy; building the case for a unified design system internally.",
    phone: "+39 081 552 7708",
    headline: "Senior UX Designer, AlmavivA",
    expertise: ["Figma", "UX Research"],
    created_at: "2026-02-08T20:31:00.000Z",
    last_login: "2026-05-15T11:14:42.000Z",
    manager_verification: null,
  },
  {
    id: 24,
    email: "noor.hadid@learner.mindbridge.io",
    password_plaintext: "Learn#Dubai-2026!",
    password_hash: HASH("lrn_hadid"),
    full_name: "Noor Hadid",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-24-hadid.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-AE",
    timezone: "Asia/Dubai",
    country: "United Arab Emirates",
    bio: "Fintech BA at Mashreq Bank; bridging business stakeholders and analytics teams.",
    phone: "+971 4 207 5499",
    headline: "Business Analyst, Mashreq Bank",
    expertise: ["SQL", "Power BI"],
    created_at: "2026-02-15T08:11:00.000Z",
    last_login: "2026-05-17T07:00:00.000Z",
    manager_verification: null,
  },
  {
    id: 25,
    email: "tomas.salinas@learner.mindbridge.io",
    password_plaintext: "Learn#Santiago-2026!",
    password_hash: HASH("lrn_salinas"),
    full_name: "Tomás Salinas",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-25-salinas.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "es-CL",
    timezone: "America/Santiago",
    country: "Chile",
    bio: "Bioinformatics master's student at Universidad de Chile; working on cancer genomics.",
    phone: "+56 2 2978 6512",
    headline: "MSc Bioinformatics, Universidad de Chile",
    expertise: ["R", "Bash"],
    created_at: "2026-02-22T19:00:00.000Z",
    last_login: "2026-05-16T23:46:00.000Z",
    manager_verification: null,
  },
  {
    id: 26,
    email: "jiwon.lee@learner.mindbridge.io",
    password_plaintext: "Learn#Seoul-2026!",
    password_hash: HASH("lrn_lee"),
    full_name: "Ji-Won Lee",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-26-lee.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "ko-KR",
    timezone: "Asia/Seoul",
    country: "South Korea",
    bio: "Security engineer at Coupang; rotating into the offensive security team.",
    phone: "+82 2 1577 4029",
    headline: "Security Engineer, Coupang",
    expertise: ["Burp Suite", "Python"],
    created_at: "2026-03-01T09:22:00.000Z",
    last_login: "2026-05-18T05:24:18.000Z",
    manager_verification: null,
  },
  {
    id: 27,
    email: "priya.nair@learner.mindbridge.io",
    password_plaintext: "Learn#Kochi-2026!",
    password_hash: HASH("lrn_nair"),
    full_name: "Priya Nair",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-27-nair.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    country: "India",
    bio: "ML engineer at IBM Kochi; investigating responsible-AI evaluation suites for client deliverables.",
    phone: "+91 484 4012 1109",
    headline: "Machine Learning Engineer, IBM",
    expertise: ["PyTorch", "Responsible AI"],
    created_at: "2026-03-09T14:50:00.000Z",
    last_login: "2026-05-17T18:00:42.000Z",
    manager_verification: null,
  },
  {
    id: 28,
    email: "olu.adebayo@learner.mindbridge.io",
    password_plaintext: "Learn#Accra-2026!",
    password_hash: HASH("lrn_adebayo"),
    full_name: "Olu Adebayo",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-28-adebayo.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "pending",
    locale: "en-GH",
    timezone: "Africa/Accra",
    country: "Ghana",
    bio: "Self-taught full-stack developer building agriculture-finance dashboards for cooperatives.",
    phone: "+233 30 274 6620",
    headline: "Full-Stack Developer (Freelance)",
    expertise: ["Next.js", "Supabase"],
    created_at: "2026-03-18T11:11:00.000Z",
    last_login: "2026-05-12T17:30:00.000Z",
    manager_verification: null,
  },
  {
    id: 29,
    email: "camille.beauchamp@learner.mindbridge.io",
    password_plaintext: "Learn#Montreal-2026!",
    password_hash: HASH("lrn_beauchamp"),
    full_name: "Camille Beauchamp",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-29-beauchamp.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "fr-CA",
    timezone: "America/Montreal",
    country: "Canada",
    bio: "Computer vision intern at Mila working on multimodal diffusion priors.",
    phone: "+1 514 398 7720",
    headline: "Research Intern, Mila",
    expertise: ["PyTorch", "Computer Vision"],
    created_at: "2026-03-27T16:00:00.000Z",
    last_login: "2026-05-18T03:15:00.000Z",
    manager_verification: null,
  },
  {
    id: 30,
    email: "phuong.bui@learner.mindbridge.io",
    password_plaintext: "Learn#Hanoi-2026!",
    password_hash: HASH("lrn_bui"),
    full_name: "Phuong Bui",
    avatar_url: "https://cdn.mindbridge.io/avatars/u-30-bui.webp",
    roles: ["learner"],
    primary_role: "learner",
    is_2fa_enabled: false,
    email_verified: true,
    status: "active",
    locale: "vi-VN",
    timezone: "Asia/Ho_Chi_Minh",
    country: "Vietnam",
    bio: "Software engineer at FPT Software; aiming for AWS Solutions Architect Professional certification.",
    phone: "+84 24 7300 2241",
    headline: "Software Engineer, FPT Software",
    expertise: ["Spring Boot", "AWS"],
    created_at: "2026-04-03T07:05:00.000Z",
    last_login: "2026-05-18T02:48:00.000Z",
    manager_verification: null,
  },
];

// ---------------------------------------------------------------------------
// TOTP SEEDS — only for users with `is_2fa_enabled = true`
// ---------------------------------------------------------------------------

export const MOCK_TOTP_SEEDS: MockTotpSeed[] = [
  {
    user_id: 1,
    base32_secret: "JBSWY3DPEHPK3PXPADMINIVERSEN1A",
    algorithm: "SHA1",
    digits: 6,
    period_seconds: 30,
    recovery_codes: ["A1F4-9B22", "C7E0-4118", "D9A3-5577"],
  },
  {
    user_id: 2,
    base32_secret: "KRSXG5DPOJSXG5BAKRISHNAMURTHY9B",
    algorithm: "SHA1",
    digits: 6,
    period_seconds: 30,
    recovery_codes: ["BE12-44A0", "F31C-7895", "0D77-AA21"],
  },
  {
    user_id: 3,
    base32_secret: "ONUW42LRMEZGS3TJONXW2CMLCHEN03C",
    algorithm: "SHA1",
    digits: 6,
    period_seconds: 30,
    recovery_codes: ["1142-CCBB", "9981-AA31", "F0EE-7733"],
  },
  {
    user_id: 5,
    base32_secret: "NRZGK3LXNRWHK3LJOKONKWO5DEFA01",
    algorithm: "SHA1",
    digits: 6,
    period_seconds: 30,
    recovery_codes: ["44A1-90BB", "C2C3-77EE", "9988-1100"],
  },
  {
    user_id: 7,
    base32_secret: "MV4G42LRPRGGS33EMVZGYUNAPARK7G",
    algorithm: "SHA1",
    digits: 6,
    period_seconds: 30,
    recovery_codes: ["AB00-12C4", "5F1E-44A0", "D2E3-6677"],
  },
  {
    user_id: 12,
    base32_secret: "PIFHA33TOJQXG3LZN5ZHK4LEFEBVRE12",
    algorithm: "SHA1",
    digits: 6,
    period_seconds: 30,
    recovery_codes: ["7700-44AB", "21CD-EE91", "44C7-0009"],
  },
];

// ---------------------------------------------------------------------------
// COURSES — 12 published courses
// ---------------------------------------------------------------------------

export const MOCK_COURSES: MockCourse[] = [
  {
    id: 101,
    slug: "generative-ai-foundations-llm-fine-tuning",
    title: "Generative AI Foundations & LLM Fine-Tuning",
    short_description:
      "Build, fine-tune and evaluate production-grade large language models end-to-end with PyTorch and Hugging Face.",
    full_description:
      "A 10-week applied curriculum covering Transformer internals, parameter-efficient fine-tuning (LoRA, QLoRA), Retrieval-Augmented Generation, RLHF/DPO alignment, and rigorous evaluation harnesses. Each module ships with reproducible Colab notebooks and a portfolio-ready capstone.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-101-genai.webp",
    level: "advanced",
    category: "AI & Machine Learning",
    language: "en",
    price: 149.99,
    original_price: 199.99,
    currency: "USD",
    rating: 4.8,
    rating_count: 1247,
    learners_count: 18432,
    duration_hours: 42,
    best_seller: true,
    tags: ["LLM", "Fine-Tuning", "RAG", "PyTorch", "Hugging Face"],
    what_you_learn: [
      "Read and modify Transformer architectures at the attention-head level.",
      "Apply LoRA and QLoRA for memory-efficient fine-tuning on a single A100.",
      "Design a retrieval pipeline with hybrid BM25 + dense embeddings.",
      "Score model alignment with reward models and DPO training loops.",
      "Operationalize evaluation with HELM-style benchmarks and custom rubrics.",
    ],
    prerequisites: [
      "Comfortable with Python (NumPy, dataclasses, decorators).",
      "Working knowledge of supervised learning fundamentals.",
      "Linear algebra: matrix multiplication, eigenvalues, dot products.",
    ],
    owner_id: 3,
    co_instructor_ids: [7],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 42,
    created_at: "2025-07-01T09:00:00.000Z",
    published_at: "2025-09-12T15:30:00.000Z",
  },
  {
    id: 102,
    slug: "advanced-distributed-systems-with-go",
    title: "Advanced Distributed Systems with Go",
    short_description:
      "Engineer fault-tolerant distributed systems in Go: consensus, replication, idempotency and observability.",
    full_description:
      "An advanced systems-engineering course taught in Go 1.22+. Implement Raft from scratch, design idempotent APIs, run chaos experiments against a sharded key-value store, and instrument the whole pipeline with OpenTelemetry. Includes 6 hands-on labs and a final 3-week capstone.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-102-distributed.webp",
    level: "advanced",
    category: "Tech Stack Mastery",
    language: "en",
    price: 169.99,
    original_price: 199.99,
    currency: "USD",
    rating: 4.9,
    rating_count: 612,
    learners_count: 7420,
    duration_hours: 38,
    best_seller: true,
    tags: ["Go", "Distributed Systems", "Raft", "gRPC", "Observability"],
    what_you_learn: [
      "Implement a complete Raft consensus module with leader election and log replication.",
      "Design idempotent write paths immune to retries and network partitions.",
      "Diagnose tail-latency regressions with OpenTelemetry traces.",
      "Run controlled failure injection with chaos engineering primitives.",
    ],
    prerequisites: [
      "12 months of professional Go or systems engineering experience.",
      "Familiarity with HTTP, gRPC, and TCP networking basics.",
    ],
    owner_id: 4,
    co_instructor_ids: [],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 38,
    created_at: "2025-07-20T08:00:00.000Z",
    published_at: "2025-09-25T10:15:00.000Z",
  },
  {
    id: 103,
    slug: "financial-analytics-with-python-pandas",
    title: "Financial Analytics with Python & Pandas",
    short_description:
      "Apply quantitative analytics on real market data: factor modeling, backtesting and risk reporting.",
    full_description:
      "A practitioner-led curriculum bridging finance theory with Python tooling. You will build a clean factor data pipeline, design statistical signals, backtest with vectorbt, and ship a publication-quality risk-report PDF for a long/short equity book.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-103-finance.webp",
    level: "intermediate",
    category: "Business Strategy",
    language: "en",
    price: 89.99,
    original_price: 119.99,
    currency: "USD",
    rating: 4.6,
    rating_count: 945,
    learners_count: 12108,
    duration_hours: 28,
    best_seller: false,
    tags: ["Python", "Pandas", "Quant", "Backtesting"],
    what_you_learn: [
      "Engineer point-in-time correct factor datasets from CRSP-like sources.",
      "Run cross-sectional regressions and IC-based factor evaluation.",
      "Construct portfolio backtests with realistic transaction-cost models.",
      "Generate VaR, ES and stress-test reports for a $50M long/short book.",
    ],
    prerequisites: [
      "Comfortable reading basic financial statements.",
      "Python intermediate (functions, list comprehensions, classes).",
    ],
    owner_id: 5,
    co_instructor_ids: [],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 28,
    created_at: "2025-08-05T11:20:00.000Z",
    published_at: "2025-10-08T13:00:00.000Z",
  },
  {
    id: 104,
    slug: "cloud-native-microservices-on-aws",
    title: "Cloud-Native Microservices on AWS",
    short_description:
      "Design, deploy and operate production microservices on AWS with ECS Fargate, EKS and Terraform.",
    full_description:
      "A pragmatic AWS architecture course built around a real e-commerce reference application. You will design 9 services, manage 4 environments with Terraform Cloud, hook up structured logging through CloudWatch + Loki, and ship a blue/green deployment pipeline.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-104-aws.webp",
    level: "intermediate",
    category: "Tech Stack Mastery",
    language: "en",
    price: 129.99,
    original_price: 159.99,
    currency: "USD",
    rating: 4.7,
    rating_count: 1834,
    learners_count: 22011,
    duration_hours: 36,
    best_seller: true,
    tags: ["AWS", "Microservices", "Terraform", "EKS", "Fargate"],
    what_you_learn: [
      "Design service boundaries with Domain-Driven Design heuristics.",
      "Provision multi-region infrastructure with Terraform workspaces.",
      "Run reliable blue/green deployments with progressive traffic shifting.",
      "Tune cost with right-sizing and Savings Plans coverage analysis.",
    ],
    prerequisites: [
      "Familiarity with Docker and a working AWS free-tier account.",
      "Experience with at least one backend language (Node, Java, Go, Python).",
    ],
    owner_id: 6,
    co_instructor_ids: [],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 36,
    created_at: "2025-08-18T08:00:00.000Z",
    published_at: "2025-10-15T11:30:00.000Z",
  },
  {
    id: 105,
    slug: "modern-cybersecurity-zero-trust-threat-hunting",
    title: "Modern Cybersecurity: Zero-Trust & Threat Hunting",
    short_description:
      "Implement Zero-Trust architecture, hunt threats in SIEM data and orchestrate incident response.",
    full_description:
      "An offensive-aware defensive curriculum: identity-first Zero-Trust controls, hunting hypotheses against a simulated Active Directory forest, MITRE ATT&CK mapping, and tabletop incident response. Includes 4 capture-the-flag labs hosted on a hardened sandbox.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-105-cybersec.webp",
    level: "advanced",
    category: "Tech Stack Mastery",
    language: "en",
    price: 139.99,
    original_price: 189.99,
    currency: "USD",
    rating: 4.8,
    rating_count: 723,
    learners_count: 6890,
    duration_hours: 34,
    best_seller: false,
    tags: ["Cybersecurity", "Zero Trust", "Threat Hunting", "SIEM"],
    what_you_learn: [
      "Translate Zero-Trust principles into BeyondCorp-style policy enforcement.",
      "Construct hunt hypotheses tied to MITRE ATT&CK techniques.",
      "Detect post-exploitation behaviors in Sysmon and Zeek telemetry.",
      "Run a tabletop incident response with executive-grade communications.",
    ],
    prerequisites: [
      "Basic Linux + networking fundamentals (CIDR, TCP three-way handshake).",
      "Familiarity with at least one SIEM (Splunk, Elastic, Sentinel).",
    ],
    owner_id: 7,
    co_instructor_ids: [6],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 34,
    created_at: "2025-09-02T10:00:00.000Z",
    published_at: "2025-11-04T09:00:00.000Z",
  },
  {
    id: 106,
    slug: "product-led-ux-design-systems-for-scale",
    title: "Product-Led UX: Design Systems for Scale",
    short_description:
      "Build a token-driven design system in Figma that ships to React and survives 5 product teams.",
    full_description:
      "A senior designer's playbook for taking a design system from one product to a multi-surface platform. You will define design tokens, codify motion semantics, set up Figma libraries with variables, and create governance rituals that keep your system trusted by engineering.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-106-ux.webp",
    level: "intermediate",
    category: "Design & UX",
    language: "en",
    price: 79.99,
    original_price: 99.99,
    currency: "USD",
    rating: 4.7,
    rating_count: 1056,
    learners_count: 14290,
    duration_hours: 22,
    best_seller: false,
    tags: ["Design Systems", "Figma", "Tokens", "Accessibility"],
    what_you_learn: [
      "Author multi-mode design tokens with primitive + semantic layers.",
      "Build a Figma library that survives rebrands and theme switches.",
      "Generate platform-specific stylesheets with Style Dictionary.",
      "Run quarterly governance and contribution rituals at scale.",
    ],
    prerequisites: [
      "2+ years of product design experience.",
      "Working knowledge of Figma Auto Layout and Variables.",
    ],
    owner_id: 8,
    co_instructor_ids: [],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 22,
    created_at: "2025-09-20T07:30:00.000Z",
    published_at: "2025-11-18T15:45:00.000Z",
  },
  {
    id: 107,
    slug: "applied-bioinformatics-genome-pipelines",
    title: "Applied Bioinformatics: Genome Pipelines",
    short_description:
      "Build reproducible genome analysis pipelines with Nextflow, GATK and modern cloud storage.",
    full_description:
      "From FASTQ to variant call: this curriculum covers quality control, alignment, variant calling, annotation, and reproducibility. Pipelines run locally via Docker and scale to AWS Batch + S3 with the same Nextflow code.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-107-bioinfo.webp",
    level: "intermediate",
    category: "AI & Machine Learning",
    language: "en",
    price: 109.99,
    original_price: 149.99,
    currency: "USD",
    rating: 4.5,
    rating_count: 408,
    learners_count: 3210,
    duration_hours: 30,
    best_seller: false,
    tags: ["Bioinformatics", "Nextflow", "GATK", "Genomics"],
    what_you_learn: [
      "Run end-to-end germline variant calling on a 30x WGS sample.",
      "Author Nextflow DSL2 pipelines portable across local and AWS Batch.",
      "Track provenance and reproducibility with config snapshots and digests.",
      "Annotate variants with Ensembl VEP and integrate into clinical reports.",
    ],
    prerequisites: [
      "Comfortable on a Linux command line and with Git.",
      "Basic familiarity with molecular biology fundamentals.",
    ],
    owner_id: 9,
    co_instructor_ids: [],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 30,
    created_at: "2025-10-01T09:00:00.000Z",
    published_at: "2025-12-02T10:00:00.000Z",
  },
  {
    id: 108,
    slug: "data-engineering-with-apache-spark-kafka",
    title: "Data Engineering with Apache Spark & Kafka",
    short_description:
      "Design petabyte-scale lakehouses that ingest, transform and serve data with sub-second latency.",
    full_description:
      "Hands-on data engineering with Spark 3.5 Structured Streaming, Kafka, Delta Lake, and orchestration with Airflow 2.9. Includes a 4-week capstone replicating a streaming clickstream pipeline used in production at IBM/The Weather Company.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-108-dataeng.webp",
    level: "advanced",
    category: "Tech Stack Mastery",
    language: "en",
    price: 159.99,
    original_price: 199.99,
    currency: "USD",
    rating: 4.7,
    rating_count: 532,
    learners_count: 5102,
    duration_hours: 40,
    best_seller: true,
    tags: ["Apache Spark", "Kafka", "Delta Lake", "Airflow"],
    what_you_learn: [
      "Architect a medallion-layout lakehouse on Delta or Iceberg.",
      "Tune Spark joins, skew handling and AQE for petabyte workloads.",
      "Run exactly-once Kafka → Spark → Delta streaming pipelines.",
      "Operate Airflow at scale with dynamic task mapping and SLAs.",
    ],
    prerequisites: [
      "Working Python and SQL knowledge.",
      "Familiarity with batch ETL concepts.",
    ],
    owner_id: 10,
    co_instructor_ids: [],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 40,
    created_at: "2025-10-12T07:45:00.000Z",
    published_at: "2025-12-15T09:30:00.000Z",
  },
  {
    id: 109,
    slug: "generative-ai-for-business-strategy",
    title: "Generative AI for Business Strategy",
    short_description:
      "A business-school playbook for evaluating, piloting and scaling Generative AI inside the enterprise.",
    full_description:
      "Designed for product, strategy and operations leaders. Map your value chain to LLM opportunities, build a defensible business case, and avoid the seven failure modes that derail enterprise GenAI rollouts.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-109-genai-biz.webp",
    level: "beginner",
    category: "Business Strategy",
    language: "en",
    price: 49.99,
    original_price: 79.99,
    currency: "USD",
    rating: 4.4,
    rating_count: 1620,
    learners_count: 24910,
    duration_hours: 14,
    best_seller: true,
    tags: ["Strategy", "Generative AI", "Leadership"],
    what_you_learn: [
      "Map enterprise value chains to LLM-replaceable workflows.",
      "Build TCO and ROI models that survive CFO scrutiny.",
      "Run governance reviews aligned with EU AI Act categories.",
      "Avoid the seven most common GenAI pilot failure modes.",
    ],
    prerequisites: [
      "Mid-level business stakeholder role (PM, ops, strategy).",
    ],
    owner_id: 3,
    co_instructor_ids: [],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 14,
    created_at: "2025-11-02T08:30:00.000Z",
    published_at: "2026-01-05T12:00:00.000Z",
  },
  {
    id: 110,
    slug: "kubernetes-in-production-sre-playbook",
    title: "Kubernetes in Production: SRE Playbook",
    short_description:
      "Operate Kubernetes the way mature SRE teams do — SLOs, autoscaling, cost control and zero-downtime rollouts.",
    full_description:
      "A SRE-flavored Kubernetes course. Define SLOs, design autoscaling that respects unit economics, manage cluster fleets with Cluster API and Argo CD, and ship a postmortem-ready incident response playbook.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-110-k8s.webp",
    level: "advanced",
    category: "Tech Stack Mastery",
    language: "en",
    price: 119.99,
    original_price: 149.99,
    currency: "USD",
    rating: 4.8,
    rating_count: 814,
    learners_count: 9322,
    duration_hours: 32,
    best_seller: false,
    tags: ["Kubernetes", "SRE", "Argo CD", "SLO"],
    what_you_learn: [
      "Define SLIs, SLOs and error budgets for HTTP and async workloads.",
      "Right-size HPA + VPA + Cluster Autoscaler with cost feedback loops.",
      "Manage multi-cluster fleets declaratively with Argo CD and Cluster API.",
      "Run a structured postmortem with an actionable corrective-actions matrix.",
    ],
    prerequisites: [
      "Familiarity with kubectl and a basic understanding of Docker images.",
    ],
    owner_id: 6,
    co_instructor_ids: [4],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 32,
    created_at: "2025-11-18T09:00:00.000Z",
    published_at: "2026-01-20T10:00:00.000Z",
  },
  {
    id: 111,
    slug: "quantitative-risk-modeling-for-fintech",
    title: "Quantitative Risk Modeling for Fintech",
    short_description:
      "Model credit, market and operational risk with statistical rigor — production-grade, Basel-aligned.",
    full_description:
      "A practitioner-led journey through credit scorecards, PD/LGD/EAD modeling, market risk VaR/ES, and operational risk loss distribution approaches. Includes Python notebooks aligned with PRA, EBA, and Basel III/IV guidance.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-111-risk.webp",
    level: "advanced",
    category: "Business Strategy",
    language: "en",
    price: 179.99,
    original_price: 199.99,
    currency: "USD",
    rating: 4.6,
    rating_count: 311,
    learners_count: 2870,
    duration_hours: 36,
    best_seller: false,
    tags: ["Risk", "Quant", "Basel", "Python"],
    what_you_learn: [
      "Engineer reproducible PD/LGD/EAD models on bureau-quality data.",
      "Calibrate parametric and historical VaR with backtesting suites.",
      "Apply LDA techniques to operational loss data with rare-event corrections.",
      "Prepare model documentation aligned with SR 11-7 expectations.",
    ],
    prerequisites: [
      "Working knowledge of probability and statistics.",
      "Comfortable in Python with pandas, numpy and scikit-learn.",
    ],
    owner_id: 5,
    co_instructor_ids: [10],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 36,
    created_at: "2025-12-04T08:00:00.000Z",
    published_at: "2026-02-10T09:00:00.000Z",
  },
  {
    id: 112,
    slug: "computer-vision-with-transformers-pytorch",
    title: "Computer Vision with Transformers & PyTorch",
    short_description:
      "Master modern computer vision: ViTs, DETR, segmentation, and multimodal diffusion priors.",
    full_description:
      "An end-to-end computer vision course built around the PyTorch + timm ecosystem. You will train classification ViTs, fine-tune segmentation heads, deploy with TorchServe, and connect a Stable Diffusion-style multimodal backbone.",
    thumbnail_url: "https://cdn.mindbridge.io/thumbs/course-112-cv.webp",
    level: "advanced",
    category: "AI & Machine Learning",
    language: "en",
    price: 139.99,
    original_price: 179.99,
    currency: "USD",
    rating: 4.7,
    rating_count: 487,
    learners_count: 5410,
    duration_hours: 34,
    best_seller: false,
    tags: ["Computer Vision", "Transformers", "PyTorch", "Segmentation"],
    what_you_learn: [
      "Implement Vision Transformers and their masked autoencoder variants.",
      "Fine-tune detection (DETR) and segmentation (Mask2Former) heads.",
      "Serve models with TorchServe behind autoscaling endpoints.",
      "Build a multimodal pipeline mixing CLIP-style embeddings with diffusion priors.",
    ],
    prerequisites: [
      "Comfortable with PyTorch fundamentals (tensors, autograd).",
      "Prior exposure to CNNs (ResNet-level intuition).",
    ],
    owner_id: 7,
    co_instructor_ids: [3],
    status: "published",
    is_active: true,
    has_certificate: true,
    estimated_hours: 34,
    created_at: "2025-12-22T10:00:00.000Z",
    published_at: "2026-03-01T11:00:00.000Z",
  },
];

// ---------------------------------------------------------------------------
// MODULES & LESSONS
//
// Each course has exactly 4 modules; each module has exactly 3 lessons (some
// mixed with quiz / assignment / live), for a total of 144 lessons.
// ---------------------------------------------------------------------------

type LessonSpec = {
  title: string;
  type: LessonType;
  duration_seconds: number;
  description: string;
  resource_kind: MockLesson["resource_kind"];
  content_url: string | null;
};

type ModuleSpec = {
  title: string;
  description: string;
  lessons: [LessonSpec, LessonSpec, LessonSpec];
};

type CourseBlueprint = {
  course_id: number;
  modules: [ModuleSpec, ModuleSpec, ModuleSpec, ModuleSpec];
};

const VIDEO = (slug: string): string =>
  `https://cdn.mindbridge.io/lessons/${slug}.mp4`;
const READING = (slug: string): string =>
  `https://cdn.mindbridge.io/lessons/${slug}.pdf`;

const COURSE_BLUEPRINTS: CourseBlueprint[] = [
  {
    course_id: 101,
    modules: [
      {
        title: "Module 1 · Transformer Foundations",
        description: "Re-derive attention, positional encodings and decoder/encoder topologies.",
        lessons: [
          { title: "Attention Is All You Need — Re-Reading the Original Paper", type: "video", duration_seconds: 1620, description: "Annotated walkthrough of the 2017 Transformer paper.", resource_kind: "youtube", content_url: VIDEO("c101-l01-attention") },
          { title: "Positional Encodings: Sinusoidal vs RoPE vs ALiBi", type: "text", duration_seconds: 1200, description: "Reading with intuition diagrams and interactive notebook.", resource_kind: "pdf", content_url: READING("c101-l02-positional") },
          { title: "Quiz: Architectural Building Blocks", type: "quiz", duration_seconds: 1500, description: "20-question gated quiz before moving to fine-tuning.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Parameter-Efficient Fine-Tuning",
        description: "Apply LoRA and QLoRA to adapt 7B-parameter models on a single GPU.",
        lessons: [
          { title: "LoRA Internals: Why Rank-8 Often Suffices", type: "video", duration_seconds: 1980, description: "Whiteboard derivation of the low-rank update path.", resource_kind: "video", content_url: VIDEO("c101-l03-lora") },
          { title: "QLoRA Setup with bitsandbytes 4-bit Quantization", type: "video", duration_seconds: 2280, description: "Hands-on lab fine-tuning Mistral-7B on a 24GB GPU.", resource_kind: "video", content_url: VIDEO("c101-l04-qlora") },
          { title: "Assignment: Fine-Tune for a Domain-Specific Task", type: "assignment", duration_seconds: 0, description: "Capstone fine-tuning task with rubric grading.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Retrieval-Augmented Generation",
        description: "Architect production retrieval pipelines from chunking to re-ranking.",
        lessons: [
          { title: "Chunking Strategies and Embedding Models", type: "video", duration_seconds: 1740, description: "Hybrid sparse + dense retrieval design tradeoffs.", resource_kind: "video", content_url: VIDEO("c101-l05-rag-chunk") },
          { title: "Cross-Encoder Re-Ranking with bge-reranker", type: "text", duration_seconds: 1320, description: "Lab notebook integrating cross-encoder re-rankers.", resource_kind: "pdf", content_url: READING("c101-l06-rerank") },
          { title: "Live Lab: RAG Evaluation Harness", type: "live", duration_seconds: 3600, description: "Live evaluation lab using RAGAS and TruLens.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Alignment & Evaluation",
        description: "Move from supervised fine-tuning to RLHF / DPO and HELM-style evaluation.",
        lessons: [
          { title: "Reward Modeling and Preference Datasets", type: "video", duration_seconds: 1860, description: "Hands-on construction of a preference dataset.", resource_kind: "video", content_url: VIDEO("c101-l07-reward") },
          { title: "Direct Preference Optimization (DPO)", type: "video", duration_seconds: 2040, description: "Comparing PPO and DPO with stable-baselines3.", resource_kind: "video", content_url: VIDEO("c101-l08-dpo") },
          { title: "Quiz: Alignment & Eval Synthesis", type: "quiz", duration_seconds: 1500, description: "Final assessment for the alignment module.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 102,
    modules: [
      {
        title: "Module 1 · Foundations of Distributed Systems",
        description: "Failure models, the CAP theorem, and the cost of coordination.",
        lessons: [
          { title: "Failure Models and Time in Distributed Systems", type: "video", duration_seconds: 1800, description: "Crash, omission, Byzantine failures and synchronicity.", resource_kind: "video", content_url: VIDEO("c102-l01-time") },
          { title: "CAP, PACELC, and Consistency Hierarchies", type: "text", duration_seconds: 1500, description: "A precise revisiting of CAP misconceptions.", resource_kind: "pdf", content_url: READING("c102-l02-cap") },
          { title: "Quiz: Foundations Check", type: "quiz", duration_seconds: 1200, description: "Gated quiz before consensus lessons.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Raft Consensus from Scratch",
        description: "Implement leader election, log replication, and safety guarantees.",
        lessons: [
          { title: "Leader Election Step-by-Step in Go", type: "video", duration_seconds: 2220, description: "Live coding leader election with Go goroutines.", resource_kind: "video", content_url: VIDEO("c102-l03-raft-elect") },
          { title: "Log Replication and Commit Index Semantics", type: "video", duration_seconds: 2400, description: "Implementing AppendEntries with full safety proofs.", resource_kind: "video", content_url: VIDEO("c102-l04-raft-log") },
          { title: "Assignment: Pass the Raft Linearizability Tests", type: "assignment", duration_seconds: 0, description: "Capstone assignment validating Raft correctness.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Sharded Key-Value Store",
        description: "Design and operate a sharded KV with reconfiguration.",
        lessons: [
          { title: "Sharding Strategies and Routing Tables", type: "video", duration_seconds: 1980, description: "Consistent hashing, virtual nodes, and routing.", resource_kind: "video", content_url: VIDEO("c102-l05-shard") },
          { title: "Reconfiguration without Downtime", type: "text", duration_seconds: 1440, description: "Live shard movement and snapshot handoff.", resource_kind: "pdf", content_url: READING("c102-l06-reconfig") },
          { title: "Live Lab: Chaos Testing Your KV Store", type: "live", duration_seconds: 3600, description: "Failure injection with the chaos toolkit.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Observability and SLOs",
        description: "Make distributed behavior legible with traces, logs and SLOs.",
        lessons: [
          { title: "OpenTelemetry End-to-End in Go", type: "video", duration_seconds: 1800, description: "Tracing across services and async boundaries.", resource_kind: "video", content_url: VIDEO("c102-l07-otel") },
          { title: "Defining SLOs and Error Budgets", type: "video", duration_seconds: 1620, description: "From SLI menu to error-budget policy.", resource_kind: "video", content_url: VIDEO("c102-l08-slo") },
          { title: "Quiz: Observability and SLO Reasoning", type: "quiz", duration_seconds: 1500, description: "Concluding quiz covering observability.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 103,
    modules: [
      {
        title: "Module 1 · Clean Market Data",
        description: "Engineer point-in-time correct datasets from raw vendor feeds.",
        lessons: [
          { title: "Survivorship Bias and Point-in-Time Universes", type: "video", duration_seconds: 1500, description: "Reconstructing the investable universe correctly.", resource_kind: "video", content_url: VIDEO("c103-l01-pit") },
          { title: "Corporate Actions: Splits, Dividends, Mergers", type: "text", duration_seconds: 1320, description: "Practical adjustments with worked examples.", resource_kind: "pdf", content_url: READING("c103-l02-corp-actions") },
          { title: "Quiz: Data Engineering Sanity Check", type: "quiz", duration_seconds: 1200, description: "Concept check before factor design.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Factor Modeling",
        description: "From signal idea to IC-validated factor.",
        lessons: [
          { title: "Cross-Sectional Regressions in Pandas", type: "video", duration_seconds: 1740, description: "Hands-on factor regressions on US equities.", resource_kind: "video", content_url: VIDEO("c103-l03-xs-reg") },
          { title: "Information Coefficient Pitfalls", type: "text", duration_seconds: 1380, description: "Multiple-testing corrections and IC autocorrelation.", resource_kind: "pdf", content_url: READING("c103-l04-ic") },
          { title: "Assignment: Build and Validate a Momentum Factor", type: "assignment", duration_seconds: 0, description: "Capstone factor design assignment.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Backtesting with vectorbt",
        description: "Translate signals into honest, transaction-cost-aware backtests.",
        lessons: [
          { title: "Vectorized Backtesting Patterns", type: "video", duration_seconds: 1860, description: "Lab on portfolio simulation with vectorbt.", resource_kind: "video", content_url: VIDEO("c103-l05-vbt") },
          { title: "Transaction Costs and Capacity Modeling", type: "text", duration_seconds: 1500, description: "Slippage, market impact, capacity.", resource_kind: "pdf", content_url: READING("c103-l06-costs") },
          { title: "Live Lab: Backtest Diagnostics Workshop", type: "live", duration_seconds: 3600, description: "Diagnose overfit signals as a group.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Risk Reporting",
        description: "Produce publication-grade risk reports for portfolio managers.",
        lessons: [
          { title: "VaR and Expected Shortfall in Practice", type: "video", duration_seconds: 1620, description: "Parametric, historical, and Monte Carlo VaR.", resource_kind: "video", content_url: VIDEO("c103-l07-var") },
          { title: "Stress Tests and Scenario Construction", type: "video", duration_seconds: 1500, description: "Designing macro scenarios with internal consistency.", resource_kind: "video", content_url: VIDEO("c103-l08-stress") },
          { title: "Quiz: Risk Reporting Concept Check", type: "quiz", duration_seconds: 1200, description: "Final assessment for module 4.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 104,
    modules: [
      {
        title: "Module 1 · Service Decomposition",
        description: "Identify the right service boundaries and ownership models.",
        lessons: [
          { title: "Domain-Driven Design Heuristics for Microservices", type: "video", duration_seconds: 1800, description: "Bounded contexts and aggregate boundaries.", resource_kind: "video", content_url: VIDEO("c104-l01-ddd") },
          { title: "Strangler Fig Migrations from Monoliths", type: "text", duration_seconds: 1500, description: "Practical playbook with traffic shifting tactics.", resource_kind: "pdf", content_url: READING("c104-l02-strangler") },
          { title: "Quiz: Service Boundary Reasoning", type: "quiz", duration_seconds: 1200, description: "Concept check before infra-as-code.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Infrastructure as Code",
        description: "Manage multi-environment AWS infrastructure with Terraform.",
        lessons: [
          { title: "Terraform Workspaces and Remote State", type: "video", duration_seconds: 1980, description: "Hands-on lab with Terraform Cloud workspaces.", resource_kind: "video", content_url: VIDEO("c104-l03-tf-ws") },
          { title: "Reusable Modules and Module Versioning", type: "video", duration_seconds: 1740, description: "Authoring a private module registry.", resource_kind: "video", content_url: VIDEO("c104-l04-tf-mod") },
          { title: "Assignment: Provision a Reference VPC Architecture", type: "assignment", duration_seconds: 0, description: "Capstone for module 2.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Deployment Pipelines",
        description: "Run reliable blue/green and progressive deployments.",
        lessons: [
          { title: "Blue/Green vs Canary on ECS Fargate", type: "video", duration_seconds: 1620, description: "Pros and cons with CodeDeploy.", resource_kind: "video", content_url: VIDEO("c104-l05-bg") },
          { title: "Progressive Delivery with App Mesh", type: "text", duration_seconds: 1500, description: "Traffic shifting with weighted virtual nodes.", resource_kind: "pdf", content_url: READING("c104-l06-appmesh") },
          { title: "Live Lab: Pipeline Walkthrough", type: "live", duration_seconds: 3600, description: "Live CI/CD pipeline design with attendees.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Observability and Cost",
        description: "Operate services with clear visibility and predictable spend.",
        lessons: [
          { title: "Structured Logging and Log Routing", type: "video", duration_seconds: 1620, description: "JSON logs, log ingestion budgets, and routing.", resource_kind: "video", content_url: VIDEO("c104-l07-logs") },
          { title: "Right-Sizing and Savings Plans Coverage", type: "video", duration_seconds: 1500, description: "Cost feedback loops and reserved capacity.", resource_kind: "video", content_url: VIDEO("c104-l08-cost") },
          { title: "Quiz: Cost & Observability Final", type: "quiz", duration_seconds: 1200, description: "End-of-course knowledge check.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 105,
    modules: [
      {
        title: "Module 1 · Zero-Trust Architecture",
        description: "Move from perimeter-based to identity-based access control.",
        lessons: [
          { title: "Zero-Trust First Principles", type: "video", duration_seconds: 1620, description: "BeyondCorp, BeyondProd, and modern reference architectures.", resource_kind: "video", content_url: VIDEO("c105-l01-zt") },
          { title: "Identity-Aware Proxies and Policy Engines", type: "text", duration_seconds: 1500, description: "Cloud-native identity proxies in production.", resource_kind: "pdf", content_url: READING("c105-l02-iap") },
          { title: "Quiz: Architecture Concepts", type: "quiz", duration_seconds: 1200, description: "Concept check before threat hunting.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Threat Hunting Fundamentals",
        description: "Translate ATT&CK techniques into measurable hunt hypotheses.",
        lessons: [
          { title: "Hunt Hypotheses and the Diamond Model", type: "video", duration_seconds: 1800, description: "Practical hypothesis-driven hunting workflow.", resource_kind: "video", content_url: VIDEO("c105-l03-hunt") },
          { title: "Sysmon and Zeek as Detection Telemetry", type: "video", duration_seconds: 2040, description: "Tuning Sysmon and Zeek for actionable signals.", resource_kind: "video", content_url: VIDEO("c105-l04-sysmon") },
          { title: "Assignment: Build a Hunt Playbook for T1059", type: "assignment", duration_seconds: 0, description: "Capstone hunt playbook for command-and-scripting interpreter.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · SIEM Engineering",
        description: "Architect a SIEM that scales and stays affordable.",
        lessons: [
          { title: "Schema Normalization in Splunk and Sentinel", type: "video", duration_seconds: 1620, description: "Normalize disparate sources into a CIM-like schema.", resource_kind: "video", content_url: VIDEO("c105-l05-siem-norm") },
          { title: "Detection Engineering Lifecycle", type: "text", duration_seconds: 1500, description: "From hypothesis to deployed rule with version control.", resource_kind: "pdf", content_url: READING("c105-l06-detection") },
          { title: "Live Lab: Detect Lateral Movement", type: "live", duration_seconds: 3600, description: "Live exercise in a sandbox AD forest.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Incident Response",
        description: "Run a credible, executive-grade incident response.",
        lessons: [
          { title: "IR Lifecycle and Tabletop Drills", type: "video", duration_seconds: 1500, description: "NIST 800-61 in practice.", resource_kind: "video", content_url: VIDEO("c105-l07-ir") },
          { title: "Communicating Incidents to Executives", type: "video", duration_seconds: 1320, description: "Crafting briefings that drive action.", resource_kind: "video", content_url: VIDEO("c105-l08-exec") },
          { title: "Quiz: IR Decision-Making", type: "quiz", duration_seconds: 1200, description: "Final assessment.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 106,
    modules: [
      {
        title: "Module 1 · Design Tokens",
        description: "Author multi-mode design tokens with semantics that survive rebrands.",
        lessons: [
          { title: "Primitive vs Semantic Tokens", type: "video", duration_seconds: 1620, description: "Token hierarchies and rename safety.", resource_kind: "video", content_url: VIDEO("c106-l01-tokens") },
          { title: "Multi-Mode Tokens for Theming", type: "text", duration_seconds: 1380, description: "Light/dark/high-contrast modes with Figma Variables.", resource_kind: "pdf", content_url: READING("c106-l02-multimode") },
          { title: "Quiz: Token Design Principles", type: "quiz", duration_seconds: 1200, description: "Concept check before tooling.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Figma Library Architecture",
        description: "Build a Figma library that doesn't collapse under team scale.",
        lessons: [
          { title: "Component Architecture with Variants", type: "video", duration_seconds: 1740, description: "Variants, slots and component properties.", resource_kind: "video", content_url: VIDEO("c106-l03-variants") },
          { title: "Library Publishing and Versioning", type: "video", duration_seconds: 1500, description: "Semantic versioning for design libraries.", resource_kind: "video", content_url: VIDEO("c106-l04-version") },
          { title: "Assignment: Publish a Form Components Library", type: "assignment", duration_seconds: 0, description: "Build and publish a form component library.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Code Integration",
        description: "Bridge Figma tokens to React with Style Dictionary.",
        lessons: [
          { title: "Style Dictionary Tooling Deep Dive", type: "video", duration_seconds: 1620, description: "Custom formats for CSS, iOS, Android.", resource_kind: "video", content_url: VIDEO("c106-l05-style-dict") },
          { title: "Theming Patterns in React", type: "text", duration_seconds: 1380, description: "CSS variables and provider patterns.", resource_kind: "pdf", content_url: READING("c106-l06-react") },
          { title: "Live Lab: Round-Tripping Tokens", type: "live", duration_seconds: 3600, description: "Live design-to-code round trip workshop.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Governance",
        description: "Sustain trust and adoption through governance rituals.",
        lessons: [
          { title: "Quarterly Governance Reviews", type: "video", duration_seconds: 1320, description: "Cadence and metrics for design system health.", resource_kind: "video", content_url: VIDEO("c106-l07-gov") },
          { title: "Contribution Models", type: "video", duration_seconds: 1200, description: "Federated and hub-and-spoke models.", resource_kind: "video", content_url: VIDEO("c106-l08-contrib") },
          { title: "Quiz: Governance Decision Cases", type: "quiz", duration_seconds: 1200, description: "Final knowledge check.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 107,
    modules: [
      {
        title: "Module 1 · Quality Control",
        description: "Run rigorous QC on raw sequencing reads.",
        lessons: [
          { title: "FastQC Walkthrough on Real WGS Data", type: "video", duration_seconds: 1620, description: "Reading FastQC reports like a clinician.", resource_kind: "video", content_url: VIDEO("c107-l01-fastqc") },
          { title: "Trimming and Adapter Removal Strategies", type: "text", duration_seconds: 1380, description: "Trimmomatic and fastp options.", resource_kind: "pdf", content_url: READING("c107-l02-trim") },
          { title: "Quiz: QC Concepts", type: "quiz", duration_seconds: 1200, description: "Concept check before alignment.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Alignment",
        description: "Align reads with BWA-MEM2 and analyze coverage.",
        lessons: [
          { title: "BWA-MEM2 and Reference Genomes", type: "video", duration_seconds: 1740, description: "Practical alignment lab with real data.", resource_kind: "video", content_url: VIDEO("c107-l03-bwa") },
          { title: "Coverage Diagnostics", type: "video", duration_seconds: 1500, description: "Mosdepth analyses and exome QC.", resource_kind: "video", content_url: VIDEO("c107-l04-coverage") },
          { title: "Assignment: Build a Sample-Level QC Report", type: "assignment", duration_seconds: 0, description: "Generate a per-sample QC summary report.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Variant Calling",
        description: "Call germline and somatic variants with GATK and Strelka2.",
        lessons: [
          { title: "GATK Best Practices for Germline Variants", type: "video", duration_seconds: 1980, description: "HaplotypeCaller through joint genotyping.", resource_kind: "video", content_url: VIDEO("c107-l05-gatk") },
          { title: "Filtering Variants with VQSR vs Hard Filters", type: "text", duration_seconds: 1500, description: "Practical filter sets for different cohorts.", resource_kind: "pdf", content_url: READING("c107-l06-filter") },
          { title: "Live Lab: Joint Genotyping Walkthrough", type: "live", duration_seconds: 3600, description: "Live joint genotyping on cohort data.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Annotation & Reporting",
        description: "Annotate variants and produce clinical-grade reports.",
        lessons: [
          { title: "VEP Annotation at Scale", type: "video", duration_seconds: 1500, description: "Reproducible VEP runs with caches and plugins.", resource_kind: "video", content_url: VIDEO("c107-l07-vep") },
          { title: "From VCF to Clinical Report", type: "video", duration_seconds: 1740, description: "Templated reports with ClinVar and ACMG criteria.", resource_kind: "video", content_url: VIDEO("c107-l08-report") },
          { title: "Quiz: End-to-End Pipeline Review", type: "quiz", duration_seconds: 1200, description: "Final integrated quiz.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 108,
    modules: [
      {
        title: "Module 1 · Lakehouse Foundations",
        description: "Adopt medallion architecture on Delta or Iceberg.",
        lessons: [
          { title: "Lakehouse vs Warehouse vs Lake", type: "video", duration_seconds: 1620, description: "Decision tree for storage architecture.", resource_kind: "video", content_url: VIDEO("c108-l01-lakehouse") },
          { title: "Delta Lake Internals: Transactions and Time Travel", type: "text", duration_seconds: 1500, description: "OPTIMIZE, VACUUM and Z-ORDER explained.", resource_kind: "pdf", content_url: READING("c108-l02-delta") },
          { title: "Quiz: Lakehouse Concepts", type: "quiz", duration_seconds: 1200, description: "Concept check.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Spark at Scale",
        description: "Tune Spark for petabyte joins and skew.",
        lessons: [
          { title: "Adaptive Query Execution Deep Dive", type: "video", duration_seconds: 1800, description: "Skew join handling and dynamic coalescing.", resource_kind: "video", content_url: VIDEO("c108-l03-aqe") },
          { title: "Shuffle Tuning and File Sizing", type: "video", duration_seconds: 1740, description: "Choosing partition sizes and shuffle configs.", resource_kind: "video", content_url: VIDEO("c108-l04-shuffle") },
          { title: "Assignment: Optimize a 4TB Join Query", type: "assignment", duration_seconds: 0, description: "Capstone Spark tuning assignment.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Kafka Streaming",
        description: "Operate exactly-once streaming pipelines with Spark + Kafka.",
        lessons: [
          { title: "Structured Streaming with Kafka Source", type: "video", duration_seconds: 1620, description: "Trigger modes and checkpoint internals.", resource_kind: "video", content_url: VIDEO("c108-l05-stream") },
          { title: "Exactly-Once Semantics in Practice", type: "text", duration_seconds: 1380, description: "Idempotent writes and transactional sinks.", resource_kind: "pdf", content_url: READING("c108-l06-eos") },
          { title: "Live Lab: Stream Replay and Backfills", type: "live", duration_seconds: 3600, description: "Live exercise rewinding consumer offsets.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Orchestration",
        description: "Run Airflow at production scale.",
        lessons: [
          { title: "Dynamic Task Mapping in Airflow 2.9", type: "video", duration_seconds: 1500, description: "Map-reduce patterns for ETL.", resource_kind: "video", content_url: VIDEO("c108-l07-airflow") },
          { title: "SLA Misses and Alerting", type: "video", duration_seconds: 1320, description: "Robust SLA tracking and escalation.", resource_kind: "video", content_url: VIDEO("c108-l08-sla") },
          { title: "Quiz: Streaming + Orchestration Final", type: "quiz", duration_seconds: 1200, description: "Course-closing assessment.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 109,
    modules: [
      {
        title: "Module 1 · Value Chain Mapping",
        description: "Identify high-leverage GenAI opportunities in your business.",
        lessons: [
          { title: "Mapping LLM-Replaceable Workflows", type: "video", duration_seconds: 1320, description: "Heuristics for high-leverage candidates.", resource_kind: "video", content_url: VIDEO("c109-l01-map") },
          { title: "Build vs Buy vs Partner", type: "text", duration_seconds: 1200, description: "Decision framework with case studies.", resource_kind: "pdf", content_url: READING("c109-l02-buy") },
          { title: "Quiz: Opportunity Sizing", type: "quiz", duration_seconds: 1200, description: "Concept check.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Business Case",
        description: "Build a defensible business case for GenAI initiatives.",
        lessons: [
          { title: "TCO and ROI Modeling for LLMs", type: "video", duration_seconds: 1500, description: "Honest cost modeling with token + infra factors.", resource_kind: "video", content_url: VIDEO("c109-l03-tco") },
          { title: "Risk Registers and Mitigations", type: "video", duration_seconds: 1380, description: "Common risk categories and mitigations.", resource_kind: "video", content_url: VIDEO("c109-l04-risk") },
          { title: "Assignment: Defend a GenAI Pilot Investment", type: "assignment", duration_seconds: 0, description: "Capstone investment defense exercise.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Governance",
        description: "Align programs with the EU AI Act and equivalent regulations.",
        lessons: [
          { title: "EU AI Act Risk Tiers", type: "video", duration_seconds: 1500, description: "Mapping use cases to risk categories.", resource_kind: "video", content_url: VIDEO("c109-l05-eu-act") },
          { title: "Data Governance Patterns", type: "text", duration_seconds: 1380, description: "PII redaction, retention, and provenance.", resource_kind: "pdf", content_url: READING("c109-l06-gov") },
          { title: "Live Lab: Governance Tabletop", type: "live", duration_seconds: 3600, description: "Group exercise approving a pilot.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Scaling",
        description: "Move from pilot to production at enterprise scale.",
        lessons: [
          { title: "Pilot-to-Production Failure Modes", type: "video", duration_seconds: 1320, description: "The seven canonical reasons pilots stall.", resource_kind: "video", content_url: VIDEO("c109-l07-pitfalls") },
          { title: "Org Design for AI Operations", type: "video", duration_seconds: 1200, description: "Center of Excellence vs federated models.", resource_kind: "video", content_url: VIDEO("c109-l08-org") },
          { title: "Quiz: Scaling Decisions", type: "quiz", duration_seconds: 1200, description: "Closing knowledge check.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 110,
    modules: [
      {
        title: "Module 1 · SLOs and Error Budgets",
        description: "Translate business expectations into measurable SLOs.",
        lessons: [
          { title: "SLI Menus for HTTP and Async Workloads", type: "video", duration_seconds: 1500, description: "Choosing SLIs that drive action.", resource_kind: "video", content_url: VIDEO("c110-l01-sli") },
          { title: "Error-Budget Policy in Practice", type: "text", duration_seconds: 1380, description: "Templates and worked policies.", resource_kind: "pdf", content_url: READING("c110-l02-budget") },
          { title: "Quiz: SLO Reasoning", type: "quiz", duration_seconds: 1200, description: "Concept check.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Autoscaling",
        description: "Right-size autoscaling to balance performance and cost.",
        lessons: [
          { title: "HPA, VPA, KEDA Compared", type: "video", duration_seconds: 1740, description: "Pick the right autoscaler per workload.", resource_kind: "video", content_url: VIDEO("c110-l03-autoscale") },
          { title: "Cluster Autoscaler and Karpenter", type: "video", duration_seconds: 1620, description: "Node-level autoscaling on AWS.", resource_kind: "video", content_url: VIDEO("c110-l04-karpenter") },
          { title: "Assignment: Autoscaling Tuning Lab", type: "assignment", duration_seconds: 0, description: "Tune HPA + VPA + Karpenter on a sample app.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Cluster Fleets",
        description: "Manage clusters declaratively at fleet scale.",
        lessons: [
          { title: "Cluster API Foundations", type: "video", duration_seconds: 1620, description: "Declarative cluster lifecycle management.", resource_kind: "video", content_url: VIDEO("c110-l05-capi") },
          { title: "Argo CD ApplicationSets", type: "text", duration_seconds: 1500, description: "Multi-cluster GitOps with ApplicationSets.", resource_kind: "pdf", content_url: READING("c110-l06-argo") },
          { title: "Live Lab: Cluster Upgrade Drill", type: "live", duration_seconds: 3600, description: "Live walkthrough of a fleet upgrade.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Incident Response",
        description: "Run postmortems that produce systemic improvements.",
        lessons: [
          { title: "Anatomy of a Production Incident", type: "video", duration_seconds: 1500, description: "Detection, mitigation, recovery, and learning.", resource_kind: "video", content_url: VIDEO("c110-l07-incident") },
          { title: "Writing Blameless Postmortems", type: "video", duration_seconds: 1320, description: "Templates and pitfalls.", resource_kind: "video", content_url: VIDEO("c110-l08-pm") },
          { title: "Quiz: Postmortem Reasoning", type: "quiz", duration_seconds: 1200, description: "Final assessment.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 111,
    modules: [
      {
        title: "Module 1 · Credit Risk",
        description: "Build PD/LGD/EAD models suitable for regulated environments.",
        lessons: [
          { title: "Scorecard Modeling with Logistic Regression", type: "video", duration_seconds: 1620, description: "WOE, IV, and binning best practices.", resource_kind: "video", content_url: VIDEO("c111-l01-score") },
          { title: "LGD and EAD Estimation", type: "text", duration_seconds: 1500, description: "Frequency-severity modeling for losses.", resource_kind: "pdf", content_url: READING("c111-l02-lgd") },
          { title: "Quiz: Credit Risk Concepts", type: "quiz", duration_seconds: 1200, description: "Concept check.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Market Risk",
        description: "Calibrate and backtest VaR and Expected Shortfall models.",
        lessons: [
          { title: "Parametric and Historical VaR", type: "video", duration_seconds: 1740, description: "Strengths and weaknesses with examples.", resource_kind: "video", content_url: VIDEO("c111-l03-var") },
          { title: "Monte Carlo VaR with Variance Reduction", type: "video", duration_seconds: 1620, description: "Antithetic variates and control variates.", resource_kind: "video", content_url: VIDEO("c111-l04-mc") },
          { title: "Assignment: Backtest a 1-Day 99% VaR", type: "assignment", duration_seconds: 0, description: "Capstone backtesting exercise.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Operational Risk",
        description: "Apply LDA to operational loss data.",
        lessons: [
          { title: "Loss Distribution Approach Fundamentals", type: "video", duration_seconds: 1500, description: "Frequency-severity and aggregation.", resource_kind: "video", content_url: VIDEO("c111-l05-lda") },
          { title: "Extreme Value Theory for Rare Losses", type: "text", duration_seconds: 1500, description: "GPD fits and threshold selection.", resource_kind: "pdf", content_url: READING("c111-l06-evt") },
          { title: "Live Lab: LDA Walkthrough", type: "live", duration_seconds: 3600, description: "Live LDA exercise on a sample dataset.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Model Risk Management",
        description: "Document and govern models per SR 11-7.",
        lessons: [
          { title: "Model Documentation Standards", type: "video", duration_seconds: 1500, description: "Practical templates aligned with SR 11-7.", resource_kind: "video", content_url: VIDEO("c111-l07-doc") },
          { title: "Independent Model Validation", type: "video", duration_seconds: 1380, description: "Effective challenge and validation workflows.", resource_kind: "video", content_url: VIDEO("c111-l08-validate") },
          { title: "Quiz: Model Risk Reasoning", type: "quiz", duration_seconds: 1200, description: "Final assessment.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
  {
    course_id: 112,
    modules: [
      {
        title: "Module 1 · Vision Transformer Foundations",
        description: "Read, modify and train Vision Transformers.",
        lessons: [
          { title: "ViT Architecture Step-by-Step", type: "video", duration_seconds: 1740, description: "Patch embeddings, class tokens and attention.", resource_kind: "video", content_url: VIDEO("c112-l01-vit") },
          { title: "Masked Autoencoders (MAE)", type: "text", duration_seconds: 1500, description: "Reading + lab on MAE pre-training.", resource_kind: "pdf", content_url: READING("c112-l02-mae") },
          { title: "Quiz: ViT Concepts", type: "quiz", duration_seconds: 1200, description: "Concept check.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 2 · Detection & Segmentation",
        description: "Train and fine-tune detection and segmentation models.",
        lessons: [
          { title: "DETR for Object Detection", type: "video", duration_seconds: 1860, description: "Bipartite matching and Hungarian loss.", resource_kind: "video", content_url: VIDEO("c112-l03-detr") },
          { title: "Mask2Former for Universal Segmentation", type: "video", duration_seconds: 1740, description: "Panoptic, semantic and instance heads.", resource_kind: "video", content_url: VIDEO("c112-l04-mask2former") },
          { title: "Assignment: Fine-Tune Mask2Former on a Custom Dataset", type: "assignment", duration_seconds: 0, description: "Hands-on fine-tuning capstone.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 3 · Serving and Deployment",
        description: "Deploy vision models reliably and cost-effectively.",
        lessons: [
          { title: "TorchServe in Production", type: "video", duration_seconds: 1620, description: "Custom handlers, batching, and autoscaling.", resource_kind: "video", content_url: VIDEO("c112-l05-torchserve") },
          { title: "Edge Deployment with ONNX Runtime", type: "text", duration_seconds: 1500, description: "Targeting mobile and embedded devices.", resource_kind: "pdf", content_url: READING("c112-l06-onnx") },
          { title: "Live Lab: Latency Profiling Workshop", type: "live", duration_seconds: 3600, description: "Live profiling exercise with attendees.", resource_kind: "other", content_url: null },
        ],
      },
      {
        title: "Module 4 · Multimodal Systems",
        description: "Combine vision and text models with diffusion priors.",
        lessons: [
          { title: "CLIP-Style Multimodal Embeddings", type: "video", duration_seconds: 1620, description: "Building joint vision-language embeddings.", resource_kind: "video", content_url: VIDEO("c112-l07-clip") },
          { title: "Diffusion Priors for Vision Tasks", type: "video", duration_seconds: 1740, description: "Using diffusion features for downstream tasks.", resource_kind: "video", content_url: VIDEO("c112-l08-diffusion") },
          { title: "Quiz: Multimodal Reasoning", type: "quiz", duration_seconds: 1200, description: "Final assessment.", resource_kind: "other", content_url: null },
        ],
      },
    ],
  },
];

const _buildModulesAndLessons = (): { modules: MockModule[]; lessons: MockLesson[] } => {
  const modules: MockModule[] = [];
  const lessons: MockLesson[] = [];
  let moduleId = 2001;
  let lessonId = 5001;
  for (const blueprint of COURSE_BLUEPRINTS) {
    blueprint.modules.forEach((mod, modIdx) => {
      modules.push({
        id: moduleId,
        course_id: blueprint.course_id,
        title: mod.title,
        description: mod.description,
        order_index: modIdx + 1,
      });
      mod.lessons.forEach((les, lesIdx) => {
        lessons.push({
          id: lessonId,
          module_id: moduleId,
          course_id: blueprint.course_id,
          title: les.title,
          lesson_type: les.type,
          order_index: lesIdx + 1,
          duration_seconds: les.duration_seconds,
          is_published: true,
          content_url: les.content_url,
          description: les.description,
          resource_kind: les.resource_kind,
        });
        lessonId += 1;
      });
      moduleId += 1;
    });
  }
  return { modules, lessons };
};

const _moduleLessonOutput = _buildModulesAndLessons();
export const MOCK_MODULES: MockModule[] = _moduleLessonOutput.modules;
export const MOCK_LESSONS: MockLesson[] = _moduleLessonOutput.lessons;

// ---------------------------------------------------------------------------
// QUIZ QUESTIONS — ≥ 20 per course (240+ total)
//
// Each course contributes a hand-curated bank that targets its quiz lessons.
// Mix: ~12 multiple-choice, ~5 short-answer, ~3 code-snippet per course.
// ---------------------------------------------------------------------------

type QuizSpec = {
  course_id: number;
  lesson_id: number;
  question: string;
  type: QuizQuestionType;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  options?: { text: string; correct: boolean }[];
  expected?: string;
  explanation: string;
};

const findLessonId = (courseId: number, predicate: (l: MockLesson) => boolean): number => {
  const lesson = MOCK_LESSONS.find((l) => l.course_id === courseId && predicate(l));
  if (!lesson) throw new Error(`No matching lesson for course ${courseId}`);
  return lesson.id;
};

const firstQuizLessonId = (courseId: number): number =>
  findLessonId(courseId, (l) => l.lesson_type === "quiz");

const QUIZ_SPECS: QuizSpec[] = [];

const pushQuiz = (specs: QuizSpec[]): void => {
  QUIZ_SPECS.push(...specs);
};

// Course 101 — Generative AI Foundations & LLM Fine-Tuning
pushQuiz([
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Which component of the Transformer enables modeling pairwise token relationships without recurrence?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Self-attention", correct: true }, { text: "LSTM gate", correct: false }, { text: "Convolution", correct: false }, { text: "Highway network", correct: false }], explanation: "Self-attention computes pairwise affinities across the sequence." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Compared to absolute sinusoidal encodings, what does Rotary Positional Embedding (RoPE) preserve at inference time?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Relative position information across attention layers", correct: true }, { text: "Absolute index of the token only", correct: false }, { text: "Layer-norm scale", correct: false }, { text: "Vocabulary size", correct: false }], explanation: "RoPE rotates query/key vectors so relative positions emerge during attention." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Which loss is most appropriate when training a reward model from preference pairs?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Bradley-Terry pairwise loss", correct: true }, { text: "MSE on predicted score", correct: false }, { text: "Cosine embedding loss", correct: false }, { text: "CTC loss", correct: false }], explanation: "Bradley-Terry models the probability that one response is preferred." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Why does LoRA freeze the base weights and inject low-rank update matrices?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "To reduce trainable parameters and memory cost", correct: true }, { text: "To increase batch size to 8192", correct: false }, { text: "To avoid attention dropout", correct: false }, { text: "To eliminate gradient clipping", correct: false }], explanation: "LoRA trains rank-r updates while keeping the dense backbone frozen." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Which evaluation harness is designed to compare LLMs across many academic benchmarks under a unified API?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "HELM", correct: true }, { text: "ImageNet", correct: false }, { text: "GLUE-only", correct: false }, { text: "COCO", correct: false }], explanation: "HELM (Holistic Evaluation of Language Models) provides a standardized harness." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "What is the main risk when fine-tuning a chat model on a narrow domain corpus without an instruction-following mixin?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Catastrophic forgetting of general instruction following", correct: true }, { text: "Embedding dimension collapse", correct: false }, { text: "Loss of tokenizer vocabulary", correct: false }, { text: "Permanent overflow of gradients", correct: false }], explanation: "Narrow corpora can erode general instruction-following abilities." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "In RAG, which retrieval scheme typically wins on recall for keyword-heavy queries?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "BM25 sparse retrieval", correct: true }, { text: "Dense bi-encoder", correct: false }, { text: "Random sampling", correct: false }, { text: "Cosine on token IDs", correct: false }], explanation: "BM25 excels for exact term matching like product codes and names." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Direct Preference Optimization (DPO) removes which component required by PPO?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Explicit reward model and rollouts", correct: true }, { text: "Tokenizer", correct: false }, { text: "Optimizer", correct: false }, { text: "Mixed-precision training", correct: false }], explanation: "DPO derives a closed-form preference loss without an explicit reward model." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Which quantization scheme does QLoRA depend on for 4-bit storage of base weights?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "NF4 (NormalFloat 4-bit)", correct: true }, { text: "INT8 only", correct: false }, { text: "Float64", correct: false }, { text: "BF32", correct: false }], explanation: "QLoRA uses the NF4 data type for storing the frozen base." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "What metric quantifies the quality of retrieved context independent of the final answer in RAG evaluation?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Context Recall", correct: true }, { text: "BLEU", correct: false }, { text: "Perplexity", correct: false }, { text: "MAE", correct: false }], explanation: "Context Recall measures how much of the ground-truth context the retriever captured." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Describe in two sentences why scaling laws motivate using larger high-quality datasets over deeper networks for a fixed compute budget.", type: "short_answer", difficulty: "hard", points: 5, expected: "Chinchilla-style scaling laws indicate compute-optimal training requires balancing parameters and tokens; for a fixed budget, increasing high-quality data often yields better generalization than disproportionately scaling depth.", explanation: "Chinchilla showed that data + parameters must scale together to be compute-optimal." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Write a one-liner short answer: what does the temperature hyperparameter at decoding control?", type: "short_answer", difficulty: "easy", points: 2, expected: "Temperature rescales logits before softmax, controlling output randomness — lower means more deterministic.", explanation: "Lower temperature sharpens the distribution; higher flattens it." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "What is a 'hallucination' in the LLM context and how is faithfulness measured in RAG?", type: "short_answer", difficulty: "medium", points: 4, expected: "A hallucination is unsupported or fabricated content; faithfulness measures whether each generated claim is entailed by retrieved evidence (e.g., RAGAS faithfulness score).", explanation: "Hallucinations are evaluated via entailment over retrieved evidence." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Briefly state one reason LoRA adapters are safer to ship than full-weight fine-tunes.", type: "short_answer", difficulty: "easy", points: 2, expected: "Adapters can be rolled back independently of the base, keep the base reusable across tenants, and are far smaller to deploy.", explanation: "Adapters are small and isolatable from the base." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Explain in one sentence why we typically freeze the base weights when applying LoRA.", type: "short_answer", difficulty: "medium", points: 3, expected: "Freezing the base keeps the original distribution intact and lets the small rank-r update adapt the model without overwriting pre-trained knowledge.", explanation: "Freezing prevents catastrophic forgetting in the base." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Write a Python snippet that loads a Hugging Face `AutoModelForCausalLM` in 4-bit using bitsandbytes.", type: "code_snippet", difficulty: "medium", points: 5, expected: "from transformers import AutoModelForCausalLM, BitsAndBytesConfig\nqcfg = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4', bnb_4bit_compute_dtype='bfloat16')\nmodel = AutoModelForCausalLM.from_pretrained('mistralai/Mistral-7B-v0.1', quantization_config=qcfg)", explanation: "BitsAndBytesConfig with NF4 + bf16 compute is the canonical QLoRA setup." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Write a PyTorch snippet that adds a LoRA adapter (rank 8) to a linear layer using `peft.LoraConfig`.", type: "code_snippet", difficulty: "hard", points: 6, expected: "from peft import LoraConfig, get_peft_model\nconfig = LoraConfig(r=8, lora_alpha=16, target_modules=['q_proj','v_proj'], lora_dropout=0.05, bias='none', task_type='CAUSAL_LM')\nmodel = get_peft_model(base_model, config)", explanation: "PEFT's `LoraConfig` targets attention projections with rank 8 by convention." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Write a chunking function `chunk(text, size, overlap)` that yields overlapping windows for RAG ingestion.", type: "code_snippet", difficulty: "medium", points: 5, expected: "def chunk(text, size=512, overlap=64):\n    step = size - overlap\n    for i in range(0, max(1, len(text) - overlap), step):\n        yield text[i:i+size]", explanation: "Stride-based chunking with overlap is standard for RAG ingestion." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "Which alignment training method directly optimizes preference probabilities without an explicit reward model?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "DPO", correct: true }, { text: "PPO", correct: false }, { text: "TRPO", correct: false }, { text: "A2C", correct: false }], explanation: "DPO eliminates the explicit reward-model rollout loop." },
  { course_id: 101, lesson_id: firstQuizLessonId(101), question: "What is the practical purpose of cross-encoder re-rankers like `bge-reranker` in a RAG pipeline?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "To rescore top-k candidates with a more accurate but slower model", correct: true }, { text: "To tokenize the input", correct: false }, { text: "To compute embeddings from scratch", correct: false }, { text: "To replace the LLM entirely", correct: false }], explanation: "Re-rankers operate on the candidate set returned by a fast retriever." },
]);

// Course 102 — Distributed Systems with Go
pushQuiz([
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Under the CAP theorem, which property does a leader-based Raft cluster typically sacrifice during a network partition?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Availability on the minority partition", correct: true }, { text: "Consistency", correct: false }, { text: "Persistence", correct: false }, { text: "Durability", correct: false }], explanation: "Raft remains consistent and partition-tolerant but loses availability on the minority side." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Which timing assumption does Raft rely on?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Partial synchrony for liveness", correct: true }, { text: "Strong synchrony for safety", correct: false }, { text: "Asynchrony for safety", correct: false }, { text: "Bounded message size only", correct: false }], explanation: "Safety holds asynchronously; liveness requires partial synchrony." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "When the Raft leader receives a write, which step must complete before it commits?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Replicate to a majority of voters", correct: true }, { text: "Replicate to all followers", correct: false }, { text: "Persist on the leader only", correct: false }, { text: "Replicate to one follower", correct: false }], explanation: "A majority of voters must persist the entry before commit." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Which guarantee does idempotency provide for retried writes?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "At-most-once effects regardless of retries", correct: true }, { text: "Faster latency", correct: false }, { text: "Stronger linearizability", correct: false }, { text: "Smaller payloads", correct: false }], explanation: "Idempotent endpoints absorb retries without duplicate side-effects." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Why is exactly-once delivery often considered a misnomer in distributed systems?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Because we can only have idempotent effects, not single-shot delivery", correct: true }, { text: "Because TCP is unreliable", correct: false }, { text: "Because clocks drift", correct: false }, { text: "Because of GC pauses", correct: false }], explanation: "Practical 'exactly-once' means at-least-once delivery + idempotent processing." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Which Go construct should you use to fan out cancellation across goroutines?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "context.Context with WithCancel", correct: true }, { text: "panic/recover", correct: false }, { text: "time.Sleep", correct: false }, { text: "sync.Once", correct: false }], explanation: "Contexts propagate cancellation and deadlines." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "What is a major risk of split-brain in a sharded KV store?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Two leaders accepting conflicting writes for the same shard", correct: true }, { text: "Higher disk usage", correct: false }, { text: "GC pauses", correct: false }, { text: "TLS handshake failure", correct: false }], explanation: "Split brain leads to divergent histories that are expensive to reconcile." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Which OpenTelemetry signal best diagnoses cross-service tail-latency regressions?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Distributed traces with span events", correct: true }, { text: "Logs only", correct: false }, { text: "Static graphs", correct: false }, { text: "Counters only", correct: false }], explanation: "Traces show per-span latency end-to-end." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "What does an error budget represent?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "The allowed unreliability before the team must slow risky changes", correct: true }, { text: "An incident-response SLA", correct: false }, { text: "A retry quota for clients", correct: false }, { text: "A logging quota", correct: false }], explanation: "Error budgets express how much unreliability the SLO permits." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "In Raft, what is the role of the term number?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "A logical clock that distinguishes leaders and stale messages", correct: true }, { text: "A physical timestamp", correct: false }, { text: "A unique log offset", correct: false }, { text: "A shard ID", correct: false }], explanation: "Terms increase monotonically each election." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "In two sentences, explain why majority quorum is required for both writes and elections in Raft.", type: "short_answer", difficulty: "hard", points: 5, expected: "Because any two majorities of voters intersect by at least one node, requiring majorities on both writes and elections guarantees that no committed entry can be lost during a leadership change.", explanation: "The quorum intersection property is what gives Raft safety." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Describe one common cause of head-of-line blocking in gRPC streams.", type: "short_answer", difficulty: "medium", points: 3, expected: "A single slow message can stall an HTTP/2 stream because deliveries on the stream remain ordered; multiplexing across streams or chunking large payloads mitigates it.", explanation: "HTTP/2 streams preserve ordering; large messages stall them." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Explain how a sharded KV store can perform a reconfiguration without losing writes.", type: "short_answer", difficulty: "hard", points: 4, expected: "Use a config service to atomically advance the configuration epoch, drain in-flight writes on the donor, ship a consistent snapshot to the recipient and only then accept writes under the new ownership.", explanation: "Atomic configuration change + snapshot handoff prevents lost writes." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Why are 99th-percentile latencies more meaningful than averages for user-facing services?", type: "short_answer", difficulty: "easy", points: 2, expected: "Averages mask the long tail of slow requests that users actually experience; p99 surfaces user-visible degradations.", explanation: "Tail latencies dominate user perception." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Briefly state why structured logging is preferable to free-text logs.", type: "short_answer", difficulty: "easy", points: 2, expected: "Structured logs (e.g., JSON) are reliably parsable by downstream systems, enable schema-driven queries, and survive log-rotation tools without ad-hoc regex.", explanation: "Schema enables querying at scale." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Write a Go snippet declaring a buffered channel of 8 strings and ranging over it from another goroutine until close.", type: "code_snippet", difficulty: "medium", points: 5, expected: "ch := make(chan string, 8)\ngo func() {\n    for v := range ch {\n        fmt.Println(v)\n    }\n}()", explanation: "Range stops when the channel is closed." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Write a Go snippet using `context.WithTimeout` to bound a gRPC unary call to 250 ms.", type: "code_snippet", difficulty: "medium", points: 5, expected: "ctx, cancel := context.WithTimeout(parent, 250*time.Millisecond)\ndefer cancel()\nresp, err := client.GetUser(ctx, &pb.GetUserRequest{Id: id})", explanation: "WithTimeout + defer cancel is the idiomatic bounded call." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Write a Go test snippet that uses `t.Cleanup` to remove a temporary directory created in setup.", type: "code_snippet", difficulty: "easy", points: 3, expected: "dir, err := os.MkdirTemp(\"\", \"raft-test\")\nif err != nil { t.Fatal(err) }\nt.Cleanup(func() { _ = os.RemoveAll(dir) })", explanation: "t.Cleanup keeps setup/teardown colocated." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Which property distinguishes linearizability from sequential consistency?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Linearizability requires real-time order across clients", correct: true }, { text: "Sequential consistency requires real-time order", correct: false }, { text: "They are equivalent", correct: false }, { text: "Neither preserves single-client order", correct: false }], explanation: "Linearizability respects the real-time happens-before ordering." },
  { course_id: 102, lesson_id: firstQuizLessonId(102), question: "Which strategy reduces shuffle-induced GC pressure in long-running Go services?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Pre-allocating reusable buffers via sync.Pool", correct: true }, { text: "Disabling the garbage collector", correct: false }, { text: "Using cgo for everything", correct: false }, { text: "Forcing GOMAXPROCS to 1", correct: false }], explanation: "sync.Pool reduces allocation churn." },
]);

// Helper to build a 20-question bank from a compact spec list.
type CompactBank = Array<Omit<QuizSpec, "course_id" | "lesson_id">>;

const expandBank = (courseId: number, bank: CompactBank): void => {
  const lessonId = firstQuizLessonId(courseId);
  for (const item of bank) {
    QUIZ_SPECS.push({ ...item, course_id: courseId, lesson_id: lessonId });
  }
};

// Course 103 — Financial Analytics with Python & Pandas
expandBank(103, [
  { question: "Survivorship bias most often causes backtest results to:", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Look better than reality", correct: true }, { text: "Look worse than reality", correct: false }, { text: "Stay unbiased", correct: false }, { text: "Reduce variance", correct: false }], explanation: "Failed firms drop out of the dataset and overstate returns." },
  { question: "What is point-in-time data?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Data as it appeared at the moment a decision would have been made", correct: true }, { text: "Latest revised data only", correct: false }, { text: "Year-end snapshots only", correct: false }, { text: "Realtime intraday quotes", correct: false }], explanation: "PIT data prevents look-ahead bias." },
  { question: "Which Pandas function realigns asof-merge with a tolerance window?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "pd.merge_asof", correct: true }, { text: "pd.concat", correct: false }, { text: "pd.cut", correct: false }, { text: "pd.qcut", correct: false }], explanation: "merge_asof joins time-series with a tolerance window." },
  { question: "An IC of 0.04 with t-stat 5 over 252 days is best described as:", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Statistically strong, economically modest", correct: true }, { text: "Statistically weak", correct: false }, { text: "Economically large", correct: false }, { text: "Random noise", correct: false }], explanation: "Small ICs can be highly significant with enough sample." },
  { question: "Which Sharpe ratio benchmark is widely considered 'investment-grade'?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Above 1.0", correct: true }, { text: "Above 0.2", correct: false }, { text: "Above 3.0 always", correct: false }, { text: "Negative", correct: false }], explanation: ">1.0 net-of-cost is generally the bar for paper strategies." },
  { question: "Which library is canonical for vectorized backtesting in Python?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "vectorbt", correct: true }, { text: "scikit-image", correct: false }, { text: "fastai", correct: false }, { text: "PyTorch", correct: false }], explanation: "vectorbt is built around vectorized portfolio simulation." },
  { question: "Realistic transaction cost modeling typically includes:", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Commission + slippage + market impact", correct: true }, { text: "Commission only", correct: false }, { text: "Spread only", correct: false }, { text: "None", correct: false }], explanation: "Honest backtests embed all three components." },
  { question: "Which VaR method assumes a multivariate normal P&L distribution?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Parametric (variance-covariance) VaR", correct: true }, { text: "Historical VaR", correct: false }, { text: "Monte Carlo with bootstrapped residuals", correct: false }, { text: "Expected Shortfall", correct: false }], explanation: "Parametric VaR assumes joint normality." },
  { question: "Why does Expected Shortfall (ES) often replace VaR for risk reporting?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "ES is coherent (subadditive), VaR is not", correct: true }, { text: "ES is easier to compute", correct: false }, { text: "ES requires fewer data points", correct: false }, { text: "ES ignores tails", correct: false }], explanation: "ES (CVaR) is a coherent risk measure." },
  { question: "Which adjustment is needed when a stock splits 4-for-1?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Multiply historical prices by 1/4 and shares by 4", correct: true }, { text: "No adjustment", correct: false }, { text: "Multiply prices by 4", correct: false }, { text: "Multiply shares by 1/4", correct: false }], explanation: "Split adjustment preserves total return continuity." },
  { question: "Define information coefficient (IC) in one sentence.", type: "short_answer", difficulty: "easy", points: 2, expected: "The IC is the cross-sectional Spearman or Pearson correlation between a factor's predicted ranking and subsequent realized returns.", explanation: "IC is the standard predictive power metric for factors." },
  { question: "Explain in two sentences the difference between in-sample and out-of-sample IC decay.", type: "short_answer", difficulty: "medium", points: 4, expected: "In-sample IC measures fit on the design period and can be inflated by overfit; out-of-sample IC measures predictive power on unseen data and typically decays sharply if the signal does not generalize.", explanation: "OOS decay is the practical reality of factor research." },
  { question: "What is the role of a custodian benchmark in attribution?", type: "short_answer", difficulty: "medium", points: 3, expected: "It is the agreed-upon passive comparator used to decompose returns into selection and allocation contributions.", explanation: "Benchmarks define the attribution baseline." },
  { question: "Briefly state why Sharpe ratios are not directly comparable across different return frequencies.", type: "short_answer", difficulty: "medium", points: 3, expected: "Sharpe scales with the square root of time; comparisons require annualization with the same scaling assumption.", explanation: "Sharpe is frequency-dependent." },
  { question: "Define stress testing in two sentences.", type: "short_answer", difficulty: "easy", points: 2, expected: "Stress testing evaluates portfolio behavior under prescribed extreme but plausible scenarios. The scenarios should be internally consistent across factor moves.", explanation: "Stress tests complement statistical risk measures." },
  { question: "Write a Pandas snippet that computes monthly returns from a daily price Series `px`.", type: "code_snippet", difficulty: "easy", points: 3, expected: "monthly = px.resample('M').last().pct_change().dropna()", explanation: "Resample then pct_change is the canonical pattern." },
  { question: "Write a NumPy snippet computing 1-day 99% historical VaR from a return array `r`.", type: "code_snippet", difficulty: "medium", points: 4, expected: "import numpy as np\nvar99 = -np.quantile(r, 0.01)", explanation: "VaR is the negative of the 1% quantile." },
  { question: "Write a Pandas snippet to z-score each row across columns of a factor DataFrame `df`.", type: "code_snippet", difficulty: "medium", points: 4, expected: "z = df.sub(df.mean(axis=1), axis=0).div(df.std(axis=1), axis=0)", explanation: "Row-wise z-scoring is the standard factor normalization step." },
  { question: "Which Python library implements vectorized indicator computation with optimized C kernels?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "TA-Lib", correct: true }, { text: "Matplotlib", correct: false }, { text: "Seaborn", correct: false }, { text: "Pillow", correct: false }], explanation: "TA-Lib is the de facto technical indicator library." },
  { question: "Which clustering technique helps de-correlate factors before regression?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Hierarchical risk parity", correct: true }, { text: "K-means on returns", correct: false }, { text: "PCA on prices", correct: false }, { text: "Random projection", correct: false }], explanation: "HRP partitions correlation hierarchies before allocation." },
]);

// Course 104 — Cloud-Native Microservices on AWS
expandBank(104, [
  { question: "Which AWS service runs containers without managing the underlying EC2 hosts?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Fargate", correct: true }, { text: "EC2 Auto Scaling", correct: false }, { text: "RDS", correct: false }, { text: "S3", correct: false }], explanation: "Fargate is AWS's serverless container compute." },
  { question: "Which deployment strategy gradually shifts traffic between two task sets?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Blue/green with weighted shifting", correct: true }, { text: "Recreate", correct: false }, { text: "In-place rolling", correct: false }, { text: "Big-bang deploy", correct: false }], explanation: "Blue/green allows controlled progressive cutover." },
  { question: "Terraform Cloud workspaces primarily isolate:", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "State, variables, and execution per environment", correct: true }, { text: "VPC CIDRs", correct: false }, { text: "Container images", correct: false }, { text: "EBS volumes", correct: false }], explanation: "Workspaces enable per-env isolation." },
  { question: "Which IAM concept enforces least-privilege at the service level?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Task roles attached to each service", correct: true }, { text: "A single root key", correct: false }, { text: "Public buckets", correct: false }, { text: "Static credentials in env vars", correct: false }], explanation: "Per-task roles scope IAM permissions precisely." },
  { question: "Which AWS pattern avoids cross-account hard-coded secrets?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "IAM Roles for cross-account assume-role", correct: true }, { text: "Embedding secrets in AMIs", correct: false }, { text: "Storing keys in S3 unencrypted", correct: false }, { text: "Sharing root credentials", correct: false }], explanation: "Assume-role is the canonical cross-account pattern." },
  { question: "Which service mesh feature enables per-service mTLS and retries on AWS?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "App Mesh virtual nodes with TLS validation", correct: true }, { text: "S3 Object Lock", correct: false }, { text: "CloudFront signed cookies", correct: false }, { text: "DynamoDB streams", correct: false }], explanation: "App Mesh handles mTLS + retries declaratively." },
  { question: "Which AWS pattern reduces cold-start latency for irregular Fargate workloads?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Pre-warming minimum task count with Application Auto Scaling", correct: true }, { text: "Removing the task definition", correct: false }, { text: "Disabling Auto Scaling", correct: false }, { text: "Setting CPU to 0", correct: false }], explanation: "Minimum capacity prevents scale-to-zero cold starts." },
  { question: "Which AWS service emits the FinOps-relevant 'cost and usage report' (CUR)?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "AWS Cost & Usage Report (CUR)", correct: true }, { text: "AWS Trusted Advisor", correct: false }, { text: "CloudFront", correct: false }, { text: "CodeBuild", correct: false }], explanation: "CUR is the canonical FinOps source." },
  { question: "Which Terraform construct prevents accidentally destroying a critical resource?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "lifecycle { prevent_destroy = true }", correct: true }, { text: "depends_on", correct: false }, { text: "count = 0", correct: false }, { text: "for_each", correct: false }], explanation: "prevent_destroy guards critical infrastructure." },
  { question: "Which AWS construct provides regional active-active failover for an HTTP API?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Route 53 latency-based + health-checked records", correct: true }, { text: "RDS Multi-AZ alone", correct: false }, { text: "EBS snapshots", correct: false }, { text: "S3 versioning", correct: false }], explanation: "DNS-level routing with health checks enables active-active." },
  { question: "Define the strangler-fig migration pattern in two sentences.", type: "short_answer", difficulty: "medium", points: 3, expected: "It is an incremental migration where new functionality is built around a legacy system; traffic is gradually rerouted until the legacy can be retired.", explanation: "Strangler-fig avoids big-bang rewrites." },
  { question: "Why is structured logging important for microservices?", type: "short_answer", difficulty: "easy", points: 2, expected: "Structured logs allow downstream systems to filter and aggregate by fields like service, trace_id, and severity instead of brittle regex parsing.", explanation: "Schema-driven logs scale." },
  { question: "Explain why VPC Endpoints reduce both latency and cost.", type: "short_answer", difficulty: "medium", points: 3, expected: "They route traffic to AWS services privately without traversing the internet or NAT Gateway, eliminating NAT data charges and reducing latency.", explanation: "Endpoints are a FinOps lever and a latency improvement." },
  { question: "Briefly state the difference between IAM users and IAM roles.", type: "short_answer", difficulty: "easy", points: 2, expected: "Users are long-lived identities with static credentials, roles are temporary identities assumed by trusted entities with short-lived credentials.", explanation: "Prefer roles for any non-human or cross-account access." },
  { question: "Explain in two sentences when to choose ECS Fargate over EKS.", type: "short_answer", difficulty: "medium", points: 4, expected: "Fargate suits teams that prefer minimal infra ops and AWS-native abstractions; EKS suits teams already invested in the Kubernetes ecosystem or needing portability.", explanation: "Pick by operational style and ecosystem fit." },
  { question: "Write a Terraform snippet creating an S3 bucket with versioning enabled and server-side encryption.", type: "code_snippet", difficulty: "medium", points: 4, expected: "resource \"aws_s3_bucket\" \"vault\" { bucket = \"mindbridge-vault\" }\nresource \"aws_s3_bucket_versioning\" \"v\" { bucket = aws_s3_bucket.vault.id versioning_configuration { status = \"Enabled\" } }\nresource \"aws_s3_bucket_server_side_encryption_configuration\" \"e\" { bucket = aws_s3_bucket.vault.id rule { apply_server_side_encryption_by_default { sse_algorithm = \"AES256\" } } }", explanation: "Separate resources for bucket, versioning and SSE align with provider 5.x." },
  { question: "Write a Dockerfile snippet for a minimal Node.js 20 production image using a slim base.", type: "code_snippet", difficulty: "easy", points: 3, expected: "FROM node:20-slim\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nUSER node\nCMD [\"node\", \"server.js\"]", explanation: "Use slim base, install prod deps, drop privileges." },
  { question: "Write a Terraform snippet referencing a remote module from the registry.", type: "code_snippet", difficulty: "easy", points: 3, expected: "module \"vpc\" {\n  source  = \"terraform-aws-modules/vpc/aws\"\n  version = \"~> 5.0\"\n  name    = \"mindbridge-prod\"\n  cidr    = \"10.42.0.0/16\"\n}", explanation: "Registry modules with pinned versions are the recommended pattern." },
  { question: "Which service tracks AWS API calls for audit?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "CloudTrail", correct: true }, { text: "CloudFront", correct: false }, { text: "X-Ray", correct: false }, { text: "Inspector", correct: false }], explanation: "CloudTrail logs API activity." },
  { question: "Which deployment approach minimizes blast radius for risky changes?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Canary releases with automatic rollback", correct: true }, { text: "Big-bang deploy", correct: false }, { text: "Disabling alarms", correct: false }, { text: "Single-AZ deploys", correct: false }], explanation: "Canary releases catch regressions early." },
]);

// Course 105 — Cybersecurity
expandBank(105, [
  { question: "Which principle is the foundation of Zero-Trust architecture?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Never trust, always verify", correct: true }, { text: "Allow LAN by default", correct: false }, { text: "VPN is enough", correct: false }, { text: "Single perimeter defense", correct: false }], explanation: "Zero-Trust assumes breach and verifies every request." },
  { question: "Which control most directly enables identity-based access for engineers?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Identity-Aware Proxy with policy engine", correct: true }, { text: "Open SSH on the public internet", correct: false }, { text: "Static IP allowlist", correct: false }, { text: "VPN concentrator only", correct: false }], explanation: "IAP-style proxies enforce identity-based access." },
  { question: "Which framework provides a taxonomy for adversary techniques?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "MITRE ATT&CK", correct: true }, { text: "ISO 9001", correct: false }, { text: "ITIL", correct: false }, { text: "COBIT", correct: false }], explanation: "ATT&CK enumerates tactics and techniques." },
  { question: "A hunt hypothesis should be:", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Specific, testable against telemetry, and tied to ATT&CK", correct: true }, { text: "Vague and aspirational", correct: false }, { text: "Anchored to vendor marketing", correct: false }, { text: "Random sampling of logs", correct: false }], explanation: "Hunt hypotheses must be falsifiable." },
  { question: "Which telemetry source captures process execution metadata on Windows?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Sysmon Event ID 1", correct: true }, { text: "DHCP logs", correct: false }, { text: "SMB shares", correct: false }, { text: "DNS zone transfers", correct: false }], explanation: "Sysmon EID 1 logs process creation." },
  { question: "Which detection most reliably catches command-and-scripting-interpreter abuse?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "PowerShell ScriptBlock logging with high-entropy heuristics", correct: true }, { text: "Antivirus alone", correct: false }, { text: "Static MAC allowlist", correct: false }, { text: "Network NAT logs", correct: false }], explanation: "ScriptBlock logging gives high-fidelity coverage." },
  { question: "Which document captures the scope and constraints of an incident response exercise?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "IR Plan + Runbook", correct: true }, { text: "Marketing brief", correct: false }, { text: "Open-source license", correct: false }, { text: "Pipeline diagram", correct: false }], explanation: "Runbooks codify procedural response." },
  { question: "Which SIEM tactic reduces false positives at scale?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Tuning detections to environment baselines", correct: true }, { text: "Disabling logging", correct: false }, { text: "Forwarding everything to email", correct: false }, { text: "Ignoring critical alerts", correct: false }], explanation: "Baselining cuts noise." },
  { question: "Which post-exploitation behavior is best detected with Zeek?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Suspicious TLS JA3 fingerprints", correct: true }, { text: "OS install logs", correct: false }, { text: "Browser history", correct: false }, { text: "Backup retention policies", correct: false }], explanation: "Zeek's TLS module + JA3 surfaces anomalous clients." },
  { question: "Which class of attack does PKI-based mTLS most directly mitigate?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Service-to-service impersonation", correct: true }, { text: "Disk wiping", correct: false }, { text: "Kernel panic", correct: false }, { text: "Power outage", correct: false }], explanation: "mTLS authenticates both sides." },
  { question: "In two sentences, explain why detection engineering should be version-controlled.", type: "short_answer", difficulty: "medium", points: 3, expected: "Versioning enables reproducible rollouts, audit trails, and safe rollback. It also lets detection engineers code-review changes before deploying them to production SIEMs.", explanation: "Detection-as-code is the modern norm." },
  { question: "Define 'least privilege' in one sentence.", type: "short_answer", difficulty: "easy", points: 2, expected: "Granting an identity only the permissions required to perform its current task and no more.", explanation: "Least privilege is a Zero-Trust prerequisite." },
  { question: "Briefly explain the practical purpose of MITRE D3FEND.", type: "short_answer", difficulty: "medium", points: 3, expected: "D3FEND is a knowledge graph of defensive countermeasures that maps to ATT&CK techniques, helping defenders pick controls that meaningfully reduce risk.", explanation: "D3FEND is the defensive counterpart to ATT&CK." },
  { question: "Explain why immutable infrastructure simplifies incident response.", type: "short_answer", difficulty: "medium", points: 3, expected: "Compromised hosts can be discarded and replaced rather than reimaged in place, removing residual persistence and accelerating containment.", explanation: "Immutable infra makes containment fast." },
  { question: "Why are tabletop exercises valuable even before a real incident?", type: "short_answer", difficulty: "easy", points: 2, expected: "They surface decision-making gaps, missing playbooks and escalation ambiguities while stakes are low.", explanation: "Tabletops calibrate readiness." },
  { question: "Write a sample Sigma rule snippet detecting suspicious PowerShell base64 commands.", type: "code_snippet", difficulty: "medium", points: 5, expected: "title: Suspicious PowerShell Base64\nlogsource:\n  product: windows\n  service: powershell\ndetection:\n  selection:\n    CommandLine|contains:\n      - 'FromBase64String'\n  condition: selection", explanation: "Sigma rules describe detections in a portable format." },
  { question: "Write a regex snippet matching IPv4 addresses in suspicious log fields.", type: "code_snippet", difficulty: "easy", points: 3, expected: "(?:[0-9]{1,3}\\.){3}[0-9]{1,3}", explanation: "A lenient IPv4 regex is enough for triage." },
  { question: "Write a KQL snippet listing failed sign-ins from a single IP in the last hour.", type: "code_snippet", difficulty: "medium", points: 4, expected: "SigninLogs\n| where TimeGenerated > ago(1h) and ResultType != 0\n| summarize fails = count() by IPAddress, UserPrincipalName\n| where fails > 5", explanation: "KQL is the canonical query language for Sentinel/Defender." },
  { question: "Which CVSS metric reflects whether an attacker needs local access?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Attack Vector", correct: true }, { text: "Confidentiality Impact", correct: false }, { text: "Scope", correct: false }, { text: "Privileges Required", correct: false }], explanation: "Attack Vector enumerates network, adjacent, local, physical." },
  { question: "Which technique helps reduce the blast radius of a privileged account?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Just-in-time access elevation", correct: true }, { text: "Sharing a single admin password", correct: false }, { text: "Disabling MFA", correct: false }, { text: "Setting key expiration to 10 years", correct: false }], explanation: "JIT removes standing privilege." },
]);

// Course 106 — Product-Led UX: Design Systems
expandBank(106, [
  { question: "Primitive tokens are best described as:", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Raw values like specific colors or pixel sizes", correct: true }, { text: "Themed semantic aliases", correct: false }, { text: "Component states", correct: false }, { text: "User intents", correct: false }], explanation: "Primitives store raw atoms before semantic mapping." },
  { question: "Semantic tokens improve maintainability by:", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Decoupling intent from concrete values", correct: true }, { text: "Removing tokens entirely", correct: false }, { text: "Inlining hex codes", correct: false }, { text: "Disallowing dark mode", correct: false }], explanation: "Semantic layers absorb rebrands without component changes." },
  { question: "Which Figma feature lets a single component swap themes via boolean / enum modes?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Variables with multiple modes", correct: true }, { text: "Stickers", correct: false }, { text: "Plug-in marketplace", correct: false }, { text: "Frame masks", correct: false }], explanation: "Multi-mode variables drive theming." },
  { question: "When governing a design system, which metric best tracks adoption?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Percent of product surfaces using library components", correct: true }, { text: "Number of design files", correct: false }, { text: "Component count", correct: false }, { text: "Plugin downloads", correct: false }], explanation: "Coverage of product surfaces is the real adoption signal." },
  { question: "Which tool transforms design tokens into platform-specific outputs?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Style Dictionary", correct: true }, { text: "Premiere Pro", correct: false }, { text: "Audacity", correct: false }, { text: "ImageOptim", correct: false }], explanation: "Style Dictionary produces CSS, Swift, Android tokens." },
  { question: "Which WCAG contrast ratio is required for normal-size body text at AA?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "4.5:1", correct: true }, { text: "1.5:1", correct: false }, { text: "2.0:1", correct: false }, { text: "3.0:1", correct: false }], explanation: "WCAG AA requires 4.5:1 for body text." },
  { question: "Which governance model scales contribution across multiple product teams?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Federated with core-team stewardship", correct: true }, { text: "Single owner, no contributions allowed", correct: false }, { text: "Open free-for-all", correct: false }, { text: "Marketing-led only", correct: false }], explanation: "Federated models balance autonomy and consistency." },
  { question: "Which artifact is critical when versioning a Figma library?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Migration notes paired with semver-style release notes", correct: true }, { text: "Memes", correct: false }, { text: "Empty changelog", correct: false }, { text: "Brand video", correct: false }], explanation: "Library consumers need explicit migration guidance." },
  { question: "Which token category typically owns motion semantics?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Duration + easing tokens with semantic intents", correct: true }, { text: "Pixel grid spacing", correct: false }, { text: "Typography scale", correct: false }, { text: "Color palette", correct: false }], explanation: "Motion tokens encode durations and easings semantically." },
  { question: "What is the canonical reason to publish breaking changes as a major library version?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "To signal that consumers must take action to upgrade", correct: true }, { text: "To make the team feel important", correct: false }, { text: "To raise pricing", correct: false }, { text: "To delete deprecated tokens silently", correct: false }], explanation: "Semantic versioning sets clear upgrade expectations." },
  { question: "Explain in two sentences why semantic tokens reduce rebrand cost.", type: "short_answer", difficulty: "medium", points: 3, expected: "A rebrand only requires updating the primitive values that semantic tokens point to. Components consume semantic aliases, so no component-level edits are required.", explanation: "Semantic indirection localizes change." },
  { question: "Briefly define a 'token alias'.", type: "short_answer", difficulty: "easy", points: 2, expected: "A token whose value is another token, enabling indirection across primitive, semantic and component layers.", explanation: "Aliases create the token graph." },
  { question: "Explain why design system 'office hours' improve contribution quality.", type: "short_answer", difficulty: "medium", points: 3, expected: "They give contributors a low-friction venue to align on intent before opening pull requests, reducing rework and surfacing collisions earlier.", explanation: "Office hours shorten the feedback loop." },
  { question: "Describe two trade-offs of supporting both Figma variables and code tokens in parallel.", type: "short_answer", difficulty: "hard", points: 4, expected: "Parallel sources require strict sync tooling to avoid drift; the benefit is that designers can model behaviors before engineers implement them, accelerating exploration.", explanation: "Sync vs. exploration is the core trade-off." },
  { question: "Why is co-authoring component APIs with engineering important?", type: "short_answer", difficulty: "easy", points: 2, expected: "Shared APIs reduce friction between design intent and component implementation and yield more predictable, reusable building blocks.", explanation: "Co-authoring closes the design-engineering gap." },
  { question: "Write a Style Dictionary token snippet for a primary color with light and dark modes.", type: "code_snippet", difficulty: "medium", points: 4, expected: "{\n  \"color\": {\n    \"primary\": {\n      \"light\": { \"value\": \"#3D5AFE\" },\n      \"dark\":  { \"value\": \"#82B1FF\" }\n    }\n  }\n}", explanation: "Style Dictionary supports nested mode-aware tokens." },
  { question: "Write a CSS snippet defining custom properties for spacing scale tokens.", type: "code_snippet", difficulty: "easy", points: 3, expected: ":root {\n  --space-1: 4px;\n  --space-2: 8px;\n  --space-3: 12px;\n  --space-4: 16px;\n  --space-5: 24px;\n  --space-6: 32px;\n}", explanation: "Custom properties are the standard runtime token vehicle." },
  { question: "Write a React snippet of a `Button` that consumes a `variant` prop mapped to design tokens.", type: "code_snippet", difficulty: "medium", points: 4, expected: "const Button = ({ variant = 'primary', children }) => (\n  <button className={`btn btn--${variant}`}>{children}</button>\n);", explanation: "Variant maps to a token-driven CSS class." },
  { question: "Which artifact pairs best with an experiment that retires a deprecated component?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Migration codemod + telemetry on remaining usages", correct: true }, { text: "Internal podcast only", correct: false }, { text: "Closed-door memo", correct: false }, { text: "Shared spreadsheet without owners", correct: false }], explanation: "Codemods + telemetry drive retirements." },
  { question: "Which design-system risk does an unmaintained icon set most directly create?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Brand inconsistency across surfaces", correct: true }, { text: "Database deadlock", correct: false }, { text: "Cookie consent failure", correct: false }, { text: "Memory leak", correct: false }], explanation: "Stale icon libraries fragment brand expression." },
]);

// Course 107 — Applied Bioinformatics
expandBank(107, [
  { question: "Which FASTQ quality encoding is standard for modern Illumina data?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Phred+33", correct: true }, { text: "Phred+64", correct: false }, { text: "Solexa-32", correct: false }, { text: "ASCII+0", correct: false }], explanation: "Phred+33 is the de facto encoding." },
  { question: "Which tool produces interactive QC reports of FASTQ files?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "FastQC", correct: true }, { text: "BWA-MEM2", correct: false }, { text: "Samtools", correct: false }, { text: "GATK", correct: false }], explanation: "FastQC is the canonical raw-read QC tool." },
  { question: "Which aligner is most commonly used for short-read DNA-seq?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "BWA-MEM2", correct: true }, { text: "DIAMOND", correct: false }, { text: "STAR", correct: false }, { text: "BLAST", correct: false }], explanation: "BWA-MEM2 is the modern default for short-read DNA." },
  { question: "Which file format stores aligned reads with index support?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "BAM with .bai index", correct: true }, { text: "VCF", correct: false }, { text: "FASTQ", correct: false }, { text: "BED", correct: false }], explanation: "BAM + .bai supports random access." },
  { question: "Which variant caller is part of GATK Best Practices for germline?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "HaplotypeCaller in GVCF mode", correct: true }, { text: "Strelka2 somatic-only", correct: false }, { text: "Manta SV only", correct: false }, { text: "Picard CollectWgsMetrics", correct: false }], explanation: "HaplotypeCaller is GATK's germline workhorse." },
  { question: "Which filter set is preferred for high-quality germline cohort calls?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Variant Quality Score Recalibration (VQSR)", correct: true }, { text: "Manual cutoffs without truth sets", correct: false }, { text: "Random sampling", correct: false }, { text: "Median filter", correct: false }], explanation: "VQSR leverages known truth sets to model quality." },
  { question: "Which Nextflow language version supports DSL2 modular workflows?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "DSL2", correct: true }, { text: "DSL1 only", correct: false }, { text: "Pipe-script v0.9", correct: false }, { text: "BashFlow", correct: false }], explanation: "DSL2 is the modular Nextflow syntax." },
  { question: "Which annotation tool is canonical for variant consequence prediction?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Ensembl VEP", correct: true }, { text: "FreeBayes", correct: false }, { text: "Picard MarkDuplicates", correct: false }, { text: "BCFtools call", correct: false }], explanation: "VEP annotates consequence and clinical relevance." },
  { question: "Which database aggregates population allele frequencies for clinical variant interpretation?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "gnomAD", correct: true }, { text: "ENA", correct: false }, { text: "GitHub", correct: false }, { text: "Wikipedia", correct: false }], explanation: "gnomAD aggregates large-cohort frequencies." },
  { question: "Which container approach maximizes reproducibility for genomic pipelines?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Versioned Singularity / Docker images per tool", correct: true }, { text: "System-installed tools", correct: false }, { text: "Conda only, no version pins", correct: false }, { text: "Source compilation per run", correct: false }], explanation: "Pinned containers prevent dependency drift." },
  { question: "Define joint genotyping in two sentences.", type: "short_answer", difficulty: "medium", points: 3, expected: "It is the process of combining per-sample GVCFs into a cohort-level VCF where genotypes are re-called using cross-sample evidence. This improves recall at low-coverage sites.", explanation: "Joint genotyping leverages cohort priors." },
  { question: "Briefly state why duplicate marking is mandatory before variant calling.", type: "short_answer", difficulty: "easy", points: 2, expected: "PCR or optical duplicates can bias allele counts; marking them ensures variant callers do not over-weight technical artifacts.", explanation: "Picard MarkDuplicates is the canonical step." },
  { question: "Explain in one sentence what a structural variant is.", type: "short_answer", difficulty: "easy", points: 2, expected: "A genomic alteration involving large regions (typically >50 bp), such as deletions, duplications, inversions and translocations.", explanation: "SVs are larger than typical SNVs and indels." },
  { question: "Why is reproducibility especially important in clinical bioinformatics?", type: "short_answer", difficulty: "medium", points: 3, expected: "Clinical reporting requires that results can be regenerated bit-exactly to support audits, retrospective re-analysis and patient-safety reviews.", explanation: "Reproducibility underpins clinical validity." },
  { question: "Describe one trade-off of running pipelines on AWS Batch vs. local HPC.", type: "short_answer", difficulty: "medium", points: 3, expected: "AWS Batch offers elastic scale and minimal infra ops but adds egress and storage cost; local HPC offers data locality and predictable cost but constrained capacity.", explanation: "Cloud vs. HPC trade locality for elasticity." },
  { question: "Write a Nextflow DSL2 snippet of a `FASTQC` process with `cpus 2` and a fixed container.", type: "code_snippet", difficulty: "medium", points: 4, expected: "process FASTQC {\n  cpus 2\n  container 'biocontainers/fastqc:v0.12.1'\n  input:\n    tuple val(sample), path(reads)\n  output:\n    path('*_fastqc.zip')\n  script:\n    \"\"\"\n    fastqc ${reads} -t ${task.cpus}\n    \"\"\"\n}", explanation: "Standard DSL2 process declaration." },
  { question: "Write a Bash snippet that converts a SAM file to sorted BAM with samtools.", type: "code_snippet", difficulty: "easy", points: 3, expected: "samtools sort -@ 4 -o sample.sorted.bam sample.sam\nsamtools index sample.sorted.bam", explanation: "Sort + index is the canonical pair." },
  { question: "Write a snippet of a VEP CLI invocation annotating a VCF with the offline cache.", type: "code_snippet", difficulty: "medium", points: 4, expected: "vep -i input.vcf.gz \\\n  --cache --offline --assembly GRCh38 \\\n  --vcf -o annotated.vcf.gz --compress_output bgzip --fork 4", explanation: "Offline cache + bgzip compression is the production pattern." },
  { question: "Which assembly is currently the standard human reference?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "GRCh38 / T2T variants", correct: true }, { text: "hg18", correct: false }, { text: "GRCh37 only", correct: false }, { text: "panTro5", correct: false }], explanation: "GRCh38 (and increasingly T2T) is the modern reference." },
  { question: "Which metric describes the fraction of duplicate reads in a library?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "PERCENT_DUPLICATION (Picard)", correct: true }, { text: "Phred score", correct: false }, { text: "INSERT_SIZE", correct: false }, { text: "MAPQ", correct: false }], explanation: "Picard's PERCENT_DUPLICATION quantifies library complexity." },
]);

// Course 108 — Data Engineering with Spark & Kafka
expandBank(108, [
  { question: "Which storage layer adds ACID transactions over Parquet for the lakehouse pattern?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Delta Lake", correct: true }, { text: "Raw S3 only", correct: false }, { text: "HDFS without metadata", correct: false }, { text: "Plain CSV", correct: false }], explanation: "Delta Lake adds ACID + time travel over Parquet." },
  { question: "Which Spark feature dynamically coalesces shuffle partitions?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Adaptive Query Execution (AQE)", correct: true }, { text: "Catalyst caching", correct: false }, { text: "Whole-stage codegen", correct: false }, { text: "DataFrame.cache", correct: false }], explanation: "AQE adjusts plans at runtime." },
  { question: "Which join strategy is best for a small dimension table broadcasted into a fact join?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Broadcast hash join", correct: true }, { text: "Cartesian product", correct: false }, { text: "Cross join", correct: false }, { text: "Sort-merge join always", correct: false }], explanation: "Broadcasting the small side eliminates the shuffle." },
  { question: "Which file size range is typically considered optimal for Parquet/Delta partitions on S3?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "128 MB – 1 GB", correct: true }, { text: "10 KB – 100 KB", correct: false }, { text: "8 KB – 32 KB", correct: false }, { text: ">100 GB always", correct: false }], explanation: "Mid-size files balance task time and metadata overhead." },
  { question: "Which Kafka guarantee requires both producer idempotence and transactional commits?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Exactly-once semantics", correct: true }, { text: "At-most-once", correct: false }, { text: "Best effort", correct: false }, { text: "Fire-and-forget", correct: false }], explanation: "EOS needs transactional producers + idempotence." },
  { question: "Which Spark abstraction is preferred for stream processing in v3+?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Structured Streaming", correct: true }, { text: "DStream", correct: false }, { text: "RDD only", correct: false }, { text: "MLlib", correct: false }], explanation: "Structured Streaming is the modern API." },
  { question: "Which feature isolates rolling deployments of streaming jobs while preserving offsets?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Stable checkpoint locations with versioned application IDs", correct: true }, { text: "Random checkpoint paths", correct: false }, { text: "Disabling checkpoints", correct: false }, { text: "Coupling code and offsets", correct: false }], explanation: "Versioned checkpoints survive deployments." },
  { question: "Which Airflow construct provides dynamic mapping over a parameter array?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Dynamic Task Mapping", correct: true }, { text: "SubDAG", correct: false }, { text: "BashOperator", correct: false }, { text: "DummyOperator", correct: false }], explanation: "Airflow 2.3+ supports dynamic task mapping." },
  { question: "Which Delta operation reduces small-file overhead?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "OPTIMIZE", correct: true }, { text: "VACUUM", correct: false }, { text: "DESCRIBE", correct: false }, { text: "SHOW TABLES", correct: false }], explanation: "OPTIMIZE compacts small files." },
  { question: "Which Kafka pattern decouples producers from consumer schemas safely?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Schema Registry with backward-compatible evolution", correct: true }, { text: "Ad-hoc JSON without contracts", correct: false }, { text: "Manual binary parsing", correct: false }, { text: "Storing schemas in producer code only", correct: false }], explanation: "Schema Registry governs schema evolution." },
  { question: "Define watermarking in Structured Streaming.", type: "short_answer", difficulty: "medium", points: 4, expected: "A watermark bounds how late event-time data can arrive before being discarded; it allows windowed aggregations to finalize results and bound state size.", explanation: "Watermarks bound state and ensure timely results." },
  { question: "Briefly state why columnar formats outperform row formats for analytics.", type: "short_answer", difficulty: "easy", points: 2, expected: "Columnar layouts read only the necessary columns, compress better and align with vectorized execution engines.", explanation: "Columnar I/O + vectorization powers modern analytics." },
  { question: "Explain in two sentences when to use Iceberg over Delta.", type: "short_answer", difficulty: "hard", points: 4, expected: "Iceberg is engine-agnostic with rich partition evolution and hidden partitioning, suiting multi-engine ecosystems; Delta is best when Databricks-native features and Delta Sharing are required.", explanation: "Engine fit drives the choice." },
  { question: "Briefly explain why exactly-once Kafka semantics still require idempotent downstream sinks.", type: "short_answer", difficulty: "medium", points: 3, expected: "Even with EOS, downstream sinks may receive replayed batches during recovery; idempotent sinks ensure no duplicate state changes.", explanation: "EOS in Kafka doesn't guarantee downstream EOS by itself." },
  { question: "Why is partitioning by ingestion date often preferred over event date for streaming sinks?", type: "short_answer", difficulty: "medium", points: 3, expected: "Ingestion-time partitions keep file writes monotonic and avoid late-arriving data invalidating compacted partitions repeatedly.", explanation: "Ingestion partitioning simplifies compaction." },
  { question: "Write a PySpark snippet reading a Kafka topic into a streaming DataFrame.", type: "code_snippet", difficulty: "medium", points: 4, expected: "df = (spark.readStream\n      .format('kafka')\n      .option('kafka.bootstrap.servers', 'broker:9092')\n      .option('subscribe', 'events')\n      .option('startingOffsets', 'latest')\n      .load())", explanation: "Kafka source uses the standard readStream API." },
  { question: "Write a Spark SQL snippet OPTIMIZing and Z-ORDERing a Delta table by user_id.", type: "code_snippet", difficulty: "medium", points: 4, expected: "OPTIMIZE main.events ZORDER BY (user_id);", explanation: "Z-ORDER co-locates related rows for predicate pushdown." },
  { question: "Write an Airflow DAG snippet using dynamic task mapping to fan out a list of regions.", type: "code_snippet", difficulty: "hard", points: 5, expected: "@dag(schedule='@daily', start_date=days_ago(1))\ndef regional():\n    @task\n    def process(region): return region.upper()\n    process.expand(region=['us', 'eu', 'apac'])\nregional()", explanation: "task.expand creates one task per element." },
  { question: "Which file format is row-oriented and unsuitable for analytical queries?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Avro", correct: true }, { text: "Parquet", correct: false }, { text: "ORC", correct: false }, { text: "Iceberg metadata", correct: false }], explanation: "Avro is row-oriented." },
  { question: "Which Kafka topic configuration minimizes risk during a broker outage?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "replication.factor=3 + min.insync.replicas=2", correct: true }, { text: "replication.factor=1", correct: false }, { text: "min.insync.replicas=1 always", correct: false }, { text: "single partition only", correct: false }], explanation: "RF=3 + ISR>=2 tolerates a broker loss." },
]);

// Course 109 — Generative AI for Business Strategy
expandBank(109, [
  { question: "Which framework categorizes EU AI Act risk tiers for systems?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Unacceptable, High, Limited, Minimal", correct: true }, { text: "Bronze, Silver, Gold", correct: false }, { text: "Tier-0 to Tier-9", correct: false }, { text: "Alpha, Beta", correct: false }], explanation: "EU AI Act formalizes these four tiers." },
  { question: "Which step typically dominates LLM TCO for high-volume features?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Inference token cost", correct: true }, { text: "Fine-tuning compute", correct: false }, { text: "Initial procurement", correct: false }, { text: "Model registry storage", correct: false }], explanation: "At scale, inference dominates total cost." },
  { question: "Which evaluation focuses on outcome quality rather than answer style?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Task success rate against a labeled gold set", correct: true }, { text: "Tone analysis only", correct: false }, { text: "Token count", correct: false }, { text: "Latency", correct: false }], explanation: "Outcome metrics anchor business value." },
  { question: "Which org pattern centralizes platform tooling but lets product teams own use cases?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "AI Platform team + federated product squads", correct: true }, { text: "Pure central command and control", correct: false }, { text: "No platform team, fully decentralized", correct: false }, { text: "Outsource everything", correct: false }], explanation: "Federated models scale ownership." },
  { question: "Which sales motion most often unlocks enterprise GenAI pilots?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Outcome-based proof-of-value pilots", correct: true }, { text: "Marketing webinars only", correct: false }, { text: "Hackathon prizes", correct: false }, { text: "Free trials with no scope", correct: false }], explanation: "Outcome pilots de-risk procurement." },
  { question: "Which lever most directly reduces hallucination risk in production GenAI features?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Grounded retrieval with citations", correct: true }, { text: "Higher temperature", correct: false }, { text: "Larger context with random docs", correct: false }, { text: "Disabling tool use", correct: false }], explanation: "Grounding + citations curb hallucinations." },
  { question: "Which KPI best signals whether a copilot saves time for users?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Task completion time vs. control group", correct: true }, { text: "Click-through on welcome message", correct: false }, { text: "Token usage", correct: false }, { text: "Page-load time", correct: false }], explanation: "Time-to-outcome is the proxy for productivity." },
  { question: "Which clause in vendor contracts protects against training on customer data?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "No training on customer data clause", correct: true }, { text: "Auto-renewal clause", correct: false }, { text: "Most-favored-nation clause", correct: false }, { text: "Force majeure clause", correct: false }], explanation: "Explicit clause prevents accidental training data ingestion." },
  { question: "Which roadmap pattern reduces sunk-cost loss for unproven GenAI bets?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Time-boxed pilots with kill criteria", correct: true }, { text: "12-month commits without checkpoints", correct: false }, { text: "Implicit budgeting", correct: false }, { text: "Marketing-led scoping", correct: false }], explanation: "Kill criteria force discipline." },
  { question: "Which artifact informs CFO conversations on GenAI ROI?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "A defensible business case with sensitivity analysis", correct: true }, { text: "Press release", correct: false }, { text: "Vague slide deck", correct: false }, { text: "Vendor product brochure", correct: false }], explanation: "Sensitivity-analyzed business cases survive scrutiny." },
  { question: "Define 'AI governance' in two sentences.", type: "short_answer", difficulty: "medium", points: 3, expected: "The set of policies, controls and roles that ensure AI systems remain compliant with regulation and aligned with organizational values. It spans risk reviews, change approvals and operational monitoring.", explanation: "Governance ties policy to operations." },
  { question: "Briefly state why proprietary data is a strategic moat.", type: "short_answer", difficulty: "easy", points: 2, expected: "Proprietary data lets a company create model behaviors competitors cannot replicate, which is the durable advantage in a world of commoditized base models.", explanation: "Data moats survive model commoditization." },
  { question: "Explain why time-to-value, not benchmark scores, often dominates pilot selection.", type: "short_answer", difficulty: "medium", points: 3, expected: "Executives need to see tangible business outcomes within a quarter; benchmark improvements may not translate into measurable value within that window.", explanation: "Time-to-value drives sponsorship." },
  { question: "Briefly describe a failure mode of running GenAI pilots without a kill criterion.", type: "short_answer", difficulty: "medium", points: 3, expected: "Pilots can drift into perpetual experimentation without owners, consuming budget without ever passing the production threshold.", explanation: "Kill criteria prevent zombie pilots." },
  { question: "Define 'human-in-the-loop' in one sentence.", type: "short_answer", difficulty: "easy", points: 2, expected: "An operating model where humans review, approve or correct AI outputs before they affect downstream systems or customers.", explanation: "HITL is a common risk-reducing control." },
  { question: "Write a one-paragraph executive summary template covering business case, risk, and rollout.", type: "code_snippet", difficulty: "medium", points: 4, expected: "Initiative: [name]\nBusiness case: [problem] addressed via [LLM capability], projected [$ value, time saved].\nRisks: [data, regulatory, vendor], mitigated by [controls].\nRollout: [phase 1 pilot scope, phase 2 expansion gates, phase 3 platform integration].", explanation: "A reusable executive-summary template." },
  { question: "Write a sample 'value hypothesis' for a customer-support copilot.", type: "code_snippet", difficulty: "easy", points: 3, expected: "We believe a retrieval-grounded copilot will reduce mean handle time by 18% for tier-1 agents within 90 days, measured against a control cohort.", explanation: "Value hypothesis includes metric, target, time window." },
  { question: "Write a sample kill-criteria block for a 90-day pilot.", type: "code_snippet", difficulty: "medium", points: 4, expected: "Pilot is halted if at the 30-day gate any one of: deflection rate <5%, escalations to legal >=2, customer CSAT delta <-5 pts; or at 60-day gate: TCO/ticket exceeds $0.85.", explanation: "Quantitative kill criteria force discipline." },
  { question: "Which control most directly addresses data leakage to third-party APIs?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "PII redaction proxy + DLP scanning", correct: true }, { text: "Allowing prod credentials in prompts", correct: false }, { text: "Manual review every 6 months", correct: false }, { text: "Sharing API keys via email", correct: false }], explanation: "Redaction + DLP scans address leakage at the boundary." },
  { question: "Which pricing model is preferred when LLM usage is bursty but business-critical?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Provisioned throughput with committed capacity", correct: true }, { text: "Per-token only with no SLA", correct: false }, { text: "Free tier", correct: false }, { text: "Unmetered without contract", correct: false }], explanation: "Provisioned throughput buys reliability." },
]);

// Course 110 — Kubernetes in Production
expandBank(110, [
  { question: "Which SLI is most appropriate for an HTTP API?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Availability + latency at p99", correct: true }, { text: "CPU usage only", correct: false }, { text: "Pod count", correct: false }, { text: "Disk used", correct: false }], explanation: "User-facing SLIs are availability + latency." },
  { question: "Which autoscaler reacts to a custom event-source metric?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "KEDA", correct: true }, { text: "kube-proxy", correct: false }, { text: "CoreDNS", correct: false }, { text: "kube-scheduler", correct: false }], explanation: "KEDA scales on event metrics." },
  { question: "Which Kubernetes object enforces network policies between namespaces?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "NetworkPolicy", correct: true }, { text: "Ingress", correct: false }, { text: "Service", correct: false }, { text: "PersistentVolume", correct: false }], explanation: "NetworkPolicy enforces L3/L4 segmentation." },
  { question: "Which approach scales node capacity dynamically on AWS at low cost?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Karpenter with spot instance pools", correct: true }, { text: "Manually launching EC2 instances", correct: false }, { text: "Disabling auto-scaling", correct: false }, { text: "Single On-Demand node", correct: false }], explanation: "Karpenter is event-driven and supports spot." },
  { question: "Which Argo CD construct deploys a manifest set across multiple clusters?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "ApplicationSet with cluster generator", correct: true }, { text: "Plain Application", correct: false }, { text: "Helm chart only", correct: false }, { text: "Bash script", correct: false }], explanation: "ApplicationSet enables multi-cluster GitOps." },
  { question: "Which control reduces blast radius during a rollout?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Progressive delivery with traffic shifting", correct: true }, { text: "Pushing to all replicas at once", correct: false }, { text: "Disabling health checks", correct: false }, { text: "Skipping readiness probes", correct: false }], explanation: "Progressive delivery catches regressions early." },
  { question: "Which probe ensures a pod only receives traffic when ready?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "readinessProbe", correct: true }, { text: "livenessProbe", correct: false }, { text: "startupProbe", correct: false }, { text: "scheduledProbe", correct: false }], explanation: "readinessProbe gates service endpoints." },
  { question: "Which feature pins a workload to specific nodes via labels?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "nodeAffinity / nodeSelector", correct: true }, { text: "kube-proxy", correct: false }, { text: "ServiceMonitor", correct: false }, { text: "ConfigMap", correct: false }], explanation: "Affinity rules control placement." },
  { question: "Which observability stack pairs Prometheus for metrics with traces?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Prometheus + Tempo via OpenTelemetry Collector", correct: true }, { text: "Prometheus only", correct: false }, { text: "Splunk Enterprise alone", correct: false }, { text: "Plain text logs", correct: false }], explanation: "Tempo handles traces; OTEL Collector unifies pipelines." },
  { question: "Which mechanism enforces resource fairness for noisy neighbors?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Requests + limits per container", correct: true }, { text: "Removing namespaces", correct: false }, { text: "Disabling cgroups", correct: false }, { text: "Allowing best-effort pods only", correct: false }], explanation: "Requests/limits drive QoS class." },
  { question: "Define error-budget policy in two sentences.", type: "short_answer", difficulty: "medium", points: 3, expected: "It is the agreed organizational response when the error budget is being consumed too quickly. Typical actions include slowing or freezing risky changes until reliability is restored.", explanation: "EBP turns SLOs into operational levers." },
  { question: "Briefly describe a blameless postmortem.", type: "short_answer", difficulty: "easy", points: 2, expected: "A retrospective focused on systemic causes and corrective actions rather than individual fault, designed to make it safe to surface real failure modes.", explanation: "Blameless cultures learn faster." },
  { question: "Explain why pod disruption budgets matter during a node upgrade.", type: "short_answer", difficulty: "medium", points: 3, expected: "PDBs ensure that a minimum number of replicas remain available while pods are evicted, preventing accidental outages during planned maintenance.", explanation: "PDBs protect availability during voluntary disruptions." },
  { question: "Why is multi-tenant noisy-neighbor isolation tricky on Kubernetes?", type: "short_answer", difficulty: "hard", points: 4, expected: "Default kernel-level isolation is weaker than VMs, so tenant workloads can affect each other via CPU, memory bandwidth or disk I/O if requests/limits are not carefully tuned.", explanation: "K8s shares the kernel; isolation is not automatic." },
  { question: "Briefly state what a startupProbe is for.", type: "short_answer", difficulty: "easy", points: 2, expected: "It defers liveness checks for slow-starting containers so they are not killed during legitimate boot time.", explanation: "startupProbe protects slow-booting workloads." },
  { question: "Write a Kubernetes Deployment snippet for a Go service with 3 replicas and resource limits.", type: "code_snippet", difficulty: "medium", points: 4, expected: "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: checkout\nspec:\n  replicas: 3\n  selector: { matchLabels: { app: checkout } }\n  template:\n    metadata: { labels: { app: checkout } }\n    spec:\n      containers:\n        - name: app\n          image: ghcr.io/mindbridge/checkout:1.4.2\n          resources:\n            requests: { cpu: 200m, memory: 256Mi }\n            limits:   { cpu: '1',  memory: 512Mi }", explanation: "Canonical Deployment with QoS-driving resources." },
  { question: "Write an HPA snippet that scales on CPU utilization with min=2 max=20.", type: "code_snippet", difficulty: "medium", points: 4, expected: "apiVersion: autoscaling/v2\nkind: HorizontalPodAutoscaler\nmetadata: { name: checkout }\nspec:\n  scaleTargetRef:\n    apiVersion: apps/v1\n    kind: Deployment\n    name: checkout\n  minReplicas: 2\n  maxReplicas: 20\n  metrics:\n    - type: Resource\n      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }", explanation: "Autoscaling/v2 supports multiple metric types." },
  { question: "Write a PodDisruptionBudget snippet keeping at least 2 replicas of `checkout` available.", type: "code_snippet", difficulty: "medium", points: 4, expected: "apiVersion: policy/v1\nkind: PodDisruptionBudget\nmetadata: { name: checkout-pdb }\nspec:\n  minAvailable: 2\n  selector: { matchLabels: { app: checkout } }", explanation: "PDBs protect availability during evictions." },
  { question: "Which Kubernetes feature isolates secrets at rest with envelope encryption?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "KMS provider via EncryptionConfiguration", correct: true }, { text: "Storing secrets in ConfigMaps", correct: false }, { text: "Disabling RBAC", correct: false }, { text: "Plain etcd dump", correct: false }], explanation: "KMS providers wrap data keys per secret." },
  { question: "Which load-balancing topology reduces inter-AZ traffic?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Topology-aware hints / internal traffic policy", correct: true }, { text: "Round-robin DNS", correct: false }, { text: "Sticky cookies only", correct: false }, { text: "Random selection", correct: false }], explanation: "Topology-aware hints keep traffic in-zone when possible." },
]);

// Course 111 — Quantitative Risk Modeling for Fintech
expandBank(111, [
  { question: "PD, LGD and EAD jointly produce which metric?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Expected Loss (EL)", correct: true }, { text: "Net Interest Margin", correct: false }, { text: "Sharpe ratio", correct: false }, { text: "Information Coefficient", correct: false }], explanation: "EL = PD x LGD x EAD." },
  { question: "Which transformation is standard for ordering features in a scorecard model?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Weight of Evidence (WOE) binning", correct: true }, { text: "Min-max normalization", correct: false }, { text: "PCA whitening", correct: false }, { text: "Random hashing", correct: false }], explanation: "WOE binning is the canonical scorecard transform." },
  { question: "Which statistic measures predictive power of a binary scorecard?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Information Value (IV)", correct: true }, { text: "Sortino ratio", correct: false }, { text: "Tracking error", correct: false }, { text: "ICDF", correct: false }], explanation: "IV summarizes WOE bin contribution." },
  { question: "Which VaR method most directly captures heavy tails empirically?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Historical simulation with EVT tail fit", correct: true }, { text: "Parametric VaR with normal assumption", correct: false }, { text: "Lognormal default", correct: false }, { text: "Brownian bridge", correct: false }], explanation: "EVT models the tail directly." },
  { question: "Which backtest assesses VaR exception clustering over time?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Christoffersen independence test", correct: true }, { text: "Kupiec point test only", correct: false }, { text: "Shapiro-Wilk only", correct: false }, { text: "Anderson-Darling only", correct: false }], explanation: "Christoffersen evaluates exception independence." },
  { question: "Which Basel pillar covers supervisory review?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Pillar 2", correct: true }, { text: "Pillar 1", correct: false }, { text: "Pillar 3", correct: false }, { text: "Pillar 0", correct: false }], explanation: "Pillar 2 is supervisory review." },
  { question: "Operational risk loss data is commonly modeled via:", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Loss Distribution Approach (frequency + severity)", correct: true }, { text: "Pure linear regression", correct: false }, { text: "Random walk", correct: false }, { text: "Naive Bayes", correct: false }], explanation: "LDA decomposes frequency and severity." },
  { question: "Which distribution is commonly used for severity in LDA?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Lognormal or Generalized Pareto", correct: true }, { text: "Uniform only", correct: false }, { text: "Discrete uniform", correct: false }, { text: "Geometric only", correct: false }], explanation: "Heavy-tailed distributions fit op-risk severities." },
  { question: "Which document codifies US expectations for model governance?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "SR 11-7 (Fed Supervisory Letter)", correct: true }, { text: "ISO 27001 only", correct: false }, { text: "Sarbanes-Oxley", correct: false }, { text: "Dodd-Frank rule 1010", correct: false }], explanation: "SR 11-7 is the model risk management baseline." },
  { question: "Which statistical adjustment supports rare-event sampling in scorecards?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Class-weight adjustments with calibration", correct: true }, { text: "Discarding rare events", correct: false }, { text: "Duplicating training data without weights", correct: false }, { text: "Random shuffling only", correct: false }], explanation: "Class-weighting + calibration retains signal." },
  { question: "In two sentences, define Effective Challenge in model validation.", type: "short_answer", difficulty: "medium", points: 3, expected: "It is independent, rigorous scrutiny of model assumptions, data and outputs by reviewers not involved in development. The intent is to surface and remediate weaknesses before deployment.", explanation: "Effective challenge is at the heart of SR 11-7." },
  { question: "Briefly describe Expected Shortfall (ES) coherence.", type: "short_answer", difficulty: "medium", points: 3, expected: "ES is a coherent risk measure: monotone, subadditive, positively homogeneous and translation invariant, unlike VaR which can violate subadditivity.", explanation: "Coherence guarantees diversification benefit." },
  { question: "Explain why PD calibration drift matters.", type: "short_answer", difficulty: "medium", points: 3, expected: "If realized default rates diverge from PD estimates, capital allocations and limit decisions become biased; calibration monitoring catches drift early.", explanation: "Drift impacts capital and pricing." },
  { question: "Briefly state why historical VaR may underestimate risk after low-volatility periods.", type: "short_answer", difficulty: "hard", points: 4, expected: "If the lookback window is dominated by tranquil markets, the empirical distribution under-represents stress events; conditional or filtered historical VaR mitigates this.", explanation: "Filtered HS rescales tails to current vol." },
  { question: "Explain in one sentence what backtesting a credit scorecard means.", type: "short_answer", difficulty: "easy", points: 2, expected: "Comparing predicted PDs to realized default rates across cohorts and segments to verify discrimination and calibration.", explanation: "Backtesting validates both discrimination and calibration." },
  { question: "Write a Python snippet computing the Gini coefficient from `y_true` and `y_pred`.", type: "code_snippet", difficulty: "medium", points: 4, expected: "from sklearn.metrics import roc_auc_score\ngini = 2 * roc_auc_score(y_true, y_pred) - 1", explanation: "Gini = 2 AUC - 1." },
  { question: "Write a Python snippet computing 1-day 99% VaR from a P&L Series `pnl`.", type: "code_snippet", difficulty: "medium", points: 4, expected: "import numpy as np\nvar99 = -np.quantile(pnl, 0.01)", explanation: "1% empirical quantile gives 99% VaR." },
  { question: "Write a Python snippet to bootstrap a confidence interval for the mean default rate.", type: "code_snippet", difficulty: "hard", points: 5, expected: "import numpy as np\nboot = [np.mean(np.random.choice(defaults, len(defaults), replace=True)) for _ in range(10000)]\nlo, hi = np.quantile(boot, [0.025, 0.975])", explanation: "Standard percentile bootstrap." },
  { question: "Which technique is preferred when validating an internal model against an external benchmark?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Side-by-side benchmarking with documented disagreements", correct: true }, { text: "Adopting the external model without testing", correct: false }, { text: "Hiding disagreements", correct: false }, { text: "Disabling internal model", correct: false }], explanation: "Benchmarking with documentation is the validation norm." },
  { question: "Which review captures the lifecycle decisions for a model from inception to retirement?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Model inventory + lifecycle workflow", correct: true }, { text: "Marketing roadmap", correct: false }, { text: "Engineer's diary", correct: false }, { text: "Quarterly newsletter", correct: false }], explanation: "Inventories anchor governance." },
]);

// Course 112 — Computer Vision with Transformers
expandBank(112, [
  { question: "Which token sits at the start of a Vision Transformer and aggregates representation?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Class token (CLS)", correct: true }, { text: "Pad token", correct: false }, { text: "EOS token", correct: false }, { text: "Mask token", correct: false }], explanation: "CLS aggregates per-image features." },
  { question: "Which strategy enables learning from unlabeled images at scale?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Masked Autoencoders (MAE) pretraining", correct: true }, { text: "Supervised classification only", correct: false }, { text: "Manual feature engineering", correct: false }, { text: "Single-image overfitting", correct: false }], explanation: "MAE pre-training is a leading self-supervised approach." },
  { question: "Which detection model formulates object detection as set prediction?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "DETR", correct: true }, { text: "YOLOv1", correct: false }, { text: "Faster R-CNN", correct: false }, { text: "SSD300", correct: false }], explanation: "DETR uses set prediction + Hungarian matching." },
  { question: "Which segmentation model unifies semantic, instance and panoptic segmentation?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Mask2Former", correct: true }, { text: "U-Net classic only", correct: false }, { text: "ResNet-50 backbone alone", correct: false }, { text: "FCN-8s", correct: false }], explanation: "Mask2Former unifies the three tasks." },
  { question: "Which library hosts SOTA timm vision backbones?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "Hugging Face / PyTorch Image Models (timm)", correct: true }, { text: "matplotlib", correct: false }, { text: "OpenCV only", correct: false }, { text: "Pandas", correct: false }], explanation: "timm aggregates SOTA backbones." },
  { question: "Which loss penalizes incorrect bipartite assignments in DETR?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Hungarian matching loss", correct: true }, { text: "MSE", correct: false }, { text: "BCE only", correct: false }, { text: "Cosine embedding only", correct: false }], explanation: "Hungarian matching pairs predictions to GT." },
  { question: "Which serving stack is canonical for PyTorch in production?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "TorchServe", correct: true }, { text: "Pandas", correct: false }, { text: "OpenCV CLI", correct: false }, { text: "Flask without batching", correct: false }], explanation: "TorchServe handles batching, scaling, custom handlers." },
  { question: "Which export format enables cross-runtime deployment of PyTorch models?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "ONNX", correct: true }, { text: "PNG", correct: false }, { text: "TIFF", correct: false }, { text: "CSV", correct: false }], explanation: "ONNX bridges runtimes." },
  { question: "Which technique reduces VRAM usage during long-sequence training?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Gradient checkpointing", correct: true }, { text: "Disabling backprop", correct: false }, { text: "Adding more layers", correct: false }, { text: "Using FP64", correct: false }], explanation: "Checkpointing trades compute for memory." },
  { question: "Which multimodal model learns joint image-text embeddings via contrastive loss?", type: "multiple_choice", difficulty: "easy", points: 2, options: [{ text: "CLIP", correct: true }, { text: "ResNet-152", correct: false }, { text: "GAN", correct: false }, { text: "VGG-16", correct: false }], explanation: "CLIP popularized contrastive image-text alignment." },
  { question: "Define IoU in one sentence.", type: "short_answer", difficulty: "easy", points: 2, expected: "Intersection over Union is the area of overlap between predicted and ground-truth regions divided by the area of their union.", explanation: "IoU is the canonical overlap metric." },
  { question: "Briefly explain why label-smoothing helps Vision Transformer training.", type: "short_answer", difficulty: "medium", points: 3, expected: "Label smoothing prevents the model from becoming over-confident, which regularizes training and improves calibration on held-out data.", explanation: "Smoothing reduces overfitting." },
  { question: "Define ablation study in two sentences.", type: "short_answer", difficulty: "easy", points: 2, expected: "An ablation systematically removes or modifies model components to measure their individual contribution to performance. It is the standard way to attribute gains in research papers.", explanation: "Ablations explain where gains come from." },
  { question: "Explain why mixup augmentation can improve robustness.", type: "short_answer", difficulty: "medium", points: 3, expected: "Mixup linearly blends pairs of images and labels, encouraging linear behavior between training examples and improving out-of-distribution robustness.", explanation: "Mixup encourages smoother decision boundaries." },
  { question: "Briefly state why warmup + cosine LR schedules suit ViT training.", type: "short_answer", difficulty: "medium", points: 3, expected: "Warmup avoids divergence in the early high-LR regime, and cosine decay enables fine-grained convergence near the end of training.", explanation: "Warmup + cosine is the empirical sweet spot for ViTs." },
  { question: "Write a PyTorch snippet creating a `DataLoader` for an ImageFolder dataset with augmentation.", type: "code_snippet", difficulty: "medium", points: 4, expected: "from torchvision import datasets, transforms\nfrom torch.utils.data import DataLoader\ntfm = transforms.Compose([\n    transforms.RandomResizedCrop(224),\n    transforms.RandomHorizontalFlip(),\n    transforms.ToTensor(),\n])\nds = datasets.ImageFolder('data/train', transform=tfm)\ndl = DataLoader(ds, batch_size=64, shuffle=True, num_workers=4)", explanation: "Canonical ImageFolder + DataLoader setup." },
  { question: "Write a PyTorch snippet computing CLIP-style cosine similarity between image and text features.", type: "code_snippet", difficulty: "medium", points: 5, expected: "import torch.nn.functional as F\nimg = F.normalize(img_emb, dim=-1)\ntxt = F.normalize(txt_emb, dim=-1)\nsim = img @ txt.T", explanation: "Normalize then take inner product." },
  { question: "Write a snippet exporting a PyTorch model to ONNX.", type: "code_snippet", difficulty: "easy", points: 3, expected: "torch.onnx.export(model, sample_input, 'model.onnx', input_names=['input'], output_names=['logits'], opset_version=17)", explanation: "Standard ONNX export call." },
  { question: "Which augmentation is least invariant for face recognition?", type: "multiple_choice", difficulty: "hard", points: 4, options: [{ text: "Horizontal flip for asymmetrical features", correct: true }, { text: "Random brightness", correct: false }, { text: "Color jitter mild", correct: false }, { text: "Random crop", correct: false }], explanation: "Flipping can break identity-sensitive features." },
  { question: "Which method gives a free-form mask from a text prompt for segmentation?", type: "multiple_choice", difficulty: "medium", points: 3, options: [{ text: "Grounded SAM (SAM + open-vocab detector)", correct: true }, { text: "Sobel edges", correct: false }, { text: "Histogram equalization", correct: false }, { text: "Gaussian blur", correct: false }], explanation: "Grounded SAM combines text-prompted detection with SAM masks." },
]);

// ---------------------------------------------------------------------------
// MATERIALIZE QUIZ QUESTIONS
// ---------------------------------------------------------------------------

const _materializeQuizQuestions = (): MockQuizQuestion[] => {
  const questions: MockQuizQuestion[] = [];
  let questionId = 9001;
  let optionId = 70001;
  for (const spec of QUIZ_SPECS) {
    const options: MockQuizOption[] = (spec.options ?? []).map((o) => ({
      id: optionId++,
      option_text: o.text,
      is_correct: o.correct,
    }));
    questions.push({
      id: questionId++,
      course_id: spec.course_id,
      lesson_id: spec.lesson_id,
      question_text: spec.question,
      question_type: spec.type,
      points: spec.points,
      difficulty: spec.difficulty,
      options,
      expected_answer: spec.expected ?? null,
      explanation: spec.explanation,
    });
  }
  return questions;
};

export const MOCK_QUIZ_QUESTIONS: MockQuizQuestion[] = _materializeQuizQuestions();

// ---------------------------------------------------------------------------
// ASSIGNMENTS — 5 rubric-graded assignment tasks
// ---------------------------------------------------------------------------

const findAssignmentLessonId = (courseId: number): number =>
  findLessonId(courseId, (l) => l.lesson_type === "assignment");

export const MOCK_ASSIGNMENTS: MockAssignment[] = [
  {
    id: 401,
    course_id: 101,
    lesson_id: findAssignmentLessonId(101),
    title: "Fine-Tune Mistral-7B for Domain Question Answering",
    description:
      "Apply QLoRA to fine-tune Mistral-7B-v0.1 on the supplied medical QA corpus. Deliver a 5-page PDF report covering dataset preparation, training curves, eval metrics on the held-out test set, and a hosted demo link.",
    due_date: "2026-06-08T23:59:00.000Z",
    max_score: 100,
    passing_score: 70,
    allow_late_submission: true,
    late_submission_days: 3,
    late_penalty_percent: 10,
    allow_resubmission: true,
    max_resubmissions: 2,
    allowed_formats: ["pdf", "zip"],
    attachments: [
      {
        file_name: "assignment-401-prompt.pdf",
        file_path: "s3://mindbridge-assignments/c101/a401/prompt.pdf",
        signed_url: "https://cdn.mindbridge.io/assignments/c101/a401/prompt.pdf?sig=A401PROMPT",
        file_size: 412_330,
      },
      {
        file_name: "medical-qa-corpus.zip",
        file_path: "s3://mindbridge-assignments/c101/a401/corpus.zip",
        signed_url: "https://cdn.mindbridge.io/assignments/c101/a401/corpus.zip?sig=A401CORPUS",
        file_size: 18_204_117,
      },
    ],
    assignment_kind: "file_prompt",
    rubric: [
      { id: "R1", criterion: "Dataset Engineering", weight_percent: 20, description: "Cleaning, deduplication and train/val/test splits documented.", max_points: 20 },
      { id: "R2", criterion: "Training Protocol", weight_percent: 25, description: "Reproducible LoRA/QLoRA config and convergence diagnostics.", max_points: 25 },
      { id: "R3", criterion: "Evaluation Quality", weight_percent: 25, description: "Held-out metrics with confidence intervals and qualitative analysis.", max_points: 25 },
      { id: "R4", criterion: "Reflection & Limitations", weight_percent: 15, description: "Risks, failure modes and ethical considerations.", max_points: 15 },
      { id: "R5", criterion: "Code Reproducibility", weight_percent: 15, description: "Pinned dependencies and one-command run script.", max_points: 15 },
    ],
    time_limit_minutes: null,
    instructor_id: 3,
  },
  {
    id: 402,
    course_id: 102,
    lesson_id: findAssignmentLessonId(102),
    title: "Pass the Raft Linearizability Test Suite",
    description:
      "Submit a Go implementation of Raft that passes the linearizability test harness shipped with the course. Include a 2-page architecture note and a Loom recording (link) explaining your leader-election strategy.",
    due_date: "2026-06-21T23:59:00.000Z",
    max_score: 100,
    passing_score: 70,
    allow_late_submission: false,
    late_submission_days: 0,
    late_penalty_percent: 0,
    allow_resubmission: true,
    max_resubmissions: 3,
    allowed_formats: ["zip"],
    attachments: [
      {
        file_name: "assignment-402-spec.pdf",
        file_path: "s3://mindbridge-assignments/c102/a402/spec.pdf",
        signed_url: "https://cdn.mindbridge.io/assignments/c102/a402/spec.pdf?sig=A402SPEC",
        file_size: 318_900,
      },
      {
        file_name: "raft-test-harness.zip",
        file_path: "s3://mindbridge-assignments/c102/a402/harness.zip",
        signed_url: "https://cdn.mindbridge.io/assignments/c102/a402/harness.zip?sig=A402HARNESS",
        file_size: 7_502_113,
      },
    ],
    assignment_kind: "file_prompt",
    rubric: [
      { id: "R1", criterion: "Correctness", weight_percent: 50, description: "Passes linearizability tests under fault injection.", max_points: 50 },
      { id: "R2", criterion: "Code Quality", weight_percent: 20, description: "Idiomatic Go with safe concurrency patterns.", max_points: 20 },
      { id: "R3", criterion: "Architecture Note", weight_percent: 15, description: "Clear written explanation of design decisions.", max_points: 15 },
      { id: "R4", criterion: "Observability", weight_percent: 15, description: "Useful logs/traces for debugging.", max_points: 15 },
    ],
    time_limit_minutes: null,
    instructor_id: 4,
  },
  {
    id: 403,
    course_id: 104,
    lesson_id: findAssignmentLessonId(104),
    title: "Provision a Reference VPC Architecture with Terraform",
    description:
      "Author a Terraform module that provisions a 3-AZ VPC with public/private/ML subnets, NAT egress, VPC endpoints for S3 and DynamoDB, and a fully tagged baseline. Include `terraform plan` output and a 2-page design note.",
    due_date: "2026-06-30T23:59:00.000Z",
    max_score: 100,
    passing_score: 75,
    allow_late_submission: true,
    late_submission_days: 2,
    late_penalty_percent: 15,
    allow_resubmission: true,
    max_resubmissions: 2,
    allowed_formats: ["zip", "pdf"],
    attachments: [
      {
        file_name: "assignment-403-brief.pdf",
        file_path: "s3://mindbridge-assignments/c104/a403/brief.pdf",
        signed_url: "https://cdn.mindbridge.io/assignments/c104/a403/brief.pdf?sig=A403BRIEF",
        file_size: 285_412,
      },
    ],
    assignment_kind: "file_prompt",
    rubric: [
      { id: "R1", criterion: "Correctness of Architecture", weight_percent: 30, description: "Subnet topology, routing and endpoints meet brief.", max_points: 30 },
      { id: "R2", criterion: "Module Hygiene", weight_percent: 25, description: "Reusable variables, outputs and naming conventions.", max_points: 25 },
      { id: "R3", criterion: "Security Posture", weight_percent: 25, description: "Least-privilege IAM, encrypted endpoints.", max_points: 25 },
      { id: "R4", criterion: "Documentation", weight_percent: 20, description: "Clear README and design note.", max_points: 20 },
    ],
    time_limit_minutes: null,
    instructor_id: 6,
  },
  {
    id: 404,
    course_id: 105,
    lesson_id: findAssignmentLessonId(105),
    title: "Hunt Playbook for MITRE T1059 — Command-and-Scripting Interpreter",
    description:
      "Develop a hunt playbook detecting suspicious PowerShell + cmd.exe usage. Submit Sigma rules, a Splunk SPL query, a tested KQL fallback, and a 3-page narrative covering hypothesis, telemetry sources, expected false positives and mitigations.",
    due_date: "2026-07-05T23:59:00.000Z",
    max_score: 100,
    passing_score: 70,
    allow_late_submission: true,
    late_submission_days: 5,
    late_penalty_percent: 5,
    allow_resubmission: true,
    max_resubmissions: 1,
    allowed_formats: ["zip", "pdf"],
    attachments: [
      {
        file_name: "assignment-404-sample-telemetry.zip",
        file_path: "s3://mindbridge-assignments/c105/a404/telemetry.zip",
        signed_url: "https://cdn.mindbridge.io/assignments/c105/a404/telemetry.zip?sig=A404TELEMETRY",
        file_size: 5_120_876,
      },
    ],
    assignment_kind: "file_prompt",
    rubric: [
      { id: "R1", criterion: "Hypothesis Clarity", weight_percent: 20, description: "Concrete, falsifiable hypothesis tied to ATT&CK.", max_points: 20 },
      { id: "R2", criterion: "Detection Coverage", weight_percent: 35, description: "Rules detect documented adversary tradecraft.", max_points: 35 },
      { id: "R3", criterion: "False-Positive Strategy", weight_percent: 25, description: "Tuning logic and suppression strategy documented.", max_points: 25 },
      { id: "R4", criterion: "Operational Readiness", weight_percent: 20, description: "Runbook and SOAR-friendly response steps.", max_points: 20 },
    ],
    time_limit_minutes: null,
    instructor_id: 7,
  },
  {
    id: 405,
    course_id: 108,
    lesson_id: findAssignmentLessonId(108),
    title: "Optimize a 4 TB Spark Join with AQE and Skew Handling",
    description:
      "Given the provided 4 TB clickstream join, deliver an optimized Spark job that completes in under 18 minutes on a 50-node cluster. Submit your code, Spark UI screenshots, and a 4-page report explaining your tuning decisions.",
    due_date: "2026-07-15T23:59:00.000Z",
    max_score: 100,
    passing_score: 80,
    allow_late_submission: false,
    late_submission_days: 0,
    late_penalty_percent: 0,
    allow_resubmission: true,
    max_resubmissions: 2,
    allowed_formats: ["zip", "pdf"],
    attachments: [
      {
        file_name: "assignment-405-cluster-spec.pdf",
        file_path: "s3://mindbridge-assignments/c108/a405/cluster.pdf",
        signed_url: "https://cdn.mindbridge.io/assignments/c108/a405/cluster.pdf?sig=A405CLUSTER",
        file_size: 248_990,
      },
    ],
    assignment_kind: "file_prompt",
    rubric: [
      { id: "R1", criterion: "Performance Achievement", weight_percent: 40, description: "Meets the 18-minute wall-clock SLA.", max_points: 40 },
      { id: "R2", criterion: "Configuration Justification", weight_percent: 25, description: "Tunables explained with profiling evidence.", max_points: 25 },
      { id: "R3", criterion: "Skew Handling", weight_percent: 20, description: "Demonstrates skewed-join mitigation strategy.", max_points: 20 },
      { id: "R4", criterion: "Report Quality", weight_percent: 15, description: "Concise, well-illustrated report.", max_points: 15 },
    ],
    time_limit_minutes: null,
    instructor_id: 10,
  },
];

// ---------------------------------------------------------------------------
// ASSIGNMENT SUBMISSIONS — 12 entries across the 5 assignments
// ---------------------------------------------------------------------------

const ATTACHMENT = (lid: number, label: string, ext: string): { file_name: string; file_path: string; file_size: number } => ({
  file_name: `${label}.${ext}`,
  file_path: `s3://mindbridge-submissions/${lid}/${label}.${ext}`,
  file_size: 1_500_000 + (lid * 4099) % 3_500_000,
});

export const MOCK_ASSIGNMENT_SUBMISSIONS: MockAssignmentSubmission[] = [
  { id: 5001, assignment_id: 401, learner_id: 11, submitted_at: "2026-05-29T18:42:00.000Z", ...ATTACHMENT(11, "petrov-c101-finetune", "zip"), status: "graded", resubmission_count: 0, notes: "Initial QLoRA submission." },
  { id: 5002, assignment_id: 401, learner_id: 27, submitted_at: "2026-06-01T20:15:00.000Z", ...ATTACHMENT(27, "nair-c101-finetune", "zip"), status: "graded", resubmission_count: 0, notes: "Used custom evaluation harness with RAGAS." },
  { id: 5003, assignment_id: 401, learner_id: 29, submitted_at: "2026-06-04T03:11:00.000Z", ...ATTACHMENT(29, "beauchamp-c101-finetune", "zip"), status: "submitted", resubmission_count: 1, notes: "Resubmission after instructor feedback on data dedup." },
  { id: 5004, assignment_id: 402, learner_id: 21, submitted_at: "2026-06-12T14:48:00.000Z", ...ATTACHMENT(21, "vasiliou-c102-raft", "zip"), status: "graded", resubmission_count: 0, notes: "Implementation passes 184/200 chaos cases." },
  { id: 5005, assignment_id: 402, learner_id: 17, submitted_at: "2026-06-13T09:22:00.000Z", ...ATTACHMENT(17, "nieminen-c102-raft", "zip"), status: "graded", resubmission_count: 1, notes: "Resubmission with improved snapshot transfer." },
  { id: 5006, assignment_id: 403, learner_id: 19, submitted_at: "2026-06-25T17:08:00.000Z", ...ATTACHMENT(19, "ricci-c104-vpc", "zip"), status: "graded", resubmission_count: 0, notes: "Includes module versioning and pre-commit hooks." },
  { id: 5007, assignment_id: 403, learner_id: 30, submitted_at: "2026-06-27T12:39:00.000Z", ...ATTACHMENT(30, "bui-c104-vpc", "zip"), status: "submitted", resubmission_count: 0, notes: "First-time submission, awaiting grading." },
  { id: 5008, assignment_id: 404, learner_id: 20, submitted_at: "2026-06-30T15:00:00.000Z", ...ATTACHMENT(20, "kovaleva-c105-hunt", "zip"), status: "graded", resubmission_count: 0, notes: "Comprehensive ATT&CK mapping included." },
  { id: 5009, assignment_id: 404, learner_id: 26, submitted_at: "2026-07-02T18:51:00.000Z", ...ATTACHMENT(26, "lee-c105-hunt", "zip"), status: "graded", resubmission_count: 0, notes: "KQL fallback validated in sandbox." },
  { id: 5010, assignment_id: 405, learner_id: 14, submitted_at: "2026-07-10T08:14:00.000Z", ...ATTACHMENT(14, "tanaka-c108-spark", "zip"), status: "graded", resubmission_count: 0, notes: "Wall-clock: 17m12s." },
  { id: 5011, assignment_id: 405, learner_id: 22, submitted_at: "2026-07-11T22:31:00.000Z", ...ATTACHMENT(22, "sharma-c108-spark", "zip"), status: "graded", resubmission_count: 1, notes: "Tuned salting strategy after first feedback round." },
  { id: 5012, assignment_id: 401, learner_id: 13, submitted_at: "2026-06-09T11:45:00.000Z", ...ATTACHMENT(13, "iyer-c101-finetune", "zip"), status: "late", resubmission_count: 0, notes: "Submitted 24h late; penalty applied." },
];

// ---------------------------------------------------------------------------
// GRADING RECORDS — 18 entries (≥15) covering the graded submissions above
// ---------------------------------------------------------------------------

const rubricEarned = (assignmentId: number, scale: number): MockRubricBreakdownEntry[] => {
  const assignment = MOCK_ASSIGNMENTS.find((a) => a.id === assignmentId);
  if (!assignment) throw new Error(`Unknown assignment ${assignmentId}`);
  return assignment.rubric.map((r) => ({
    rubric_id: r.id,
    criterion: r.criterion,
    weight_percent: r.weight_percent,
    earned_points: Math.round(r.max_points * scale * 10) / 10,
    comment: `Auto-graded with ${(scale * 100).toFixed(0)}% credit on ${r.criterion}.`,
  }));
};

export const MOCK_GRADING_RECORDS: MockGradingRecord[] = [
  { id: 6001, submission_id: 5001, assignment_id: 401, graded_by_id: 3, score: 88, passed: true, feedback_text: "Strong QLoRA setup and clean evaluation, but the medical-domain dedup procedure missed near-duplicates from PubMed abstracts; rerun with MinHash next time.", rubric_breakdown: rubricEarned(401, 0.88), graded_at: "2026-06-02T10:12:00.000Z", ai_assist_used: true },
  { id: 6002, submission_id: 5002, assignment_id: 401, graded_by_id: 3, score: 94, passed: true, feedback_text: "Excellent submission — your RAGAS evaluation harness is reusable across cohorts. Consider publishing a write-up.", rubric_breakdown: rubricEarned(401, 0.94), graded_at: "2026-06-03T09:45:00.000Z", ai_assist_used: false },
  { id: 6003, submission_id: 5004, assignment_id: 402, graded_by_id: 4, score: 79, passed: true, feedback_text: "Raft implementation is solid on the happy path; chaos cases fail when leader is partitioned during snapshot transfer — see comments inline.", rubric_breakdown: rubricEarned(402, 0.79), graded_at: "2026-06-14T18:20:00.000Z", ai_assist_used: false },
  { id: 6004, submission_id: 5005, assignment_id: 402, graded_by_id: 4, score: 86, passed: true, feedback_text: "Resubmission resolves the snapshot transfer issue. Reasoning in the architecture note is clearer and tied directly to test outcomes.", rubric_breakdown: rubricEarned(402, 0.86), graded_at: "2026-06-15T15:33:00.000Z", ai_assist_used: false },
  { id: 6005, submission_id: 5006, assignment_id: 403, graded_by_id: 6, score: 91, passed: true, feedback_text: "Module hygiene is exemplary — tagging, naming and outputs are production-ready. Slight nit: NAT egress should use VPC endpoint policies for S3.", rubric_breakdown: rubricEarned(403, 0.91), graded_at: "2026-06-27T08:00:00.000Z", ai_assist_used: true },
  { id: 6006, submission_id: 5008, assignment_id: 404, graded_by_id: 7, score: 84, passed: true, feedback_text: "Hunt playbook covers the canonical PowerShell vectors. Add a Sigma rule for AMSI-bypass strings to broaden coverage.", rubric_breakdown: rubricEarned(404, 0.84), graded_at: "2026-07-01T12:18:00.000Z", ai_assist_used: false },
  { id: 6007, submission_id: 5009, assignment_id: 404, graded_by_id: 7, score: 89, passed: true, feedback_text: "Strong tuning narrative and clear SOAR integration steps. KQL fallback is well-tested.", rubric_breakdown: rubricEarned(404, 0.89), graded_at: "2026-07-03T10:55:00.000Z", ai_assist_used: true },
  { id: 6008, submission_id: 5010, assignment_id: 405, graded_by_id: 10, score: 95, passed: true, feedback_text: "Beat the SLA by 1m48s. Excellent use of salting + AQE — your write-up would make a solid internal IBM tech note.", rubric_breakdown: rubricEarned(405, 0.95), graded_at: "2026-07-10T16:42:00.000Z", ai_assist_used: false },
  { id: 6009, submission_id: 5011, assignment_id: 405, graded_by_id: 10, score: 81, passed: true, feedback_text: "Resubmission cleared the SLA. Consider documenting the salt cardinality decision in the report.", rubric_breakdown: rubricEarned(405, 0.81), graded_at: "2026-07-12T11:08:00.000Z", ai_assist_used: false },
  { id: 6010, submission_id: 5012, assignment_id: 401, graded_by_id: 3, score: 62, passed: false, feedback_text: "Submission is functional but missed both the convergence diagnostics and the ethics reflection. Late penalty applied. Please resubmit by 2026-06-12.", rubric_breakdown: rubricEarned(401, 0.62), graded_at: "2026-06-10T13:10:00.000Z", ai_assist_used: true },
  { id: 6011, submission_id: 5003, assignment_id: 401, graded_by_id: 3, score: 90, passed: true, feedback_text: "Resubmission addresses dedup issues comprehensively; the Streamlit demo is a nice touch.", rubric_breakdown: rubricEarned(401, 0.9), graded_at: "2026-06-06T09:00:00.000Z", ai_assist_used: false },
  { id: 6012, submission_id: 5007, assignment_id: 403, graded_by_id: 6, score: 78, passed: true, feedback_text: "Architecture meets the brief; tighten variable naming and add module README to lift to distinction.", rubric_breakdown: rubricEarned(403, 0.78), graded_at: "2026-06-28T14:30:00.000Z", ai_assist_used: false },
  { id: 6013, submission_id: 5001, assignment_id: 401, graded_by_id: 3, score: 91, passed: true, feedback_text: "Second-pass review post-instructor calibration: bumped score after recognizing your novel chunking pattern.", rubric_breakdown: rubricEarned(401, 0.91), graded_at: "2026-06-04T07:42:00.000Z", ai_assist_used: false },
  { id: 6014, submission_id: 5005, assignment_id: 402, graded_by_id: 4, score: 88, passed: true, feedback_text: "Audit re-grade after instructor calibration meeting. Snapshot streaming logic exceeds expectations.", rubric_breakdown: rubricEarned(402, 0.88), graded_at: "2026-06-17T16:00:00.000Z", ai_assist_used: false },
  { id: 6015, submission_id: 5006, assignment_id: 403, graded_by_id: 6, score: 93, passed: true, feedback_text: "Calibration uplift after design-review walkthrough; tagging strategy is the new gold standard for this cohort.", rubric_breakdown: rubricEarned(403, 0.93), graded_at: "2026-06-29T11:00:00.000Z", ai_assist_used: false },
  { id: 6016, submission_id: 5008, assignment_id: 404, graded_by_id: 7, score: 86, passed: true, feedback_text: "Uplift granted after submission of AMSI bypass Sigma rule via follow-up message.", rubric_breakdown: rubricEarned(404, 0.86), graded_at: "2026-07-02T19:00:00.000Z", ai_assist_used: false },
  { id: 6017, submission_id: 5010, assignment_id: 405, graded_by_id: 10, score: 96, passed: true, feedback_text: "Calibration session promotion. Your skew handling pattern was adopted into the reference solution.", rubric_breakdown: rubricEarned(405, 0.96), graded_at: "2026-07-12T08:00:00.000Z", ai_assist_used: false },
  { id: 6018, submission_id: 5009, assignment_id: 404, graded_by_id: 7, score: 91, passed: true, feedback_text: "Uplift after recognizing the lateral-movement detection rule's novelty.", rubric_breakdown: rubricEarned(404, 0.91), graded_at: "2026-07-04T08:25:00.000Z", ai_assist_used: false },
];

// ---------------------------------------------------------------------------
// TRANSACTIONS — 36 records spanning SUCCESS / PENDING / FAILED / EXPIRED / REFUNDED
// ---------------------------------------------------------------------------

const usdToVnd = (usd: number): number => Math.round(usd * 24_700);

const tx = (
  id: number,
  course_id: number,
  user_id: number,
  status: TransactionStatus,
  provider: PaymentProvider,
  created_at: string,
  paid_at: string | null,
  notes: string | null,
  currency: "USD" | "VND" = "VND",
): MockTransaction => {
  const course = MOCK_COURSES.find((c) => c.id === course_id)!;
  const amount = currency === "VND" ? usdToVnd(course.price) : course.price;
  const created = new Date(created_at);
  const expired = new Date(created.getTime() + 15 * 60 * 1000).toISOString();
  return {
    id,
    order_ref: `MBR-${id.toString().padStart(7, "0")}`,
    course_id,
    user_id,
    provider,
    status,
    amount,
    currency,
    provider_order_ref: `${provider.toUpperCase()}-${id}-${course_id}`,
    provider_txn_ref: status === "SUCCESS" || status === "REFUNDED" ? `TXN-${provider}-${id * 13}` : null,
    paid_at,
    expired_at: expired,
    created_at,
    updated_at: paid_at ?? created_at,
    notes,
  };
};

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  tx(7001, 101, 11, "SUCCESS", "momo", "2026-04-05T08:14:00.000Z", "2026-04-05T08:17:33.000Z", "Standard MoMo wallet checkout."),
  tx(7002, 102, 12, "SUCCESS", "momo", "2026-04-06T19:01:00.000Z", "2026-04-06T19:04:42.000Z", "Returning learner second purchase."),
  tx(7003, 103, 13, "SUCCESS", "vnpay", "2026-04-07T11:55:00.000Z", "2026-04-07T11:58:12.000Z", "VNPay ATM card flow."),
  tx(7004, 104, 14, "SUCCESS", "momo", "2026-04-08T03:24:00.000Z", "2026-04-08T03:26:05.000Z", "First-time MoMo learner."),
  tx(7005, 105, 15, "SUCCESS", "stripe", "2026-04-08T15:42:00.000Z", "2026-04-08T15:43:30.000Z", "International Visa, 3DS challenge passed.", "USD"),
  tx(7006, 106, 16, "SUCCESS", "stripe", "2026-04-09T20:11:00.000Z", "2026-04-09T20:12:08.000Z", "Stripe payment from Bogotá.", "USD"),
  tx(7007, 107, 17, "SUCCESS", "stripe", "2026-04-10T07:38:00.000Z", "2026-04-10T07:39:11.000Z", "Helsinki SCA challenge passed.", "USD"),
  tx(7008, 108, 18, "SUCCESS", "vnpay", "2026-04-11T13:02:00.000Z", "2026-04-11T13:05:27.000Z", "Standard VNPay flow."),
  tx(7009, 109, 19, "SUCCESS", "momo", "2026-04-12T16:48:00.000Z", "2026-04-12T16:50:10.000Z", "Promo code MBSPRING applied."),
  tx(7010, 110, 20, "SUCCESS", "stripe", "2026-04-13T05:32:00.000Z", "2026-04-13T05:33:08.000Z", "Card payment, Tallinn.", "USD"),
  tx(7011, 111, 21, "SUCCESS", "stripe", "2026-04-14T09:14:00.000Z", "2026-04-14T09:15:24.000Z", "Visa Platinum payment.", "USD"),
  tx(7012, 112, 22, "SUCCESS", "vnpay", "2026-04-15T11:01:00.000Z", "2026-04-15T11:03:19.000Z", "VNPay direct debit."),
  tx(7013, 101, 23, "SUCCESS", "momo", "2026-04-15T18:45:00.000Z", "2026-04-15T18:48:01.000Z", "Cohort promotion."),
  tx(7014, 104, 24, "SUCCESS", "stripe", "2026-04-16T06:18:00.000Z", "2026-04-16T06:19:11.000Z", "Returning corporate buyer.", "USD"),
  tx(7015, 108, 25, "SUCCESS", "stripe", "2026-04-17T20:30:00.000Z", "2026-04-17T20:31:48.000Z", "Card payment, Santiago.", "USD"),
  tx(7016, 102, 26, "SUCCESS", "vnpay", "2026-04-18T08:01:00.000Z", "2026-04-18T08:02:43.000Z", "Returning learner."),
  tx(7017, 105, 27, "SUCCESS", "momo", "2026-04-19T03:24:00.000Z", "2026-04-19T03:25:12.000Z", "Standard MoMo flow."),
  tx(7018, 109, 28, "PENDING", "momo", "2026-05-17T12:15:00.000Z", null, "Pending wallet confirmation — awaiting OTP."),
  tx(7019, 106, 29, "PENDING", "stripe", "2026-05-17T22:33:00.000Z", null, "Stripe redirect bank approval pending.", "USD"),
  tx(7020, 111, 30, "PENDING", "vnpay", "2026-05-18T00:48:00.000Z", null, "VNPay 3DS in flight."),
  tx(7021, 101, 22, "PENDING", "momo", "2026-05-18T01:09:00.000Z", null, "MoMo QR awaiting bank reflection."),
  tx(7022, 103, 11, "FAILED", "vnpay", "2026-04-22T10:11:00.000Z", null, "Bank declined: insufficient funds (response 51)."),
  tx(7023, 107, 12, "FAILED", "momo", "2026-04-23T17:54:00.000Z", null, "MoMo declined: account not linked."),
  tx(7024, 110, 13, "FAILED", "stripe", "2026-04-24T09:36:00.000Z", null, "Stripe error: insufficient funds.", "USD"),
  tx(7025, 112, 14, "FAILED", "stripe", "2026-04-25T19:20:00.000Z", null, "Stripe error: do_not_honor.", "USD"),
  tx(7026, 102, 15, "FAILED", "momo", "2026-04-26T12:12:00.000Z", null, "MoMo authentication failed 3x."),
  tx(7027, 104, 16, "FAILED", "vnpay", "2026-04-27T15:45:00.000Z", null, "VNPay: card expired."),
  tx(7028, 108, 17, "EXPIRED", "momo", "2026-04-28T11:00:00.000Z", null, "Learner left checkout open past 15-minute window."),
  tx(7029, 105, 18, "EXPIRED", "momo", "2026-05-02T22:21:00.000Z", null, "Order expired without completion."),
  tx(7030, 111, 19, "EXPIRED", "vnpay", "2026-05-04T18:38:00.000Z", null, "VNPay countdown timer hit zero."),
  tx(7031, 109, 20, "EXPIRED", "stripe", "2026-05-08T13:24:00.000Z", null, "Stripe Checkout session expired.", "USD"),
  tx(7032, 103, 21, "REFUNDED", "vnpay", "2026-04-12T14:33:00.000Z", "2026-04-12T14:34:18.000Z", "Refund requested via support ticket #TXN-2031."),
  tx(7033, 101, 22, "REFUNDED", "momo", "2026-04-14T05:55:00.000Z", "2026-04-14T05:56:30.000Z", "Refund: duplicate payment after retry."),
  tx(7034, 110, 23, "REFUNDED", "stripe", "2026-04-15T07:11:00.000Z", "2026-04-15T07:12:01.000Z", "Refund within 7-day window per policy.", "USD"),
  tx(7035, 112, 24, "REFUNDED", "stripe", "2026-04-21T20:48:00.000Z", "2026-04-21T20:49:12.000Z", "Refund: course access never granted.", "USD"),
  tx(7036, 107, 25, "REFUNDED", "stripe", "2026-04-29T09:20:00.000Z", "2026-04-29T09:21:09.000Z", "Refund after disputed charge.", "USD"),
];

// ---------------------------------------------------------------------------
// LIVE SESSIONS — 16 scheduled / live / ended sessions across courses
// ---------------------------------------------------------------------------

const liveSession = (
  id: number,
  courseId: number,
  title: string,
  description: string,
  scheduledAt: string,
  status: LiveSessionStatus,
  startedAt: string | null,
  endedAt: string | null,
): MockLiveSession => {
  const course = MOCK_COURSES.find((c) => c.id === courseId)!;
  const host = MOCK_USERS.find((u) => u.id === course.owner_id)!;
  return {
    id,
    courseId,
    courseTitle: course.title,
    title,
    description,
    hostId: host.id,
    hostName: host.full_name,
    jitsiRoomName: `mb-${course.slug}-${id}`,
    scheduledAt,
    startedAt,
    endedAt,
    status,
    createdAt: scheduledAt,
    updatedAt: endedAt ?? startedAt ?? scheduledAt,
  };
};

export const MOCK_LIVE_SESSIONS: MockLiveSession[] = [
  liveSession(8001, 101, "Office Hours: LoRA Hyperparameters", "Open Q&A on adapter ranks, learning-rate warmup and stability tips.", "2026-05-22T16:00:00.000Z", "scheduled", null, null),
  liveSession(8002, 101, "Live Lab: RAG Evaluation with RAGAS", "Walk-through of a complete RAGAS evaluation harness on a medical QA corpus.", "2026-05-19T14:00:00.000Z", "ended", "2026-05-19T14:02:11.000Z", "2026-05-19T15:48:32.000Z"),
  liveSession(8003, 102, "Live Q&A: Raft Safety Proofs", "Deep dive into safety arguments and quorum intersection.", "2026-05-25T18:30:00.000Z", "scheduled", null, null),
  liveSession(8004, 102, "Chaos Testing Your KV Store", "Live chaos-engineering session against the course KV store.", "2026-05-18T11:00:00.000Z", "live", "2026-05-18T11:00:55.000Z", null),
  liveSession(8005, 103, "Backtest Diagnostics Workshop", "Interactive diagnosis of overfit momentum signals.", "2026-05-21T13:00:00.000Z", "scheduled", null, null),
  liveSession(8006, 104, "Pipeline Walkthrough: ECS Fargate", "End-to-end blue/green pipeline on Fargate.", "2026-05-23T15:00:00.000Z", "scheduled", null, null),
  liveSession(8007, 104, "Cost Optimization Office Hours", "Right-sizing patterns + Savings Plans coverage.", "2026-05-17T10:00:00.000Z", "ended", "2026-05-17T10:03:00.000Z", "2026-05-17T11:14:09.000Z"),
  liveSession(8008, 105, "Lateral Movement Detection Lab", "Hunting lateral movement in a sandbox AD forest.", "2026-05-24T19:00:00.000Z", "scheduled", null, null),
  liveSession(8009, 106, "Design System Roundtable", "Open discussion on governance challenges across teams.", "2026-05-26T17:00:00.000Z", "scheduled", null, null),
  liveSession(8010, 107, "Joint Genotyping Live Walkthrough", "Step-by-step joint genotyping on cohort data.", "2026-05-20T12:00:00.000Z", "ended", "2026-05-20T12:01:50.000Z", "2026-05-20T13:42:08.000Z"),
  liveSession(8011, 108, "Stream Replay and Backfills", "Replay strategies for Kafka + Spark Streaming pipelines.", "2026-05-27T14:00:00.000Z", "scheduled", null, null),
  liveSession(8012, 108, "Adaptive Query Execution Office Hours", "Deep questions on AQE tuning at petabyte scale.", "2026-05-15T09:00:00.000Z", "ended", "2026-05-15T09:02:01.000Z", "2026-05-15T10:18:50.000Z"),
  liveSession(8013, 109, "Governance Tabletop", "Group exercise approving a GenAI pilot.", "2026-05-28T15:30:00.000Z", "scheduled", null, null),
  liveSession(8014, 110, "Cluster Upgrade Drill", "Walkthrough of a fleet upgrade with Argo CD ApplicationSets.", "2026-05-29T12:00:00.000Z", "scheduled", null, null),
  liveSession(8015, 111, "Loss Distribution Approach Walkthrough", "Live LDA exercise on operational risk dataset.", "2026-05-30T16:00:00.000Z", "scheduled", null, null),
  liveSession(8016, 112, "Latency Profiling Workshop", "Hands-on profiling of vision serving stacks.", "2026-05-21T17:00:00.000Z", "scheduled", null, null),
];

// ---------------------------------------------------------------------------
// ENROLLMENTS — 32 join records linking learners to courses
// ---------------------------------------------------------------------------

const enrollment = (
  id: number,
  user_id: number,
  course_id: number,
  enrolled_at: string,
  progress_percent: number,
  status: EnrollmentStatus,
  last_activity_at: string,
  completed_lessons: number,
): MockEnrollment => {
  const courseLessons = MOCK_LESSONS.filter((l) => l.course_id === course_id);
  const currentLesson = courseLessons[Math.min(completed_lessons, courseLessons.length - 1)] ?? null;
  return {
    id,
    user_id,
    course_id,
    enrolled_at,
    progress_percent,
    status,
    last_activity_at,
    current_module_id: currentLesson?.module_id ?? null,
    current_lesson_id: currentLesson?.id ?? null,
    completed_lessons,
  };
};

export const MOCK_ENROLLMENTS: MockEnrollment[] = [
  enrollment(9001, 11, 101, "2026-04-05T08:18:00.000Z", 75, "active", "2026-05-17T20:30:00.000Z", 9),
  enrollment(9002, 11, 102, "2026-04-12T18:00:00.000Z", 45, "active", "2026-05-15T19:00:00.000Z", 5),
  enrollment(9003, 12, 102, "2026-04-06T19:05:00.000Z", 100, "completed", "2026-05-04T21:00:00.000Z", 12),
  enrollment(9004, 12, 111, "2026-04-22T08:00:00.000Z", 35, "active", "2026-05-17T07:00:00.000Z", 4),
  enrollment(9005, 13, 103, "2026-04-07T11:59:00.000Z", 60, "active", "2026-05-16T20:00:00.000Z", 7),
  enrollment(9006, 13, 101, "2026-05-12T08:00:00.000Z", 20, "active", "2026-05-17T13:00:00.000Z", 2),
  enrollment(9007, 14, 104, "2026-04-08T03:30:00.000Z", 92, "active", "2026-05-17T22:00:00.000Z", 11),
  enrollment(9008, 14, 108, "2026-04-30T03:00:00.000Z", 50, "active", "2026-05-16T11:00:00.000Z", 6),
  enrollment(9009, 15, 105, "2026-04-08T15:45:00.000Z", 100, "completed", "2026-05-10T18:00:00.000Z", 12),
  enrollment(9010, 15, 109, "2026-04-29T15:00:00.000Z", 80, "active", "2026-05-17T07:00:00.000Z", 9),
  enrollment(9011, 16, 106, "2026-04-09T20:15:00.000Z", 100, "completed", "2026-05-02T15:00:00.000Z", 12),
  enrollment(9012, 16, 109, "2026-04-27T13:00:00.000Z", 65, "active", "2026-05-17T18:00:00.000Z", 8),
  enrollment(9013, 17, 107, "2026-04-10T07:42:00.000Z", 55, "active", "2026-05-16T16:00:00.000Z", 6),
  enrollment(9014, 17, 110, "2026-05-10T07:30:00.000Z", 25, "active", "2026-05-17T08:00:00.000Z", 3),
  enrollment(9015, 18, 108, "2026-04-11T13:08:00.000Z", 100, "completed", "2026-05-08T15:00:00.000Z", 12),
  enrollment(9016, 18, 109, "2026-05-01T08:00:00.000Z", 70, "active", "2026-05-17T20:00:00.000Z", 8),
  enrollment(9017, 19, 109, "2026-04-12T16:55:00.000Z", 100, "completed", "2026-05-03T21:00:00.000Z", 12),
  enrollment(9018, 19, 104, "2026-04-30T18:00:00.000Z", 40, "active", "2026-05-17T15:00:00.000Z", 5),
  enrollment(9019, 20, 110, "2026-04-13T05:35:00.000Z", 60, "active", "2026-05-16T20:00:00.000Z", 7),
  enrollment(9020, 20, 105, "2026-05-02T05:30:00.000Z", 55, "active", "2026-05-17T19:00:00.000Z", 6),
  enrollment(9021, 21, 111, "2026-04-14T09:18:00.000Z", 85, "active", "2026-05-17T22:00:00.000Z", 10),
  enrollment(9022, 21, 102, "2026-05-04T09:00:00.000Z", 30, "active", "2026-05-15T23:00:00.000Z", 3),
  enrollment(9023, 22, 112, "2026-04-15T11:05:00.000Z", 100, "completed", "2026-05-12T10:00:00.000Z", 12),
  enrollment(9024, 22, 108, "2026-05-09T11:00:00.000Z", 35, "active", "2026-05-17T22:00:00.000Z", 4),
  enrollment(9025, 23, 101, "2026-04-15T18:48:00.000Z", 70, "active", "2026-05-15T11:00:00.000Z", 8),
  enrollment(9026, 23, 106, "2026-05-05T19:00:00.000Z", 50, "active", "2026-05-15T11:00:00.000Z", 6),
  enrollment(9027, 24, 104, "2026-04-16T06:20:00.000Z", 100, "completed", "2026-05-10T12:00:00.000Z", 12),
  enrollment(9028, 24, 111, "2026-05-04T13:00:00.000Z", 25, "active", "2026-05-17T07:00:00.000Z", 3),
  enrollment(9029, 25, 108, "2026-04-17T20:33:00.000Z", 90, "active", "2026-05-16T22:00:00.000Z", 11),
  enrollment(9030, 25, 107, "2026-05-09T20:00:00.000Z", 35, "active", "2026-05-16T23:00:00.000Z", 4),
  enrollment(9031, 26, 102, "2026-04-18T08:05:00.000Z", 100, "completed", "2026-05-09T22:00:00.000Z", 12),
  enrollment(9032, 26, 105, "2026-05-02T03:30:00.000Z", 75, "active", "2026-05-18T05:00:00.000Z", 9),
];

// ---------------------------------------------------------------------------
// INSTRUCTOR VIEWS (denormalized for catalog/detail pages)
// ---------------------------------------------------------------------------

export const MOCK_INSTRUCTOR_VIEWS: MockInstructorView[] = MOCK_USERS
  .filter((u) => u.primary_role === "course_manager")
  .map((u) => ({
    id: u.id,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
    headline: u.headline ?? "",
  }));

// ---------------------------------------------------------------------------
// HELPER QUERIES
// ---------------------------------------------------------------------------

export const getUsersByRole = (role: Role): MockUser[] =>
  MOCK_USERS.filter((u) => u.primary_role === role);

export const getCoursesByOwner = (ownerId: number): MockCourse[] =>
  MOCK_COURSES.filter((c) => c.owner_id === ownerId);

export const getModulesByCourse = (courseId: number): MockModule[] =>
  MOCK_MODULES.filter((m) => m.course_id === courseId).sort((a, b) => a.order_index - b.order_index);

export const getLessonsByCourse = (courseId: number): MockLesson[] =>
  MOCK_LESSONS.filter((l) => l.course_id === courseId);

export const getLessonsByModule = (moduleId: number): MockLesson[] =>
  MOCK_LESSONS.filter((l) => l.module_id === moduleId).sort((a, b) => a.order_index - b.order_index);

export const getQuizQuestionsByCourse = (courseId: number): MockQuizQuestion[] =>
  MOCK_QUIZ_QUESTIONS.filter((q) => q.course_id === courseId);

export const getAssignmentsByCourse = (courseId: number): MockAssignment[] =>
  MOCK_ASSIGNMENTS.filter((a) => a.course_id === courseId);

export const getSubmissionsByAssignment = (assignmentId: number): MockAssignmentSubmission[] =>
  MOCK_ASSIGNMENT_SUBMISSIONS.filter((s) => s.assignment_id === assignmentId);

export const getGradesBySubmission = (submissionId: number): MockGradingRecord[] =>
  MOCK_GRADING_RECORDS.filter((g) => g.submission_id === submissionId);

export const getTransactionsByStatus = (status: TransactionStatus): MockTransaction[] =>
  MOCK_TRANSACTIONS.filter((t) => t.status === status);

export const getTransactionsByCourse = (courseId: number): MockTransaction[] =>
  MOCK_TRANSACTIONS.filter((t) => t.course_id === courseId);

export const getLiveSessionsByCourse = (courseId: number): MockLiveSession[] =>
  MOCK_LIVE_SESSIONS.filter((s) => s.courseId === courseId);

export const getEnrollmentsByUser = (userId: number): MockEnrollment[] =>
  MOCK_ENROLLMENTS.filter((e) => e.user_id === userId);

export const getEnrollmentsByCourse = (courseId: number): MockEnrollment[] =>
  MOCK_ENROLLMENTS.filter((e) => e.course_id === courseId);

// ---------------------------------------------------------------------------
// AGGREGATE STATISTICS (for sanity checks in test assertions)
// ---------------------------------------------------------------------------

export const MOCK_STATS = {
  user_count: MOCK_USERS.length,
  admin_count: getUsersByRole("admin").length,
  course_manager_count: getUsersByRole("course_manager").length,
  learner_count: getUsersByRole("learner").length,
  course_count: MOCK_COURSES.length,
  module_count: MOCK_MODULES.length,
  lesson_count: MOCK_LESSONS.length,
  quiz_question_count: MOCK_QUIZ_QUESTIONS.length,
  assignment_count: MOCK_ASSIGNMENTS.length,
  assignment_submission_count: MOCK_ASSIGNMENT_SUBMISSIONS.length,
  grading_record_count: MOCK_GRADING_RECORDS.length,
  transaction_count: MOCK_TRANSACTIONS.length,
  live_session_count: MOCK_LIVE_SESSIONS.length,
  enrollment_count: MOCK_ENROLLMENTS.length,
} as const;

// ---------------------------------------------------------------------------
// DEFAULT EXPORT — convenient single import surface for tests
// ---------------------------------------------------------------------------

const mockDataset = {
  MOCK_USERS,
  MOCK_TOTP_SEEDS,
  MOCK_COURSES,
  MOCK_MODULES,
  MOCK_LESSONS,
  MOCK_QUIZ_QUESTIONS,
  MOCK_ASSIGNMENTS,
  MOCK_ASSIGNMENT_SUBMISSIONS,
  MOCK_GRADING_RECORDS,
  MOCK_TRANSACTIONS,
  MOCK_LIVE_SESSIONS,
  MOCK_ENROLLMENTS,
  MOCK_INSTRUCTOR_VIEWS,
  MOCK_STATS,
};

export default mockDataset;

