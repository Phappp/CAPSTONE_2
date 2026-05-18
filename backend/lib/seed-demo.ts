/**
 * MindBridge — Live Demo Database Seeder
 *
 * Inserts a production-grade, idempotent demo dataset into the configured
 * MySQL DBMS via TypeORM. Powers the `npm run demo:run` end-to-end suite.
 *
 * Usage:
 *   npm run db:seed                   # full seed (idempotent upsert)
 *   npm run db:seed -- --reset        # also clears prior demo rows first
 *
 * Persona credentials seeded by this script:
 *   Admin           admin.demo@mindbridge.io        Admin#Demo-2026!
 *   Course Manager  teacher.demo@mindbridge.io      Teach#Demo-2026!
 *   Learner         learner.demo@mindbridge.io      Learn#Demo-2026!
 *
 * MFA: 2FA is intentionally DISABLED on all demo users so the spec can run
 * end-to-end without an authenticator app. The MFA Verification step in the
 * demo spec navigates to `/mfa-verify` for visual coverage and immediately
 * resumes the standard login flow.
 */

import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env') });

import bcrypt from 'bcryptjs';
import { Repository, DataSource } from 'typeorm';

import User from '../internal/model/user';
import Role from '../internal/model/role';
import UserRole from '../internal/model/user_roles';
import Course from '../internal/model/course';
import CourseInstructor from '../internal/model/course_instructor';
import Module from '../internal/model/modules';
import Lesson from '../internal/model/lesson';
import Quiz from '../internal/model/quizze';
import QuestionBank from '../internal/model/question_banks';
import BankQuestion from '../internal/model/bank_questions';
import BankQuestionOption from '../internal/model/bank_question_options';
import QuizQuestion from '../internal/model/quiz_question';
import QuestionOption from '../internal/model/question_option';
import Assignment from '../internal/model/assignment';
import LiveSession from '../internal/model/live_session';
import PaymentOrder from '../internal/model/payment_order';
import CourseEnrollment from '../internal/model/course_enrollment';
import CourseManagerVerification from '../internal/model/course_manager_verification';

const RESET = process.argv.includes('--reset');
const SEED_TAG = '[seed-demo]';

const log = (...args: unknown[]) => console.log(SEED_TAG, ...args);

// ---------------------------------------------------------------------------
// Persona definitions
// ---------------------------------------------------------------------------

type DemoUser = {
  email: string;
  password: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  phone_number: string;
  role: 'admin' | 'course_manager' | 'learner';
};

const DEMO_USERS: DemoUser[] = [
  // -------- Hero personas (used by the live-demo spec) --------
  { email: 'admin.demo@mindbridge.io',   password: 'Admin#Demo-2026!',   full_name: 'Aleksandra Iversen',     avatar_url: 'https://cdn.mindbridge.io/avatars/u-1-iversen.webp',     bio: 'Director of Platform Operations. Owns trust & safety, revenue auditing and admin review SLAs.', phone_number: '+46 70 412 8821',   role: 'admin' },
  { email: 'teacher.demo@mindbridge.io', password: 'Teach#Demo-2026!',   full_name: 'Dr. Mei-Lin Chen',       avatar_url: 'https://cdn.mindbridge.io/avatars/u-3-chen.webp',        bio: 'Ph.D. in Machine Learning, Stanford. 9 years building LLM evaluation harnesses at OpenAI and Anthropic.', phone_number: '+1 415 209 7733', role: 'course_manager' },
  { email: 'learner.demo@mindbridge.io', password: 'Learn#Demo-2026!',   full_name: 'Daniel Petrov',          avatar_url: 'https://cdn.mindbridge.io/avatars/u-11-petrov.webp',     bio: 'Backend engineer at a Sofia-based fintech, upskilling on event-driven architectures.', phone_number: '+359 88 412 9920',                  role: 'learner' },

  // -------- Supporting cast --------
  { email: 'rajesh.krishnamurthy@mindbridge.io', password: 'Admin#Bengaluru-2026!', full_name: 'Rajesh Krishnamurthy',  avatar_url: 'https://cdn.mindbridge.io/avatars/u-2-krishnamurthy.webp',  bio: 'Senior Curriculum Auditor overseeing course publication pipeline.',            phone_number: '+91 80 4587 2034',  role: 'admin' },
  { email: 'tobias.lindqvist@mindbridge.io',     password: 'Teach#Distributed-2026!', full_name: 'Prof. Tobias Lindqvist', avatar_url: 'https://cdn.mindbridge.io/avatars/u-4-lindqvist.webp',     bio: 'Associate Professor, ETH Zürich. Maintainer of two Raft implementations.',   phone_number: '+41 44 632 7811',   role: 'course_manager' },
  { email: 'adaeze.okonkwo@mindbridge.io',       password: 'Teach#QuantFinance-2026!', full_name: 'Dr. Adaeze Okonkwo',  avatar_url: 'https://cdn.mindbridge.io/avatars/u-5-okonkwo.webp',     bio: 'Quantitative Finance Lecturer at LSE. Former Senior Quant at Goldman Sachs.', phone_number: '+44 20 7405 9210', role: 'course_manager' },
  { email: 'marcus.friedrich@mindbridge.io',     password: 'Teach#CloudArch-2026!',  full_name: 'Marcus Friedrich',       avatar_url: 'https://cdn.mindbridge.io/avatars/u-6-friedrich.webp',    bio: 'Senior Cloud Architect, 12 years AWS Pro Services + HashiCorp consulting.',  phone_number: '+49 30 5489 1102',  role: 'course_manager' },
  { email: 'yuna.park@mindbridge.io',            password: 'Teach#Cybersec-2026!',   full_name: 'Dr. Yuna Park',          avatar_url: 'https://cdn.mindbridge.io/avatars/u-7-park.webp',         bio: 'Cybersecurity researcher at KAIST. Disclosed 14 OIDC CVEs.',                 phone_number: '+82 42 350 4419',   role: 'course_manager' },
  { email: 'carla.henriques@mindbridge.io',      password: 'Teach#Design-2026!',     full_name: 'Carla Henriques',        avatar_url: 'https://cdn.mindbridge.io/avatars/u-8-henriques.webp',    bio: 'Principal Product Designer — ex Spotify Encore design system lead.',         phone_number: '+351 21 388 5572',  role: 'course_manager' },
  { email: 'hossein.mahmoudi@mindbridge.io',     password: 'Teach#Bioinfo-2026!',    full_name: 'Dr. Hossein Mahmoudi',   avatar_url: 'https://cdn.mindbridge.io/avatars/u-9-mahmoudi.webp',     bio: 'Bioinformatics Group Leader, EPFL. Co-author of 38 peer-reviewed papers.',  phone_number: '+41 21 693 4480',   role: 'course_manager' },
  { email: 'bhargavi.subramanian@mindbridge.io', password: 'Teach#DataEng-2026!',    full_name: 'Dr. Bhargavi Subramanian', avatar_url: 'https://cdn.mindbridge.io/avatars/u-10-subramanian.webp', bio: 'Staff Data Engineer, IBM Research. Built petabyte-scale Spark + Kafka ingestion.', phone_number: '+91 80 2204 3318', role: 'course_manager' },
  { email: 'noor.kassem@mindbridge.io',          password: 'Teach#GenAIOps-2026!',   full_name: 'Noor Kassem',            avatar_url: 'https://cdn.mindbridge.io/avatars/u-cm-kassem.webp',      bio: 'Director of Applied AI at a Series C fintech. 7 years shipping LLM-backed products.', phone_number: '+971 4 207 4413', role: 'course_manager' },

  // -------- Learners (20) --------
  { email: 'anais.lefebvre@mindbridge.io',       password: 'Learn#Paris-2026!',      full_name: 'Anaïs Lefebvre',        avatar_url: 'https://cdn.mindbridge.io/avatars/u-12-lefebvre.webp',   bio: 'Master\'s student at École Polytechnique, applied math for finance.',         phone_number: '+33 1 69 33 41 80',  role: 'learner' },
  { email: 'ravi.iyer@mindbridge.io',            password: 'Learn#Chennai-2026!',    full_name: 'Ravi Iyer',             avatar_url: 'https://cdn.mindbridge.io/avatars/u-13-iyer.webp',       bio: 'Software engineer at Freshworks, pivoting into ML platform work.',           phone_number: '+91 98 4012 8090',    role: 'learner' },
  { email: 'mei.tanaka@mindbridge.io',           password: 'Learn#Osaka-2026!',      full_name: 'Mei Tanaka',            avatar_url: 'https://cdn.mindbridge.io/avatars/u-14-tanaka.webp',     bio: 'Data analyst at Rakuten Osaka, moving into data engineering.',               phone_number: '+81 6 6122 4408',     role: 'learner' },
  { email: 'khalid.almansour@mindbridge.io',     password: 'Learn#Riyadh-2026!',     full_name: 'Khalid Al-Mansour',     avatar_url: 'https://cdn.mindbridge.io/avatars/u-15-almansour.webp',  bio: 'Risk analyst at Saudi National Bank, exploring Python automation.',          phone_number: '+966 11 425 7791',    role: 'learner' },
  { email: 'sofia.vargas@mindbridge.io',         password: 'Learn#Bogota-2026!',     full_name: 'Sofía Vargas',          avatar_url: 'https://cdn.mindbridge.io/avatars/u-16-vargas.webp',     bio: 'Product manager at Rappi, focusing on LLM-powered product experiences.',     phone_number: '+57 1 743 0982',      role: 'learner' },
  { email: 'lukas.nieminen@mindbridge.io',       password: 'Learn#Helsinki-2026!',   full_name: 'Lukas Nieminen',        avatar_url: 'https://cdn.mindbridge.io/avatars/u-17-nieminen.webp',   bio: 'SRE at Wolt, preparing for the CKA exam.',                                   phone_number: '+358 9 8519 4421',    role: 'learner' },
  { email: 'chiamaka.eze@mindbridge.io',         password: 'Learn#Lagos-2026!',      full_name: 'Chiamaka Eze',          avatar_url: 'https://cdn.mindbridge.io/avatars/u-18-eze.webp',        bio: 'Founder of a YC-backed health-tech startup evaluating LLM features.',        phone_number: '+234 1 270 8814',     role: 'learner' },
  { email: 'emanuele.ricci@mindbridge.io',       password: 'Learn#Milan-2026!',      full_name: 'Emanuele Ricci',        avatar_url: 'https://cdn.mindbridge.io/avatars/u-19-ricci.webp',      bio: 'DevOps engineer at YOOX Net-a-Porter, planning EC2 to EKS migration.',       phone_number: '+39 02 8732 4501',    role: 'learner' },
  { email: 'hanna.kovaleva@mindbridge.io',       password: 'Learn#Tallinn-2026!',    full_name: 'Hanna Kovaleva',        avatar_url: 'https://cdn.mindbridge.io/avatars/u-20-kovaleva.webp',   bio: 'Security analyst at the Estonian Information System Authority.',             phone_number: '+372 663 0421',       role: 'learner' },
  { email: 'theo.vasiliou@mindbridge.io',        password: 'Learn#Athens-2026!',     full_name: 'Theo Vasiliou',         avatar_url: 'https://cdn.mindbridge.io/avatars/u-21-vasiliou.webp',   bio: 'MSc graduate, NTUA. Focused on systems programming and concurrency.',        phone_number: '+30 21 0772 4581',    role: 'learner' },
  { email: 'aarav.sharma@mindbridge.io',         password: 'Learn#Mumbai-2026!',     full_name: 'Aarav Sharma',          avatar_url: 'https://cdn.mindbridge.io/avatars/u-22-sharma.webp',     bio: 'Data scientist at Razorpay, reviewing ML engineering fundamentals.',         phone_number: '+91 22 6181 3320',    role: 'learner' },
  { email: 'lucia.moretti@mindbridge.io',        password: 'Learn#Naples-2026!',     full_name: 'Lucia Moretti',         avatar_url: 'https://cdn.mindbridge.io/avatars/u-23-moretti.webp',    bio: 'UX designer at AlmavivA, leading the unified design-system initiative.',     phone_number: '+39 081 552 7708',    role: 'learner' },
  { email: 'noor.hadid@mindbridge.io',           password: 'Learn#Dubai-2026!',      full_name: 'Noor Hadid',            avatar_url: 'https://cdn.mindbridge.io/avatars/u-24-hadid.webp',      bio: 'Fintech BA at Mashreq Bank.',                                               phone_number: '+971 4 207 5499',     role: 'learner' },
  { email: 'tomas.salinas@mindbridge.io',        password: 'Learn#Santiago-2026!',   full_name: 'Tomás Salinas',         avatar_url: 'https://cdn.mindbridge.io/avatars/u-25-salinas.webp',    bio: 'Bioinformatics MSc student, Universidad de Chile.',                          phone_number: '+56 2 2978 6512',     role: 'learner' },
  { email: 'jiwon.lee@mindbridge.io',            password: 'Learn#Seoul-2026!',      full_name: 'Ji-Won Lee',            avatar_url: 'https://cdn.mindbridge.io/avatars/u-26-lee.webp',         bio: 'Security engineer at Coupang, rotating into offensive security.',           phone_number: '+82 2 1577 4029',     role: 'learner' },
  { email: 'priya.nair@mindbridge.io',           password: 'Learn#Kochi-2026!',      full_name: 'Priya Nair',            avatar_url: 'https://cdn.mindbridge.io/avatars/u-27-nair.webp',        bio: 'ML engineer at IBM Kochi, investigating responsible-AI evaluation suites.', phone_number: '+91 484 4012 1109',   role: 'learner' },
  { email: 'olu.adebayo@mindbridge.io',          password: 'Learn#Accra-2026!',      full_name: 'Olu Adebayo',           avatar_url: 'https://cdn.mindbridge.io/avatars/u-28-adebayo.webp',     bio: 'Full-stack freelancer building agriculture-finance dashboards.',             phone_number: '+233 30 274 6620',    role: 'learner' },
  { email: 'camille.beauchamp@mindbridge.io',    password: 'Learn#Montreal-2026!',   full_name: 'Camille Beauchamp',     avatar_url: 'https://cdn.mindbridge.io/avatars/u-29-beauchamp.webp',   bio: 'Computer vision research intern at Mila.',                                   phone_number: '+1 514 398 7720',     role: 'learner' },
  { email: 'phuong.bui@mindbridge.io',           password: 'Learn#Hanoi-2026!',      full_name: 'Phuong Bui',            avatar_url: 'https://cdn.mindbridge.io/avatars/u-30-bui.webp',         bio: 'Software engineer at FPT Software, aiming for AWS SA Professional.',         phone_number: '+84 24 7300 2241',    role: 'learner' },
  { email: 'isabela.duarte@mindbridge.io',       password: 'Learn#Lisbon-2026!',     full_name: 'Isabela Duarte',        avatar_url: 'https://cdn.mindbridge.io/avatars/u-31-duarte.webp',      bio: 'Cloud engineer at Critical TechWorks. Studying Kubernetes operations.',     phone_number: '+351 21 458 7720',    role: 'learner' },
];

// ---------------------------------------------------------------------------
// Course definitions
// ---------------------------------------------------------------------------

type ModuleSpec = {
  title: string;
  description: string;
  lessons: { title: string; lesson_type: 'video' | 'text' | 'quiz' | 'assignment'; duration_minutes: number; description: string }[];
};

type DemoCourse = {
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  thumbnail_url: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  language: 'en' | 'vi';
  price: number;
  has_certificate: boolean;
  estimated_hours: number;
  tags: string[];
  learning_objectives: string[];
  prerequisites: string[];
  owner_email: string;
  status: 'published' | 'pending_review';
  modules: [ModuleSpec, ModuleSpec, ModuleSpec, ModuleSpec];
  quiz: {
    question_text: string;
    explanation: string;
    options: { text: string; correct: boolean }[];
  }[];
  assignment: {
    title: string;
    description: string;
    instructions: string;
    max_score: number;
    passing_score: number;
  };
};

const baseModules = (slugStem: string, topics: string[]): ModuleSpec[] => topics.map((topic, idx) => ({
  title: `Module ${idx + 1} · ${topic}`,
  description: `Hands-on coverage of ${topic.toLowerCase()} with reproducible labs.`,
  lessons: [
    { title: `${topic}: Foundations`,          lesson_type: 'video',      duration_minutes: 28, description: `Annotated walkthrough of the core ${topic.toLowerCase()} concepts.` },
    { title: `${topic}: Reading & Worksheet`,  lesson_type: 'text',       duration_minutes: 22, description: `Curated reading with worksheet exercises on ${topic.toLowerCase()}.` },
    { title: `${topic}: Knowledge Check`,      lesson_type: 'quiz',       duration_minutes: 18, description: `20-question gated quiz before progressing past ${topic.toLowerCase()}.` },
  ],
}));

const DEMO_COURSES: DemoCourse[] = [
  {
    slug: 'generative-ai-foundations-llm-fine-tuning',
    title: 'Generative AI Foundations & LLM Fine-Tuning',
    short_description: 'Build, fine-tune and evaluate production-grade LLMs end-to-end with PyTorch and Hugging Face.',
    full_description: 'A 10-week applied curriculum covering Transformer internals, parameter-efficient fine-tuning (LoRA, QLoRA), Retrieval-Augmented Generation, RLHF/DPO alignment, and rigorous evaluation harnesses.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-101-genai.webp',
    level: 'advanced', category: 'AI & Machine Learning', language: 'en', price: 149.99, has_certificate: true, estimated_hours: 42,
    tags: ['LLM', 'Fine-Tuning', 'RAG', 'PyTorch'],
    learning_objectives: [
      'Read and modify Transformer architectures at the attention-head level.',
      'Apply LoRA and QLoRA for memory-efficient fine-tuning on a single A100.',
      'Design a retrieval pipeline with hybrid BM25 + dense embeddings.',
      'Score model alignment with reward models and DPO training loops.',
    ],
    prerequisites: ['Comfortable with Python (NumPy, dataclasses).', 'Working knowledge of supervised learning.'],
    owner_email: 'teacher.demo@mindbridge.io',
    status: 'published',
    modules: baseModules('genai', ['Transformer Foundations', 'Parameter-Efficient Fine-Tuning', 'Retrieval-Augmented Generation', 'Alignment & Evaluation']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Which component of the Transformer enables modeling pairwise token relationships without recurrence?', explanation: 'Self-attention computes pairwise affinities across the sequence.', options: [{ text: 'Self-attention', correct: true }, { text: 'LSTM gate', correct: false }, { text: 'Convolution', correct: false }, { text: 'Highway network', correct: false }] },
      { question_text: 'Why does LoRA freeze the base weights and inject low-rank update matrices?', explanation: 'LoRA trains rank-r updates while keeping the dense backbone frozen.', options: [{ text: 'To reduce trainable parameters and memory cost', correct: true }, { text: 'To increase batch size to 8192', correct: false }, { text: 'To avoid attention dropout', correct: false }, { text: 'To eliminate gradient clipping', correct: false }] },
      { question_text: 'Which quantization scheme does QLoRA depend on for 4-bit storage of base weights?', explanation: 'QLoRA uses NF4 to store the frozen base.', options: [{ text: 'NF4 (NormalFloat 4-bit)', correct: true }, { text: 'INT8 only', correct: false }, { text: 'Float64', correct: false }, { text: 'BF32', correct: false }] },
      { question_text: 'Direct Preference Optimization (DPO) removes which component required by PPO?', explanation: 'DPO derives a closed-form preference loss without an explicit reward model.', options: [{ text: 'Explicit reward model and rollouts', correct: true }, { text: 'Tokenizer', correct: false }, { text: 'Optimizer', correct: false }, { text: 'Mixed-precision training', correct: false }] },
      { question_text: 'Which retrieval scheme typically wins on recall for keyword-heavy queries?', explanation: 'BM25 excels on exact term matching.', options: [{ text: 'BM25 sparse retrieval', correct: true }, { text: 'Dense bi-encoder', correct: false }, { text: 'Random sampling', correct: false }, { text: 'Cosine on token IDs', correct: false }] },
    ],
    assignment: { title: 'Fine-Tune Mistral-7B for Domain QA', description: 'Apply QLoRA to fine-tune Mistral-7B on the supplied medical QA corpus. Deliver a 5-page PDF report covering dataset prep, training curves, eval metrics and a hosted demo link.', instructions: '1. Dataset cleaning and deduplication.\n2. QLoRA configuration with NF4 + bf16 compute.\n3. Held-out evaluation with confidence intervals.\n4. Risks and ethical considerations.\n5. Reproducible run script.', max_score: 100, passing_score: 70 },
  },
  {
    slug: 'advanced-distributed-systems-with-go',
    title: 'Advanced Distributed Systems with Go',
    short_description: 'Engineer fault-tolerant distributed systems in Go: consensus, replication, idempotency, observability.',
    full_description: 'An advanced systems-engineering course taught in Go. Implement Raft from scratch, design idempotent APIs, run chaos experiments against a sharded KV store and instrument the pipeline with OpenTelemetry.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-102-distributed.webp',
    level: 'advanced', category: 'Tech Stack Mastery', language: 'en', price: 169.99, has_certificate: true, estimated_hours: 38,
    tags: ['Go', 'Raft', 'gRPC', 'Observability'],
    learning_objectives: ['Implement a Raft consensus module.', 'Design idempotent APIs.', 'Diagnose tail latency with traces.', 'Run controlled chaos failure injection.'],
    prerequisites: ['12 months of Go or systems engineering experience.'],
    owner_email: 'tobias.lindqvist@mindbridge.io',
    status: 'published',
    modules: baseModules('distsys', ['Foundations & CAP', 'Raft from Scratch', 'Sharded KV Store', 'Observability & SLOs']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Under CAP, what does a leader-based Raft cluster sacrifice during a partition?', explanation: 'Raft remains consistent but loses availability on the minority side.', options: [{ text: 'Availability on the minority partition', correct: true }, { text: 'Consistency', correct: false }, { text: 'Persistence', correct: false }, { text: 'Durability', correct: false }] },
      { question_text: 'Which timing assumption does Raft rely on for liveness?', explanation: 'Safety holds asynchronously; liveness requires partial synchrony.', options: [{ text: 'Partial synchrony', correct: true }, { text: 'Strong synchrony', correct: false }, { text: 'Pure asynchrony', correct: false }, { text: 'Bounded message size only', correct: false }] },
      { question_text: 'What does an error budget represent?', explanation: 'It is the allowed unreliability before slowing risky changes.', options: [{ text: 'Allowed unreliability before slowing changes', correct: true }, { text: 'Incident SLA', correct: false }, { text: 'Retry quota', correct: false }, { text: 'Logging quota', correct: false }] },
      { question_text: 'In Raft, what is the role of the term number?', explanation: 'Terms monotonically distinguish leaders and stale messages.', options: [{ text: 'A logical clock distinguishing leaders', correct: true }, { text: 'A physical timestamp', correct: false }, { text: 'A unique log offset', correct: false }, { text: 'A shard ID', correct: false }] },
      { question_text: 'Which OpenTelemetry signal best diagnoses cross-service tail-latency regressions?', explanation: 'Traces show per-span latency end-to-end.', options: [{ text: 'Distributed traces with span events', correct: true }, { text: 'Logs only', correct: false }, { text: 'Static graphs', correct: false }, { text: 'Counters only', correct: false }] },
    ],
    assignment: { title: 'Pass the Raft Linearizability Test Suite', description: 'Submit a Go Raft implementation that passes the linearizability harness shipped with the course.', instructions: 'Implement leader election, log replication, snapshotting and reconfiguration. Pass all 200 chaos cases.', max_score: 100, passing_score: 70 },
  },
  {
    slug: 'financial-analytics-with-python-pandas',
    title: 'Financial Analytics with Python & Pandas',
    short_description: 'Apply quantitative analytics on real market data: factor modeling, backtesting and risk reporting.',
    full_description: 'Practitioner-led curriculum bridging finance theory with Python tooling. Build a clean factor data pipeline, design statistical signals, backtest with vectorbt and ship a publication-quality risk report.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-103-finance.webp',
    level: 'intermediate', category: 'Business Strategy', language: 'en', price: 89.99, has_certificate: true, estimated_hours: 28,
    tags: ['Python', 'Pandas', 'Quant'],
    learning_objectives: ['Engineer point-in-time correct factor datasets.', 'Run cross-sectional regressions.', 'Construct portfolio backtests.', 'Generate VaR and ES reports.'],
    prerequisites: ['Comfortable reading basic financial statements.'],
    owner_email: 'adaeze.okonkwo@mindbridge.io',
    status: 'published',
    modules: baseModules('finance', ['Clean Market Data', 'Factor Modeling', 'Backtesting', 'Risk Reporting']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Survivorship bias most often causes backtest results to:', explanation: 'Failed firms drop out and overstate returns.', options: [{ text: 'Look better than reality', correct: true }, { text: 'Look worse than reality', correct: false }, { text: 'Stay unbiased', correct: false }, { text: 'Reduce variance', correct: false }] },
      { question_text: 'Which library is canonical for vectorized backtesting?', explanation: 'vectorbt is built around vectorized portfolio simulation.', options: [{ text: 'vectorbt', correct: true }, { text: 'scikit-image', correct: false }, { text: 'fastai', correct: false }, { text: 'PyTorch', correct: false }] },
      { question_text: 'Which VaR method assumes a multivariate normal P&L distribution?', explanation: 'Parametric VaR assumes joint normality.', options: [{ text: 'Parametric VaR', correct: true }, { text: 'Historical VaR', correct: false }, { text: 'Monte Carlo with bootstrapped residuals', correct: false }, { text: 'Expected Shortfall', correct: false }] },
      { question_text: 'Why does Expected Shortfall (ES) often replace VaR for risk reporting?', explanation: 'ES is a coherent risk measure.', options: [{ text: 'ES is coherent (subadditive)', correct: true }, { text: 'ES is easier to compute', correct: false }, { text: 'ES needs fewer points', correct: false }, { text: 'ES ignores tails', correct: false }] },
      { question_text: 'A Sharpe ratio is widely considered investment-grade above:', explanation: '>1.0 net-of-cost is the bar for paper strategies.', options: [{ text: 'Above 1.0', correct: true }, { text: 'Above 0.2', correct: false }, { text: 'Above 3.0 always', correct: false }, { text: 'Negative', correct: false }] },
    ],
    assignment: { title: 'Build and Validate a Momentum Factor', description: 'Engineer and validate a 12-1 momentum factor on US equities. Submit ICs, IC autocorrelation diagnostics, and a 4-page report.', instructions: 'Reconstruct PIT universe; compute 12-1 momentum; report IC, IC IR, decile spreads; document caveats.', max_score: 100, passing_score: 75 },
  },
  {
    slug: 'cloud-native-microservices-on-aws',
    title: 'Cloud-Native Microservices on AWS',
    short_description: 'Design, deploy and operate production microservices on AWS with ECS Fargate, EKS and Terraform.',
    full_description: 'Pragmatic AWS architecture course built around a real e-commerce reference application.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-104-aws.webp',
    level: 'intermediate', category: 'Tech Stack Mastery', language: 'en', price: 129.99, has_certificate: true, estimated_hours: 36,
    tags: ['AWS', 'Microservices', 'Terraform'],
    learning_objectives: ['Design service boundaries with DDD.', 'Provision multi-region infra.', 'Run blue/green deployments.', 'Tune cost with Savings Plans.'],
    prerequisites: ['Familiarity with Docker and AWS free tier.'],
    owner_email: 'marcus.friedrich@mindbridge.io',
    status: 'published',
    modules: baseModules('aws', ['Service Decomposition', 'Infrastructure as Code', 'Deployment Pipelines', 'Observability & Cost']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Which AWS service runs containers without managing EC2 hosts?', explanation: 'Fargate is AWS\'s serverless container compute.', options: [{ text: 'Fargate', correct: true }, { text: 'EC2 Auto Scaling', correct: false }, { text: 'RDS', correct: false }, { text: 'S3', correct: false }] },
      { question_text: 'Terraform Cloud workspaces primarily isolate:', explanation: 'Workspaces isolate state, variables and execution.', options: [{ text: 'State, variables, execution per environment', correct: true }, { text: 'VPC CIDRs', correct: false }, { text: 'Container images', correct: false }, { text: 'EBS volumes', correct: false }] },
      { question_text: 'Which service emits AWS Cost & Usage data?', explanation: 'CUR is the canonical FinOps source.', options: [{ text: 'AWS Cost & Usage Report (CUR)', correct: true }, { text: 'Trusted Advisor', correct: false }, { text: 'CloudFront', correct: false }, { text: 'CodeBuild', correct: false }] },
      { question_text: 'Which deployment strategy gradually shifts traffic between two task sets?', explanation: 'Blue/green allows progressive cutover.', options: [{ text: 'Blue/green with weighted shifting', correct: true }, { text: 'Recreate', correct: false }, { text: 'In-place rolling', correct: false }, { text: 'Big-bang deploy', correct: false }] },
      { question_text: 'Which control enforces least-privilege at the task level?', explanation: 'Per-task IAM roles scope permissions precisely.', options: [{ text: 'Task roles per service', correct: true }, { text: 'Root key', correct: false }, { text: 'Public buckets', correct: false }, { text: 'Static env credentials', correct: false }] },
    ],
    assignment: { title: 'Provision a Reference VPC with Terraform', description: 'Author a Terraform module that provisions a 3-AZ VPC with public/private/ML subnets, NAT egress and VPC endpoints.', instructions: 'Submit module + terraform plan output + 2-page design note.', max_score: 100, passing_score: 75 },
  },
  {
    slug: 'modern-cybersecurity-zero-trust-threat-hunting',
    title: 'Modern Cybersecurity: Zero-Trust & Threat Hunting',
    short_description: 'Implement Zero-Trust, hunt threats in SIEM data and orchestrate incident response.',
    full_description: 'Offensive-aware defensive curriculum: identity-first Zero-Trust controls, hunt hypotheses, MITRE ATT&CK mapping, and tabletop incident response.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-105-cybersec.webp',
    level: 'advanced', category: 'Tech Stack Mastery', language: 'en', price: 139.99, has_certificate: true, estimated_hours: 34,
    tags: ['Cybersecurity', 'Zero Trust', 'Threat Hunting'],
    learning_objectives: ['Translate Zero-Trust to policy enforcement.', 'Build ATT&CK-aligned hunts.', 'Detect post-exploitation in Sysmon/Zeek.', 'Run tabletop IR drills.'],
    prerequisites: ['Basic Linux + networking fundamentals.'],
    owner_email: 'yuna.park@mindbridge.io',
    status: 'published',
    modules: baseModules('cyber', ['Zero-Trust Architecture', 'Threat Hunting Fundamentals', 'SIEM Engineering', 'Incident Response']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Which principle is the foundation of Zero-Trust?', explanation: 'Zero-Trust assumes breach and verifies every request.', options: [{ text: 'Never trust, always verify', correct: true }, { text: 'Allow LAN by default', correct: false }, { text: 'VPN is enough', correct: false }, { text: 'Single perimeter defense', correct: false }] },
      { question_text: 'Which framework provides a taxonomy for adversary techniques?', explanation: 'ATT&CK enumerates tactics and techniques.', options: [{ text: 'MITRE ATT&CK', correct: true }, { text: 'ISO 9001', correct: false }, { text: 'ITIL', correct: false }, { text: 'COBIT', correct: false }] },
      { question_text: 'Which telemetry source captures process execution metadata on Windows?', explanation: 'Sysmon EID 1 logs process creation.', options: [{ text: 'Sysmon Event ID 1', correct: true }, { text: 'DHCP logs', correct: false }, { text: 'SMB shares', correct: false }, { text: 'DNS zone transfers', correct: false }] },
      { question_text: 'Which class of attack does PKI-based mTLS most directly mitigate?', explanation: 'mTLS authenticates both sides.', options: [{ text: 'Service-to-service impersonation', correct: true }, { text: 'Disk wiping', correct: false }, { text: 'Kernel panic', correct: false }, { text: 'Power outage', correct: false }] },
      { question_text: 'Which CVSS metric reflects whether an attacker needs local access?', explanation: 'Attack Vector enumerates network/adjacent/local/physical.', options: [{ text: 'Attack Vector', correct: true }, { text: 'Confidentiality Impact', correct: false }, { text: 'Scope', correct: false }, { text: 'Privileges Required', correct: false }] },
    ],
    assignment: { title: 'Hunt Playbook for MITRE T1059', description: 'Develop a hunt playbook detecting suspicious PowerShell + cmd.exe usage.', instructions: 'Submit Sigma rules, Splunk SPL, KQL fallback, and a 3-page narrative.', max_score: 100, passing_score: 70 },
  },
  {
    slug: 'product-led-ux-design-systems-for-scale',
    title: 'Product-Led UX: Design Systems for Scale',
    short_description: 'Build a token-driven design system in Figma that ships to React and survives 5 product teams.',
    full_description: 'A senior designer\'s playbook for taking a design system from one product to a multi-surface platform.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-106-ux.webp',
    level: 'intermediate', category: 'Design & UX', language: 'en', price: 79.99, has_certificate: true, estimated_hours: 22,
    tags: ['Design Systems', 'Figma', 'Tokens'],
    learning_objectives: ['Author multi-mode design tokens.', 'Build a robust Figma library.', 'Generate platform stylesheets with Style Dictionary.', 'Run quarterly governance rituals.'],
    prerequisites: ['2+ years of product design experience.'],
    owner_email: 'carla.henriques@mindbridge.io',
    status: 'published',
    modules: baseModules('ux', ['Design Tokens', 'Figma Library Architecture', 'Code Integration', 'Governance']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Primitive tokens are best described as:', explanation: 'Primitives store raw atoms.', options: [{ text: 'Raw values like specific colors or pixel sizes', correct: true }, { text: 'Themed semantic aliases', correct: false }, { text: 'Component states', correct: false }, { text: 'User intents', correct: false }] },
      { question_text: 'Which WCAG contrast ratio is required for body text at AA?', explanation: 'WCAG AA requires 4.5:1 for body text.', options: [{ text: '4.5:1', correct: true }, { text: '1.5:1', correct: false }, { text: '2.0:1', correct: false }, { text: '3.0:1', correct: false }] },
      { question_text: 'Which tool transforms design tokens into platform-specific outputs?', explanation: 'Style Dictionary produces CSS, Swift, Android tokens.', options: [{ text: 'Style Dictionary', correct: true }, { text: 'Premiere Pro', correct: false }, { text: 'Audacity', correct: false }, { text: 'ImageOptim', correct: false }] },
      { question_text: 'Which Figma feature swaps themes via boolean / enum modes?', explanation: 'Variables with multi-modes drive theming.', options: [{ text: 'Variables with multiple modes', correct: true }, { text: 'Stickers', correct: false }, { text: 'Plug-in marketplace', correct: false }, { text: 'Frame masks', correct: false }] },
      { question_text: 'Which governance model best scales contribution?', explanation: 'Federated balances autonomy and consistency.', options: [{ text: 'Federated with core-team stewardship', correct: true }, { text: 'Single owner, no contributions', correct: false }, { text: 'Open free-for-all', correct: false }, { text: 'Marketing-led only', correct: false }] },
    ],
    assignment: { title: 'Publish a Form Components Library', description: 'Build and publish a Figma library covering form components with multi-mode tokens.', instructions: 'Deliver Figma file + Style Dictionary export + migration notes.', max_score: 100, passing_score: 70 },
  },
  {
    slug: 'applied-bioinformatics-genome-pipelines',
    title: 'Applied Bioinformatics: Genome Pipelines',
    short_description: 'Build reproducible genome pipelines with Nextflow, GATK and modern cloud storage.',
    full_description: 'From FASTQ to variant call: quality control, alignment, variant calling, annotation, and reproducibility.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-107-bioinfo.webp',
    level: 'intermediate', category: 'AI & Machine Learning', language: 'en', price: 109.99, has_certificate: true, estimated_hours: 30,
    tags: ['Bioinformatics', 'Nextflow', 'GATK'],
    learning_objectives: ['Run end-to-end germline variant calling.', 'Author Nextflow DSL2 pipelines.', 'Track provenance.', 'Annotate variants with VEP.'],
    prerequisites: ['Comfortable on a Linux command line.'],
    owner_email: 'hossein.mahmoudi@mindbridge.io',
    status: 'published',
    modules: baseModules('bioinfo', ['Quality Control', 'Alignment', 'Variant Calling', 'Annotation & Reporting']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Which FASTQ quality encoding is standard for modern Illumina data?', explanation: 'Phred+33 is the de facto encoding.', options: [{ text: 'Phred+33', correct: true }, { text: 'Phred+64', correct: false }, { text: 'Solexa-32', correct: false }, { text: 'ASCII+0', correct: false }] },
      { question_text: 'Which aligner is most commonly used for short-read DNA-seq?', explanation: 'BWA-MEM2 is the modern default.', options: [{ text: 'BWA-MEM2', correct: true }, { text: 'DIAMOND', correct: false }, { text: 'STAR', correct: false }, { text: 'BLAST', correct: false }] },
      { question_text: 'Which variant caller is GATK Best Practices for germline?', explanation: 'HaplotypeCaller in GVCF mode.', options: [{ text: 'HaplotypeCaller (GVCF)', correct: true }, { text: 'Strelka2 somatic-only', correct: false }, { text: 'Manta SV only', correct: false }, { text: 'CollectWgsMetrics', correct: false }] },
      { question_text: 'Which annotation tool is canonical for variant consequence prediction?', explanation: 'VEP annotates consequence and clinical relevance.', options: [{ text: 'Ensembl VEP', correct: true }, { text: 'FreeBayes', correct: false }, { text: 'MarkDuplicates', correct: false }, { text: 'BCFtools call', correct: false }] },
      { question_text: 'Which database aggregates population allele frequencies?', explanation: 'gnomAD aggregates large-cohort frequencies.', options: [{ text: 'gnomAD', correct: true }, { text: 'ENA', correct: false }, { text: 'GitHub', correct: false }, { text: 'Wikipedia', correct: false }] },
    ],
    assignment: { title: 'Build a Sample-Level QC Report', description: 'Generate per-sample QC for a 30x WGS sample.', instructions: 'Submit MultiQC report + 2-page narrative.', max_score: 100, passing_score: 70 },
  },
  {
    slug: 'data-engineering-with-apache-spark-kafka',
    title: 'Data Engineering with Apache Spark & Kafka',
    short_description: 'Design petabyte-scale lakehouses that ingest, transform and serve data with sub-second latency.',
    full_description: 'Hands-on data engineering with Spark 3.5 Structured Streaming, Kafka, Delta Lake and Airflow 2.9.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-108-dataeng.webp',
    level: 'advanced', category: 'Tech Stack Mastery', language: 'en', price: 159.99, has_certificate: true, estimated_hours: 40,
    tags: ['Spark', 'Kafka', 'Delta Lake', 'Airflow'],
    learning_objectives: ['Architect medallion lakehouses.', 'Tune Spark joins at scale.', 'Run exactly-once streams.', 'Operate Airflow with SLAs.'],
    prerequisites: ['Working Python and SQL knowledge.'],
    owner_email: 'bhargavi.subramanian@mindbridge.io',
    status: 'published',
    modules: baseModules('dataeng', ['Lakehouse Foundations', 'Spark at Scale', 'Kafka Streaming', 'Orchestration']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Which storage layer adds ACID transactions over Parquet?', explanation: 'Delta Lake adds ACID + time travel.', options: [{ text: 'Delta Lake', correct: true }, { text: 'Raw S3 only', correct: false }, { text: 'HDFS without metadata', correct: false }, { text: 'Plain CSV', correct: false }] },
      { question_text: 'Which Spark feature dynamically coalesces shuffle partitions?', explanation: 'AQE adjusts plans at runtime.', options: [{ text: 'Adaptive Query Execution', correct: true }, { text: 'Catalyst caching', correct: false }, { text: 'Whole-stage codegen', correct: false }, { text: 'DataFrame.cache', correct: false }] },
      { question_text: 'Which Kafka guarantee requires producer idempotence + transactions?', explanation: 'EOS needs transactional producers + idempotence.', options: [{ text: 'Exactly-once semantics', correct: true }, { text: 'At-most-once', correct: false }, { text: 'Best effort', correct: false }, { text: 'Fire-and-forget', correct: false }] },
      { question_text: 'Which Airflow construct provides dynamic mapping?', explanation: 'Airflow 2.3+ supports dynamic task mapping.', options: [{ text: 'Dynamic Task Mapping', correct: true }, { text: 'SubDAG', correct: false }, { text: 'BashOperator', correct: false }, { text: 'DummyOperator', correct: false }] },
      { question_text: 'Which Delta operation reduces small-file overhead?', explanation: 'OPTIMIZE compacts small files.', options: [{ text: 'OPTIMIZE', correct: true }, { text: 'VACUUM', correct: false }, { text: 'DESCRIBE', correct: false }, { text: 'SHOW TABLES', correct: false }] },
    ],
    assignment: { title: 'Optimize a 4 TB Spark Join', description: 'Deliver an optimized Spark job that completes in <18 minutes on a 50-node cluster.', instructions: 'Submit code + Spark UI screenshots + tuning report.', max_score: 100, passing_score: 80 },
  },
  {
    slug: 'generative-ai-for-business-strategy',
    title: 'Generative AI for Business Strategy',
    short_description: 'A business-school playbook for evaluating, piloting and scaling GenAI inside the enterprise.',
    full_description: 'Designed for product, strategy and operations leaders to map LLM opportunities and avoid pilot failure modes.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-109-genai-biz.webp',
    level: 'beginner', category: 'Business Strategy', language: 'en', price: 49.99, has_certificate: true, estimated_hours: 14,
    tags: ['Strategy', 'GenAI'],
    learning_objectives: ['Map enterprise value chains to LLM workflows.', 'Build TCO/ROI models.', 'Align programs with EU AI Act.', 'Avoid pilot failure modes.'],
    prerequisites: ['Mid-level business stakeholder role.'],
    owner_email: 'noor.kassem@mindbridge.io',
    status: 'published',
    modules: baseModules('biz', ['Value Chain Mapping', 'Business Case', 'Governance', 'Scaling']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Which framework categorizes EU AI Act risk tiers?', explanation: 'EU AI Act formalizes four risk tiers.', options: [{ text: 'Unacceptable, High, Limited, Minimal', correct: true }, { text: 'Bronze, Silver, Gold', correct: false }, { text: 'Tier-0 to Tier-9', correct: false }, { text: 'Alpha, Beta', correct: false }] },
      { question_text: 'Which step typically dominates LLM TCO?', explanation: 'At scale, inference dominates total cost.', options: [{ text: 'Inference token cost', correct: true }, { text: 'Fine-tuning compute', correct: false }, { text: 'Initial procurement', correct: false }, { text: 'Model registry storage', correct: false }] },
      { question_text: 'Which lever most directly reduces hallucination risk?', explanation: 'Grounding + citations curb hallucinations.', options: [{ text: 'Grounded retrieval with citations', correct: true }, { text: 'Higher temperature', correct: false }, { text: 'Larger context with random docs', correct: false }, { text: 'Disabling tool use', correct: false }] },
      { question_text: 'Which KPI best signals copilot productivity?', explanation: 'Time-to-outcome is the proxy.', options: [{ text: 'Task completion time vs control', correct: true }, { text: 'Welcome message clicks', correct: false }, { text: 'Token usage', correct: false }, { text: 'Page-load time', correct: false }] },
      { question_text: 'Which pattern most directly addresses third-party API leakage?', explanation: 'Redaction + DLP at the boundary.', options: [{ text: 'PII redaction proxy + DLP', correct: true }, { text: 'Prod credentials in prompts', correct: false }, { text: 'Manual review every 6 months', correct: false }, { text: 'Sharing keys via email', correct: false }] },
    ],
    assignment: { title: 'Defend a GenAI Pilot Investment', description: 'Build a defensible business case for a customer-support copilot pilot.', instructions: 'Submit 6-page deck with kill criteria, TCO and risk register.', max_score: 100, passing_score: 70 },
  },
  {
    slug: 'kubernetes-in-production-sre-playbook',
    title: 'Kubernetes in Production: SRE Playbook',
    short_description: 'Operate Kubernetes the way mature SRE teams do — SLOs, autoscaling, cost control and zero-downtime rollouts.',
    full_description: 'SRE-flavored Kubernetes course covering SLOs, autoscaling, multi-cluster GitOps, and structured postmortems.',
    thumbnail_url: 'https://cdn.mindbridge.io/thumbs/course-110-k8s.webp',
    level: 'advanced', category: 'Tech Stack Mastery', language: 'en', price: 119.99, has_certificate: true, estimated_hours: 32,
    tags: ['Kubernetes', 'SRE', 'Argo CD'],
    learning_objectives: ['Define SLOs and error budgets.', 'Right-size autoscaling.', 'Manage multi-cluster fleets.', 'Run blameless postmortems.'],
    prerequisites: ['Familiarity with kubectl.'],
    owner_email: 'marcus.friedrich@mindbridge.io',
    status: 'published',
    modules: baseModules('k8s', ['SLOs & Error Budgets', 'Autoscaling', 'Cluster Fleets', 'Incident Response']) as DemoCourse['modules'],
    quiz: [
      { question_text: 'Which SLI is most appropriate for an HTTP API?', explanation: 'User-facing SLIs are availability + latency.', options: [{ text: 'Availability + p99 latency', correct: true }, { text: 'CPU usage only', correct: false }, { text: 'Pod count', correct: false }, { text: 'Disk used', correct: false }] },
      { question_text: 'Which autoscaler reacts to custom event-source metrics?', explanation: 'KEDA scales on event metrics.', options: [{ text: 'KEDA', correct: true }, { text: 'kube-proxy', correct: false }, { text: 'CoreDNS', correct: false }, { text: 'kube-scheduler', correct: false }] },
      { question_text: 'Which probe ensures a pod only receives traffic when ready?', explanation: 'readinessProbe gates service endpoints.', options: [{ text: 'readinessProbe', correct: true }, { text: 'livenessProbe', correct: false }, { text: 'startupProbe', correct: false }, { text: 'scheduledProbe', correct: false }] },
      { question_text: 'Which Argo CD construct deploys manifests across clusters?', explanation: 'ApplicationSet enables multi-cluster GitOps.', options: [{ text: 'ApplicationSet with cluster generator', correct: true }, { text: 'Plain Application', correct: false }, { text: 'Helm chart only', correct: false }, { text: 'Bash script', correct: false }] },
      { question_text: 'Which Kubernetes feature isolates secrets at rest with envelope encryption?', explanation: 'KMS providers wrap data keys per secret.', options: [{ text: 'KMS provider via EncryptionConfiguration', correct: true }, { text: 'Secrets in ConfigMaps', correct: false }, { text: 'Disabling RBAC', correct: false }, { text: 'Plain etcd dump', correct: false }] },
    ],
    assignment: { title: 'Autoscaling Tuning Lab', description: 'Tune HPA + VPA + Karpenter on a sample app and beat the 99th-percentile SLO.', instructions: 'Submit manifests + 3-page tuning report.', max_score: 100, passing_score: 75 },
  },
];

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Platform administrator',
  course_manager: 'Verified course manager / teacher',
  learner: 'Course learner / student',
  teacher: 'Legacy alias for course_manager (kept for backward compat)',
  student: 'Legacy alias for learner (kept for backward compat)',
};

async function ensureRole(repo: Repository<Role>, name: string): Promise<Role> {
  let role = await repo.findOne({ where: { name } });
  if (!role) {
    role = repo.create({ name, description: ROLE_DESCRIPTIONS[name] ?? name });
    await repo.save(role);
    log(`Created role: ${name}`);
  }
  return role;
}

async function ensureUser(
  userRepo: Repository<User>,
  userRoleRepo: Repository<UserRole>,
  roleRepo: Repository<Role>,
  spec: DemoUser
): Promise<User> {
  const existing = await userRepo.findOne({ where: { email: spec.email } });
  let user: User;
  if (existing) {
    existing.full_name = spec.full_name;
    existing.avatar_url = spec.avatar_url;
    existing.bio = spec.bio;
    existing.phone_number = spec.phone_number;
    existing.is_active = true;
    existing.email_verified_at = existing.email_verified_at ?? new Date();
    existing.is_2fa_enabled = false;
    user = await userRepo.save(existing);
  } else {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(spec.password, salt);
    user = await userRepo.save(userRepo.create({
      email: spec.email,
      password_hash,
      full_name: spec.full_name,
      avatar_url: spec.avatar_url,
      bio: spec.bio,
      phone_number: spec.phone_number,
      is_active: true,
      email_verified_at: new Date(),
      is_2fa_enabled: false,
    }));
    log(`Created user: ${spec.email}`);
  }

  const role = await ensureRole(roleRepo, spec.role);
  const link = await userRoleRepo.findOne({ where: { user_id: user.id, role_id: role.id } });
  if (!link) {
    await userRoleRepo.save(userRoleRepo.create({ user_id: user.id, role_id: role.id }));
    log(`Linked role ${spec.role} -> ${spec.email}`);
  }
  return user;
}

async function ensureVerification(
  repo: Repository<CourseManagerVerification>,
  userId: number,
  reviewerId: number,
): Promise<void> {
  const existing = await repo.findOne({ where: { user_id: userId } });
  if (existing && existing.status === 'approved') return;
  if (existing) {
    existing.status = 'approved';
    existing.review_note = 'Auto-approved for live demo seeding.';
    existing.reviewed_by = reviewerId;
    existing.reviewed_at = new Date();
    await repo.save(existing);
    return;
  }
  await repo.save(repo.create({
    user_id: userId,
    status: 'approved',
    application_note: 'Demo seed application — verified instructor record.',
    review_note: 'Auto-approved for live demo seeding.',
    reviewed_by: reviewerId,
    reviewed_at: new Date(),
  }));
}

async function ensureCourse(
  ds: DataSource,
  spec: DemoCourse,
  ownerId: number,
  reviewerId: number,
): Promise<Course> {
  const courseRepo = ds.getRepository(Course);
  let course = await courseRepo.findOne({ where: { slug: spec.slug } });
  const baseline: Partial<Course> = {
    title: spec.title,
    slug: spec.slug,
    short_description: spec.short_description,
    full_description: spec.full_description,
    learning_objectives: spec.learning_objectives,
    prerequisites: spec.prerequisites,
    thumbnail_url: spec.thumbnail_url,
    level: spec.level,
    language: spec.language,
    status: spec.status,
    category: spec.category,
    price: spec.price,
    has_certificate: spec.has_certificate,
    estimated_hours: spec.estimated_hours,
    tags: spec.tags,
    created_by: ownerId,
    published_at: spec.status === 'published' ? new Date() : null as unknown as Date,
  };
  if (course) {
    Object.assign(course, baseline);
    course = await courseRepo.save(course);
  } else {
    course = await courseRepo.save(courseRepo.create(baseline));
    log(`Created course: ${spec.title}`);
  }

  const instructorRepo = ds.getRepository(CourseInstructor);
  const ciExisting = await instructorRepo.findOne({ where: { course_id: course.id, instructor_id: ownerId } });
  if (!ciExisting) {
    await instructorRepo.save(instructorRepo.create({ course_id: course.id, instructor_id: ownerId, is_primary: true }));
  }

  // Modules + lessons (idempotent by title)
  const moduleRepo = ds.getRepository(Module);
  const lessonRepo = ds.getRepository(Lesson);
  const quizRepo = ds.getRepository(Quiz);
  const assignmentRepo = ds.getRepository(Assignment);

  let firstQuizLessonId: number | null = null;
  let firstQuizId: number | null = null;
  let firstAssignmentLessonId: number | null = null;

  for (let mi = 0; mi < spec.modules.length; mi++) {
    const ms = spec.modules[mi];
    let mod = await moduleRepo.findOne({ where: { course_id: course.id, title: ms.title } });
    if (!mod) {
      mod = await moduleRepo.save(moduleRepo.create({
        course_id: course.id,
        title: ms.title,
        description: ms.description,
        order_index: mi + 1,
        is_published: true,
      }));
    } else {
      mod.order_index = mi + 1;
      mod.description = ms.description;
      mod.is_published = true;
      mod = await moduleRepo.save(mod);
    }

    for (let li = 0; li < ms.lessons.length; li++) {
      const ls = ms.lessons[li];
      let lesson = await lessonRepo.findOne({ where: { module_id: mod.id, title: ls.title } });
      if (!lesson) {
        lesson = await lessonRepo.save(lessonRepo.create({
          module_id: mod.id,
          title: ls.title,
          description: ls.description,
          lesson_type: ls.lesson_type,
          order_index: li + 1,
          duration_minutes: ls.duration_minutes,
          is_published: true,
          is_free_preview: mi === 0 && li === 0,
        }));
      } else {
        lesson.order_index = li + 1;
        lesson.description = ls.description;
        lesson.lesson_type = ls.lesson_type;
        lesson.duration_minutes = ls.duration_minutes;
        lesson.is_published = true;
        lesson.is_free_preview = mi === 0 && li === 0;
        lesson = await lessonRepo.save(lesson);
      }

      if (ls.lesson_type === 'quiz' && firstQuizLessonId === null) {
        firstQuizLessonId = lesson.id;
        let quiz = await quizRepo.findOne({ where: { lesson_id: lesson.id } });
        if (!quiz) {
          quiz = await quizRepo.save(quizRepo.create({
            lesson_id: lesson.id,
            title: `${ms.title.replace(/^Module \d+ · /, '')} — Concept Check`,
            description: 'Auto-graded quiz covering the module\'s key ideas.',
            time_limit_minutes: 20,
            passing_score: 70,
            max_attempts: 3,
            shuffle_questions: true,
            shuffle_options: true,
            show_results_immediately: true,
            show_correct_answers: true,
          }));
        }
        firstQuizId = quiz.id;
      }

      if (ls.lesson_type === 'assignment' && firstAssignmentLessonId === null) {
        firstAssignmentLessonId = lesson.id;
      }
    }
  }

  // Ensure the course has an assignment lesson (course list ships quizzes only,
  // so we promote the last lesson of module 4 to an assignment if missing).
  if (firstAssignmentLessonId === null) {
    const lastModule = await moduleRepo.findOne({ where: { course_id: course.id }, order: { order_index: 'DESC' } });
    if (lastModule) {
      const lastLesson = await lessonRepo.findOne({ where: { module_id: lastModule.id }, order: { order_index: 'DESC' } });
      if (lastLesson) {
        lastLesson.lesson_type = 'assignment';
        lastLesson.title = `${lastLesson.title} — Capstone Assignment`;
        await lessonRepo.save(lastLesson);
        firstAssignmentLessonId = lastLesson.id;
      }
    }
  }

  if (firstAssignmentLessonId !== null) {
    const existingAssignment = await assignmentRepo.findOne({ where: { lesson_id: firstAssignmentLessonId } });
    const payload: Partial<Assignment> = {
      lesson_id: firstAssignmentLessonId,
      title: spec.assignment.title,
      description: spec.assignment.description,
      instructions: spec.assignment.instructions,
      max_score: spec.assignment.max_score,
      passing_score: spec.assignment.passing_score,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      allow_late_submission: true,
      late_submission_days: 3,
      late_penalty_percent: 10,
      allow_resubmission: true,
      max_resubmissions: 2,
      assignment_kind: 'file_prompt',
      submission_format: { allowed_formats: ['pdf', 'zip', 'docx'], max_size_mb: 25 },
      attachments: [
        { file_name: 'assignment-prompt.pdf', file_path: `s3://mindbridge-assignments/${spec.slug}/prompt.pdf`, signed_url: `https://cdn.mindbridge.io/assignments/${spec.slug}/prompt.pdf?sig=DEMO`, file_size: 412330 },
      ],
    };
    if (existingAssignment) {
      Object.assign(existingAssignment, payload);
      await assignmentRepo.save(existingAssignment);
    } else {
      await assignmentRepo.save(assignmentRepo.create(payload));
    }
  }

  // Question bank + quiz questions (idempotent by question_text)
  if (firstQuizLessonId !== null && firstQuizId !== null) {
    const bankRepo = ds.getRepository(QuestionBank);
    const bankQuestionRepo = ds.getRepository(BankQuestion);
    const bankOptionRepo = ds.getRepository(BankQuestionOption);
    const quizQuestionRepo = ds.getRepository(QuizQuestion);
    const questionOptionRepo = ds.getRepository(QuestionOption);

    let bank = await bankRepo.findOne({ where: { course_id: course.id, name: `${spec.title} · Core Bank` } });
    if (!bank) {
      bank = await bankRepo.save(bankRepo.create({
        course_id: course.id,
        name: `${spec.title} · Core Bank`,
        description: 'Curated, peer-reviewed core question bank seeded by the live demo.',
        created_by: ownerId,
        is_shared: false,
        is_active: true,
      }));
    }

    for (let qi = 0; qi < spec.quiz.length; qi++) {
      const q = spec.quiz[qi];
      let bq = await bankQuestionRepo.findOne({ where: { bank_id: bank.id, question_text: q.question_text } });
      if (!bq) {
        bq = await bankQuestionRepo.save(bankQuestionRepo.create({
          bank_id: bank.id,
          question_type: 'multiple_choice',
          question_text: q.question_text,
          explanation: q.explanation,
          difficulty: 'medium',
          category: spec.category,
          tags: spec.tags,
          points: 5,
          created_by: ownerId,
          is_ai_generated: false,
        }));
        for (let oi = 0; oi < q.options.length; oi++) {
          await bankOptionRepo.save(bankOptionRepo.create({
            question_id: bq.id,
            option_text: q.options[oi].text,
            is_correct: q.options[oi].correct,
            order_index: oi + 1,
            explanation: q.options[oi].correct ? 'Correct response.' : 'Incorrect — review the lesson notes.',
          }));
        }
      }

      let qq = await quizQuestionRepo.findOne({ where: { quiz_id: firstQuizId, bank_question_id: bq.id } });
      if (!qq) {
        qq = await quizQuestionRepo.save(quizQuestionRepo.create({
          quiz_id: firstQuizId,
          bank_question_id: bq.id,
          order_index: qi + 1,
          points: 5,
        }));
        for (let oi = 0; oi < q.options.length; oi++) {
          await questionOptionRepo.save(questionOptionRepo.create({
            quiz_question_id: qq.id,
            option_text: q.options[oi].text,
            is_correct: q.options[oi].correct,
            order_index: oi + 1,
            explanation: q.options[oi].correct ? 'Correct response.' : 'Incorrect — review the lesson notes.',
          }));
        }
      }
    }
  }

  // One live session per course (scheduled in 24h)
  const liveRepo = ds.getRepository(LiveSession);
  const liveExisting = await liveRepo.findOne({ where: { courseId: course.id } });
  if (!liveExisting) {
    await liveRepo.save(liveRepo.create({
      courseId: course.id,
      hostId: ownerId,
      title: `${spec.title} — Office Hours`,
      description: 'Live Q&A session with the instructor covering current module material.',
      jitsiRoomName: `mb-${spec.slug}-office-hours`,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'scheduled',
    }));
  }

  return course;
}

async function seedTransactions(
  ds: DataSource,
  learners: User[],
  courses: Course[],
): Promise<void> {
  if (!courses.length || !learners.length) return;
  const orderRepo = ds.getRepository(PaymentOrder);
  const enrollmentRepo = ds.getRepository(CourseEnrollment);

  const statuses: Array<{ status: 'paid' | 'pending' | 'failed' | 'expired' | 'refunded'; weight: number }> = [
    { status: 'paid',     weight: 18 },
    { status: 'pending',  weight: 5  },
    { status: 'failed',   weight: 4  },
    { status: 'expired',  weight: 4  },
    { status: 'refunded', weight: 3  },
  ];
  const flat: Array<'paid' | 'pending' | 'failed' | 'expired' | 'refunded'> = [];
  for (const s of statuses) for (let i = 0; i < s.weight; i++) flat.push(s.status);

  let counter = 1;
  for (let i = 0; i < 36; i++) {
    const learner = learners[i % learners.length];
    const course = courses[i % courses.length];
    const status = flat[i % flat.length];
    const provider = ['momo', 'vnpay', 'stripe'][i % 3] as 'momo' | 'vnpay' | 'stripe';
    const orderRef = `MBR-DEMO-${String(counter).padStart(7, '0')}`;
    counter++;

    const existing = await orderRepo.findOne({ where: { provider_order_ref: orderRef } });
    if (existing) continue;

    const created = new Date(Date.now() - (i + 1) * 60 * 60 * 1000);
    const paid = status === 'paid' || status === 'refunded' ? new Date(created.getTime() + 5 * 60 * 1000) : null;
    const expired = new Date(created.getTime() + 15 * 60 * 1000);

    await orderRepo.save(orderRepo.create({
      user_id: learner.id,
      course_id: course.id,
      provider,
      amount: Math.round(course.price * 24700),
      currency: 'VND',
      status,
      provider_order_ref: orderRef,
      provider_txn_ref: status === 'paid' || status === 'refunded' ? `TXN-${provider}-${counter}` : null,
      raw_return_payload: { seed: 'live-demo', status, provider },
      paid_at: paid,
      expired_at: expired,
    }));

    if (status === 'paid') {
      const enrolled = await enrollmentRepo.findOne({ where: { user_id: learner.id, course_id: course.id } });
      if (!enrolled) {
        await enrollmentRepo.save(enrollmentRepo.create({
          user_id: learner.id,
          course_id: course.id,
          enrolled_by: learner.id,
          status: 'active',
          progress_percent: 0,
          last_accessed_at: new Date(),
        }));
      }
    }
  }

  // Always ensure the hero learner is enrolled in the hero course
  const heroLearner = learners.find((u) => u.email === 'learner.demo@mindbridge.io');
  const heroCourse = courses.find((c) => c.slug === 'generative-ai-foundations-llm-fine-tuning');
  if (heroLearner && heroCourse) {
    const link = await enrollmentRepo.findOne({ where: { user_id: heroLearner.id, course_id: heroCourse.id } });
    if (!link) {
      await enrollmentRepo.save(enrollmentRepo.create({
        user_id: heroLearner.id,
        course_id: heroCourse.id,
        enrolled_by: heroLearner.id,
        status: 'active',
        progress_percent: 12,
        last_accessed_at: new Date(),
      }));
    }
  }
}

async function resetDemoData(ds: DataSource): Promise<void> {
  log('Reset requested — purging prior demo rows.');
  const tables = [
    'payment_orders',
    'course_enrollments',
    'live_sessions',
    'question_options',
    'quiz_questions',
    'bank_question_options',
    'bank_questions',
    'question_banks',
    'assignments',
    'quizzes',
    'lessons',
    'modules',
    'course_instructors',
    'courses',
    'course_manager_verifications',
    'user_roles',
  ];
  for (const t of tables) {
    try { await ds.query(`DELETE FROM ${t} WHERE 1=1`); }
    catch (err) { log(`  skipped reset of ${t} (${(err as Error).message})`); }
  }
  // Keep users intact so existing admin accounts created via `npm run admin`
  // continue to function; demo users will be upserted below.
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { default: AppDataSource } = await import('./database');
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  log('Database connected.');

  try {
    if (RESET) await resetDemoData(AppDataSource);

    const userRepo = AppDataSource.getRepository(User);
    const userRoleRepo = AppDataSource.getRepository(UserRole);
    const roleRepo = AppDataSource.getRepository(Role);
    const verificationRepo = AppDataSource.getRepository(CourseManagerVerification);

    // Roles
    for (const name of ['admin', 'course_manager', 'learner', 'teacher', 'student']) {
      await ensureRole(roleRepo, name);
    }

    // Users
    const createdUsers: Record<string, User> = {};
    for (const spec of DEMO_USERS) {
      createdUsers[spec.email] = await ensureUser(userRepo, userRoleRepo, roleRepo, spec);
    }

    // Verify course managers
    const adminUser = createdUsers['admin.demo@mindbridge.io'];
    for (const spec of DEMO_USERS.filter((u) => u.role === 'course_manager')) {
      await ensureVerification(verificationRepo, createdUsers[spec.email].id, adminUser.id);
    }

    // Courses
    const courses: Course[] = [];
    for (const spec of DEMO_COURSES) {
      const owner = createdUsers[spec.owner_email];
      if (!owner) {
        log(`SKIP course ${spec.title} (owner not found: ${spec.owner_email})`);
        continue;
      }
      courses.push(await ensureCourse(AppDataSource, spec, owner.id, adminUser.id));
    }

    // Transactions + enrollments
    const learners = DEMO_USERS.filter((u) => u.role === 'learner').map((u) => createdUsers[u.email]).filter(Boolean);
    await seedTransactions(AppDataSource, learners, courses);

    log('Seed complete.');
    log(`Users: ${DEMO_USERS.length}  ·  Courses: ${courses.length}  ·  Modules: ${courses.length * 4}  ·  Lessons: ${courses.length * 12}`);
    log('Hero credentials:');
    log('  admin.demo@mindbridge.io     / Admin#Demo-2026!');
    log('  teacher.demo@mindbridge.io   / Teach#Demo-2026!');
    log('  learner.demo@mindbridge.io   / Learn#Demo-2026!');
  } catch (err) {
    console.error(SEED_TAG, 'FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}

main();
