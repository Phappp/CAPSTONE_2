Role: Senior Frontend Architect & AI Refactoring Expert
Task: Convert a single monolithic HTML file containing 3 pages into modular React+TypeScript component files matching the existing project architecture.

[CONTEXT & PROJECT STRUCTURE]
Analyze the provided project directory image. The project is a React web application built with:

- Build Tool: Vite (vite.config.ts, vite-env.d.ts)
- Language: TypeScript (tsconfig.json, App.tsx, main.tsx)
- Styling: Dedicated CSS files per component/page (e.g., LandingPage.tsx + LandingPage.css)
- Routing: React Router (detected via the 'router' directory)

Current Directory Rules Observed:

1. Pages are located in `src/pages/`.
2. Global styles are in `src/index.css`.
3. Common configurations like API endpoints are in `src/baseUrl.ts` and `src/api/`.

[INPUT DATA]
I have a single HTML file that contains the layout, structure, and styling for three distinct pages:

1. Landing Page
2. Privacy Page
3. Contact Us Page

[INSTRUCTIONS & REFACTORING RULES]
Please process the HTML file and perform the following atomic operations:

1. TARGETED CONVERSION ONLY:
   - Convert only the specified pages (Landing, Privacy, Contact Us). Do not invent new pages.
   - Refactor repetitive UI patterns into local, reusable React sub-components within the same file or a dedicated folder if they are page-specific.

2. FILE ARCHITECTURE MATCHING:
   - Extract and create separate files for each page following the project's exact pattern:
     - `src/pages/LandingPage.tsx` & `src/pages/LandingPage.css`
     - `src/pages/PrivacyPage.tsx` & `src/pages/PrivacyPage.css`
     - `src/pages/ContactUsPage.tsx` & `src/pages/ContactUsPage.css`

3. CODE QUALITY & TYPESCRIPT STANDARDS:
   - Use TypeScript Functional Components (`React.FC` or standard functions with typed props).
   - Convert all HTML attributes to JSX syntax (e.g., `class` -> `className`, `for` -> `htmlFor`, inline styles to object notation).
   - Ensure all asset paths (images, icons) are imported at the top using ESM syntax if they belong to `src/assets/`.

4. CSS SCOPING:
   - Extract raw HTML styles into their respective `.css` files.
   - Ensure class names are uniquely scoped to avoid global style pollution.

[OUTPUT EXPECTED]
Provide the complete, production-ready source code for each generated file. Group them clearly by file path:

- File 1: `src/pages/LandingPage.tsx`
- File 2: `src/pages/LandingPage.css`
- File 3: `src/pages/PrivacyPage.tsx`
- File 4: `src/pages/PrivacyPage.css`
- File 5: `src/pages/ContactUsPage.tsx`
- File 6: `src/pages/ContactUsPage.css`

Here is the source HTML code to convert:

<!DOCTYPE html>
<html class="light" lang="en">
<head>
    <meta charset="utf-8">
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <title>MindBridge | The Intelligent Workspace</title>
    <!-- Material Symbols -->
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    <!-- Tailwind CSS with Plugins -->
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    
    <script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "inverse-surface": "#2d3133",
                        "on-background": "#191c1e",
                        "on-secondary-fixed-variant": "#005048",
                        "on-tertiary-container": "#009acf",
                        "surface-variant": "#e0e3e5",
                        "background": "#f7f9fb",
                        "surface-bright": "#f7f9fb",
                        "inverse-on-surface": "#eff1f3",
                        "surface-container-high": "#e6e8ea",
                        "tertiary": "#001622",
                        "on-tertiary": "#ffffff",
                        "on-error-container": "#93000a",
                        "on-primary": "#ffffff",
                        "on-surface": "#191c1e",
                        "surface": "#f7f9fb",
                        "surface-container": "#eceef0",
                        "surface-container-highest": "#e0e3e5",
                        "tertiary-container": "#002c3e",
                        "inverse-primary": "#bcc7de",
                        "on-secondary-fixed": "#00201c",
                        "on-tertiary-fixed": "#001e2c",
                        "secondary-container": "#6df5e1",
                        "primary-fixed-dim": "#bcc7de",
                        "tertiary-fixed-dim": "#7bd0ff",
                        "surface-container-low": "#f2f4f6",
                        "on-tertiary-fixed-variant": "#004c69",
                        "on-error": "#ffffff",
                        "primary-fixed": "#d8e3fb",
                        "secondary-fixed": "#71f8e4",
                        "secondary-fixed-dim": "#4fdbc8",
                        "on-primary-fixed": "#111c2d",
                        "on-secondary-container": "#006f64",
                        "on-secondary": "#ffffff",
                        "outline-variant": "#c5c6cd",
                        "on-primary-fixed-variant": "#3c475a",
                        "primary-container": "#1e293b",
                        "secondary": "#0D9488",
                        "primary": "#0F172A",
                        "error": "#ba1a1a",
                        "surface-container-lowest": "#ffffff",
                        "outline": "#75777d",
                        "error-container": "#ffdad6",
                        "tertiary-fixed": "#c4e7ff",
                        "on-primary-container": "#8590a6",
                        "on-surface-variant": "#45474c",
                        "surface-tint": "#545f73",
                        "surface-dim": "#d8dadc"
                    },
                    fontFamily: {
                        "headline": ["Manrope"],
                        "body": ["Inter"],
                        "label": ["Inter"],
                        "manrope": ["Manrope"]
                    },
                    borderRadius: {"DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem"},
                },
            },
        }
    </script>
    <style>
        .glass-panel {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .text-gradient {
            background: linear-gradient(135deg, #0F172A 0%, #1e293b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .cta-gradient {
            background: linear-gradient(135deg, #0F172A 0%, #1e293b 100%);
        }
        body {
            font-family: 'Inter', sans-serif;
            scroll-behavior: smooth;
        }
        h1, h2, h3 {
            font-family: 'Manrope', sans-serif;
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
</head>
<body class="bg-background text-on-surface">
    <div id="root"></div>

    <!-- Libraries -->
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/history@5/umd/history.development.js"></script>
    <script src="https://unpkg.com/react-router@6.3.0/umd/react-router.development.js"></script>
    <script src="https://unpkg.com/react-router-dom@6.3.0/umd/react-router-dom.development.js"></script>
    <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>

    <script type="text/babel">
        const { useState, useEffect } = React;
        const { createRoot } = ReactDOM;
        const { MemoryRouter, Routes, Route, Link, useNavigate, useLocation } = ReactRouterDOM;

        // --- Common Components ---

        const Navbar = () => {
            const navigate = useNavigate();
            return (
                <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl shadow-sm border-b border-slate-100">
                    <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
                        <Link to="/" className="text-2xl font-bold text-slate-900 tracking-tighter flex items-center gap-2">
                            <img alt="MindBridge Logo" className="w-8 h-8" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_4WGPS1wjMVI4g231GXi4ohKrVmO5cRDzY7pAfFH29-Acaf0uwiE-HT7lc8qbu1NAMb_E9z0rFm8pjqkB_DEQcqw0w3zZvp6lA9kafYC22BtlbZOzieOrw71c5zlStFTjgylxkm03LfIhVnTEFzGK3Upoc8yowa9GdGJofyGMqH0IQ7eJt-OY4qR_OpAfibLN--pjKXMdUsxfNgTFIDNZQ1VN1HomnIN6bL7I7hRBX9LMmHDy5HBhZl6UPmqjTWRiWHLW_BaN5A" />
                            <span>MindBridge</span>
                        </Link>
                        <div className="hidden md:flex items-center gap-8 font-manrope tracking-tight text-sm font-semibold">
                            <Link to="/" className="text-slate-600 hover:text-teal-600 transition-colors">Courses</Link>
                            <Link to="/" className="text-slate-600 hover:text-teal-600 transition-colors">Instructors</Link>
                            <Link to="/" className="text-slate-600 hover:text-teal-600 transition-colors">Pricing</Link>
                            <Link to="/contact" className="text-slate-600 hover:text-teal-600 transition-colors">Resources</Link>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="text-slate-600 font-semibold text-sm hover:text-slate-900 px-4 py-2 transition-all active:scale-95">Login</button>
                            <button onClick={() => navigate('/contact')} className="bg-secondary text-white px-6 py-2.5 rounded-full font-semibold text-sm shadow-md hover:opacity-90 transition-all active:scale-95">Get Started</button>
                        </div>
                    </div>
                </nav>
            );
        };

        const Footer = () => (
            <footer className="bg-slate-900 text-teal-400 py-12 px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto font-inter text-xs tracking-wide">
                    <div className="space-y-4">
                        <div className="text-lg font-bold text-white flex items-center gap-2">
                            <img alt="MindBridge Logo" className="w-6 h-6 invert" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAm--tLN_EQi145PajDOjjRXMa5_XGqvFn2MiZdZmu6LQibDYaCqCfr352kC2Kbras3HScX_Py6I4L7k7x6RgumyXlPWiKg42bIxmpKlJHdDW91e6E1SIGit0KsCKMGJyLK5n0nyIkRDiPHFHxHHYcjLbuhPpbhWuyEJjtnPm30FHMmRUbg2Njerm3dUEd8dwgEVLGupobG8VcOzuWhCjCsSE6mJU3OT_jVFD1BuD5PG-_bHdDwWTI9SltvjP3mi971NSWJzwoJ2A" />
                            MindBridge
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                            © 2026 MindBridge Co. The Intelligent Workspace.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <p className="font-bold text-white mb-2">Product</p>
                        <Link className="text-slate-400 hover:text-white transition-colors" to="/">Courses</Link>
                        <Link className="text-slate-400 hover:text-white transition-colors" to="/">Instructors</Link>
                        <Link className="text-slate-400 hover:text-white transition-colors" to="/">Pricing</Link>
                    </div>
                    <div className="flex flex-col gap-3">
                        <p className="font-bold text-white mb-2">Company</p>
                        <Link className="text-slate-400 hover:text-white transition-colors" to="/privacy">Privacy Policy</Link>
                        <Link className="text-slate-400 hover:text-white transition-colors" to="/">Terms of Service</Link>
                        <Link className="text-slate-400 hover:text-white transition-colors" to="/">Cookie Policy</Link>
                        <Link className="text-slate-400 hover:text-white transition-colors" to="/contact">Contact Us</Link>
                    </div>
                    <div className="flex flex-col gap-3">
                        <p className="font-bold text-white mb-2">Connect</p>
                        <div className="flex gap-4">
                            <a className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-secondary transition-all" href="#">
                                <span className="material-symbols-outlined text-sm">public</span>
                            </a>
                            <a className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-secondary transition-all" href="#">
                                <span className="material-symbols-outlined text-sm">alternate_email</span>
                            </a>
                        </div>
                        <p className="text-slate-500 mt-4">✦ Privacy and security are built into everything we do.</p>
                    </div>
                </div>
            </footer>
        );

        // --- Page Components ---

        const HomePage = () => {
            const navigate = useNavigate();
            return (
                <div className="pt-20">
                    {/* Hero Section */}
                    <section className="relative min-h-[921px] flex items-center overflow-hidden px-6 lg:px-24">
                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-md text-xs font-bold mb-6 tracking-wider">
                                    <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: '"FILL" 1'}}>bolt</span>
                                    AI-POWERED LLM
                                </div>
                                <h1 className="text-5xl lg:text-7xl font-extrabold text-primary tracking-tighter leading-[1.1] mb-6">
                                    The Intelligent Bridge to <span className="text-secondary">Modern Learning</span>
                                </h1>
                                <p className="text-on-surface-variant text-lg lg:text-xl max-w-lg mb-10 leading-relaxed">
                                    Redefining education through editorial precision and LLM intelligence. A workspace that adapts to your curiosity.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <button onClick={() => navigate('/contact')} className="cta-gradient text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center gap-2">
                                        Get Started
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                    <button className="bg-surface-container-lowest text-primary px-8 py-4 rounded-full font-bold text-lg border border-outline-variant hover:bg-surface-container transition-all active:scale-95">
                                        Become an Instructor</button>
                                </div>
                            </div>
                            {/* Interactive Visual Cluster */}
                            <div className="relative hidden lg:block">
                                <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl"></div>
                                <div className="relative z-10 space-y-6">
                                    <div className="glass-panel p-6 rounded-xl shadow-2xl translate-x-12">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 rounded-full bg-error/20"></div>
                                                <div className="w-3 h-3 rounded-full bg-secondary/20"></div>
                                                <div className="w-3 h-3 rounded-full bg-primary/10"></div>
                                            </div>
                                            <div className="text-xs text-on-surface-variant font-medium">Progress: 84%</div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="h-4 bg-primary/5 rounded-full w-3/4"></div>
                                            <div className="h-4 bg-primary/5 rounded-full w-full"></div>
                                            <div className="h-4 bg-primary/5 rounded-full w-1/2"></div>
                                        </div>
                                        <div className="mt-8 flex gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-secondary-fixed flex items-center justify-center">
                                                <span className="material-symbols-outlined text-on-secondary-container">psychology</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="h-3 bg-secondary/20 rounded-full w-1/3 mb-2"></div>
                                                <div className="h-2 bg-primary/5 rounded-full w-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute -left-12 top-1/2 glass-panel p-4 rounded-xl shadow-lg flex items-center gap-3 border-l-4 border-secondary">
                                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-secondary" style={{fontVariationSettings: '"FILL" 1'}}>auto_awesome</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-primary">AI Insight</p>
                                            <p className="text-[10px] text-on-surface-variant">Personalized quiz generated.</p>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-8 right-0 glass-panel p-5 rounded-xl shadow-xl w-48">
                                        <p className="text-xs font-semibold mb-3">Course Health</p>
                                        <div className="flex items-end gap-1 h-12">
                                            <div className="w-full bg-primary/10 h-[40%] rounded-sm"></div>
                                            <div className="w-full bg-primary/10 h-[60%] rounded-sm"></div>
                                            <div className="w-full bg-secondary h-[90%] rounded-sm"></div>
                                            <div className="w-full bg-primary/10 h-[50%] rounded-sm"></div>
                                            <div className="w-full bg-primary/10 h-[75%] rounded-sm"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Bento Features Section */}
                    <section className="py-24 px-6 lg:px-24 bg-surface-container-low">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                                <div>
                                    <h2 className="text-4xl lg:text-5xl font-extrabold text-primary tracking-tighter mb-4">Intelligent by Design</h2>
                                    <p className="text-on-surface-variant max-w-md">Our features are built to eliminate friction and amplify comprehension using state-of-the-art AI.</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-4 py-2 bg-surface-container-highest rounded-full text-xs font-bold text-primary tracking-wide">SCALABLE</span>
                                    <span className="px-4 py-2 bg-surface-container-highest rounded-full text-xs font-bold text-primary tracking-wide">SECURE</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-8 bg-surface-container-lowest p-10 rounded-xl relative overflow-hidden group">
                                    <div className="relative z-10 h-full flex flex-col justify-between">
                                        <div>
                                            <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center mb-6">
                                                <span className="material-symbols-outlined text-on-secondary-container">quiz</span>
                                            </div>
                                            <h3 className="text-3xl font-bold text-primary mb-4">AI-Driven Quizzes</h3>
                                            <p className="text-on-surface-variant max-w-sm mb-8">Dynamic assessments that evolve based on student performance, ensuring no gap in knowledge goes unaddressed.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="bg-surface-container px-3 py-1 rounded text-xs font-medium">Predictive Logic</span>
                                            <span className="bg-surface-container px-3 py-1 rounded text-xs font-medium">Automated Grading</span>
                                        </div>
                                    </div>
                                    <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-l from-secondary/5 to-transparent pointer-events-none transition-all group-hover:from-secondary/10"></div>
                                    <img alt="Pattern" className="absolute -right-20 -bottom-20 w-80 opacity-5 grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQY1PapR9SfzAnBMHMcwuQhdKDYJOA4D-K554DWLWhK0ZCxi7Bm1VVPxaICrkuKs3QKrvJ9Gstx8hjc6YNwD9fyYndyXVPBaqQyM3NzEWWPjgwRUNjwKNgjBhS7BixQcSgu6sYfQznO03uI8qCpdKeXW_2wciUppIunGGACtmfyVRMInb5aMXbS3f4wOFg0ZdsApEj_yu8S1iYtnviHA2wDOIaGAtsUb9Qh1xvzbs7DdJgGWKRWl8EbZbxX72w3Qt8z98g0bHzZg" />
                                </div>
                                <div className="md:col-span-4 bg-primary text-white p-10 rounded-xl flex flex-col justify-between hover:bg-primary-container transition-colors">
                                    <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-secondary-fixed">videocam</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-3">Live Sessions</h3>
                                        <p className="text-on-primary-container text-sm">Real-time collaboration with integrated transcription and AI summaries.</p>
                                    </div>
                                </div>
                                <div className="md:col-span-5 bg-white p-10 rounded-xl border border-outline-variant/30 flex flex-col justify-between shadow-sm">
                                    <div className="w-12 h-12 bg-secondary/5 rounded-lg flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-secondary">assignment_turned_in</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-primary mb-3">Dynamic Assignments</h3>
                                        <p className="text-on-surface-variant text-sm">Assignments that adapt context and difficulty to the learner's specific pace.</p>
                                    </div>
                                </div>
                                <div className="md:col-span-7 bg-secondary-container text-on-secondary-container p-10 rounded-xl flex flex-col md:flex-row items-center gap-8">
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold mb-3">Predictive Analytics</h3>
                                        <p className="text-on-secondary-container/80 text-sm">Spot trends before they happen. Our system predicts student success rates with 94% accuracy.</p>
                                    </div>
                                    <div className="w-full md:w-48 bg-white/50 backdrop-blur p-4 rounded-lg">
                                        <div className="space-y-3">
                                            <div className="h-2 bg-secondary/20 rounded-full w-full"></div>
                                            <div className="h-2 bg-secondary/20 rounded-full w-4/5"></div>
                                            <div className="h-2 bg-secondary/40 rounded-full w-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* TVC Video Section */}
                    <section className="relative w-full aspect-video lg:h-[600px] overflow-hidden bg-primary">
                        <div className="absolute inset-0 bg-primary/40 z-10 flex items-center justify-center">
                            <div className="text-center">
                                <button className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 mx-auto group hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-white text-4xl" style={{fontVariationSettings: '"FILL" 1'}}>play_arrow</span>
                                </button>
                                <p className="text-white font-semibold tracking-widest uppercase text-sm">Watch how it works</p>
                            </div>
                        </div>
                        <img alt="AI Platform in Action" className="w-full h-full object-cover grayscale-[0.5] opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXvct5HrjMKAIS-xbkY1XVyYhvz9pMjBjTUDC9xuEo0uW2qEDRcNDciWQULXZxQ8l2M0QXrjsYNCjdxNMGvLqlbrCKRQNK_ZMJSbIFYFwWNJSOfCGld151oSrqbQDMCxB3Fz5NxxLPBF5dhnw5VqDodFo2NyXWrLmbJ6CoL8RjGcwvBwqXkgTpJhB-dnMq1bSpwO7383kl7O1g3z8WlHwaOpZQiIPnNcCm12DDDbNFlKdHpgplpRgwioR93qDWFshf5xPNebwzPg" />
                    </section>

                    {/* Certifications & Achievements */}
                    <section className="py-24 px-6 lg:px-24 bg-white">
                        <div className="max-w-7xl mx-auto">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl lg:text-4xl font-extrabold text-primary mb-4 tracking-tighter">Recognized Excellence</h2>
                                <p className="text-on-surface-variant">Industry-leading certifications and student milestones.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                {[
                                    {icon: 'workspace_premium', label: 'Ivy League Partner', sub: 'Accredited'},
                                    {icon: 'verified', label: 'Global Tech Award', sub: 'Innovation 2025'},
                                    {icon: 'military_tech', label: 'Mastery Badge', sub: 'Student Milestone'},
                                    {icon: 'school', label: 'EU Certified', sub: 'Education Standards'}
                                ].map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center p-6 bg-background rounded-xl text-center">
                                        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                                            <span className="material-symbols-outlined text-secondary text-3xl">{item.icon}</span>
                                        </div>
                                        <p className="text-xs font-bold text-primary mb-1">{item.label}</p>
                                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{item.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="px-6 pb-24">
                        <div className="max-w-5xl mx-auto cta-gradient rounded-3xl p-12 lg:p-20 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                                <img alt="Background pattern" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwxWdCPac3naoLW3IgZ9bsbc4QrThXKiQOjPD4cmGrGqU8DfSOcquva1RV7YZLDjTwcFZ238mzLqYSVmS94neUk5yJf_lbnERW72r8Iv3sywln-XtUxx5X4NtEAv5yXFapZiu9Pb0ywuRgpY9quiOdW37nSDcUISQPfOKEYKTuwFCR5KIW7itEBXH11OKk5UzcgCLuzezhW_T2XKk4daXNG0Fb8Ol_5cUWSxN46oIDBqu48s6Ul6rQ2XMFN_lHhK7hnNF3znvzyw" />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tighter mb-6">Ready to Bridge the Gap?</h2>
                                <p className="text-on-primary-container text-lg mb-10 max-w-xl mx-auto">Join over 10,000 instructors who are already shaping the future of education with MindBridge.</p>
                                <div className="flex flex-col sm:flex-row justify-center gap-4">
                                    <button onClick={() => navigate('/contact')} className="bg-secondary text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-2xl transition-all">Start Free Trial</button>
                                    <button className="bg-transparent text-white border border-white/20 px-10 py-4 rounded-full font-bold text-lg hover:bg-white/5 transition-all">Contact Sales</button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            );
        };

        const PrivacyPage = () => {
            const [activeSection, setActiveSection] = useState('introduction');
            
            const handleScroll = () => {
                const sections = ['introduction', 'data-collection', 'how-we-use', 'sharing', 'security'];
                for (const section of sections) {
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

            useEffect(() => {
                window.addEventListener('scroll', handleScroll);
                return () => window.removeEventListener('scroll', handleScroll);
            }, []);

            const navItemClass = (id) => `pl-4 py-2 text-sm font-medium border-l-2 transition-all ${activeSection === id ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'}`;

            return (
                <div className="bg-background pt-16">
                    <header className="bg-[#0F172A] py-20 px-6">
                        <div className="max-w-7xl mx-auto">
                            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Privacy Policy</h1>
                            <p className="font-body text-slate-400 text-lg">Last Updated: 25, March 2026</p>
                        </div>
                    </header>
                    <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
                        <aside className="w-full md:w-[250px] shrink-0">
                            <div className="sticky top-28">
                                <nav className="flex flex-col gap-1 border-l border-slate-200">
                                    <a className={navItemClass('introduction')} href="#introduction">Introduction</a>
                                    <a className={navItemClass('data-collection')} href="#data-collection">Data Collection</a>
                                    <a className={navItemClass('how-we-use')} href="#how-we-use">How We Use Data</a>
                                    <a className={navItemClass('sharing')} href="#sharing">Information Sharing</a>
                                    <a className={navItemClass('security')} href="#security">Data Security</a>
                                </nav>
                                <div className="mt-12 p-6 bg-secondary-container/10 rounded-xl border border-secondary/20">
                                    <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-2">Need Help?</p>
                                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">Questions about your data privacy?</p>
                                    <a className="text-sm font-bold text-primary underline underline-offset-4 decoration-secondary hover:text-secondary transition-colors" href="mailto:privacy@mindbridge.co">Contact Legal Team</a>
                                </div>
                            </div>
                        </aside>
                        <article className="flex-1 max-w-[800px] bg-white rounded-xl shadow-sm border border-slate-100 p-8 md:p-12">
                            <section className="mb-12" id="introduction">
                                <h2 className="font-headline text-2xl font-bold text-[#1E293B] mb-6">1. Introduction</h2>
                                <p className="font-body text-slate-600 leading-relaxed mb-4">
                                    At MindBridge Co., we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform and use our adaptive learning services.
                                </p>
                                <p className="font-body text-slate-600 leading-relaxed">
                                    By accessing or using our services, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy.
                                </p>
                            </section>
                            <section className="mb-12" id="data-collection">
                                <h2 className="font-headline text-2xl font-bold text-[#1E293B] mb-6">2. Data Collection</h2>
                                <h3 className="font-headline text-lg font-semibold text-[#1E293B] mb-4">Personal Information You Provide</h3>
                                <p className="font-body text-slate-600 leading-relaxed mb-4">
                                    We collect personal information that you voluntarily provide to us when you register on the platform, express an interest in obtaining information about us or our products, or otherwise when you contact us.
                                </p>
                                <ul className="list-disc pl-8 space-y-3 text-slate-600 font-body">
                                    <li><span className="font-semibold text-slate-900">Account Credentials:</span> Name, email address, password, and similar security information.</li>
                                    <li><span className="font-semibold text-slate-900">Profile Data:</span> Educational background, learning goals, and professional experience.</li>
                                    <li><span className="font-semibold text-slate-900">Payment Data:</span> We collect data necessary to process your payment if you make purchases.</li>
                                </ul>
                            </section>
                            <section className="mb-12" id="how-we-use">
                                <h2 className="font-headline text-2xl font-bold text-[#1E293B] mb-6">3. How We Use Data</h2>
                                <p className="font-body text-slate-600 leading-relaxed mb-6">
                                    We process your personal information for these purposes in reliance on our legitimate business interests.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-lg">
                                        <span className="material-symbols-outlined text-secondary mb-3">psychology</span>
                                        <h4 className="font-semibold text-slate-900 mb-2">Personalization</h4>
                                        <p className="text-sm text-slate-500">To tailor learning paths and curriculum recommendations based on user performance.</p>
                                    </div>
                                    <div className="p-5 bg-slate-50 border border-slate-100 rounded-lg">
                                        <span className="material-symbols-outlined text-secondary mb-3">shield_person</span>
                                        <h4 className="font-semibold text-slate-900 mb-2">Account Security</h4>
                                        <p className="text-sm text-slate-500">To maintain the safety and integrity of our platform through verification and monitoring.</p>
                                    </div>
                                </div>
                            </section>
                            <section className="mb-12" id="sharing">
                                <h2 className="font-headline text-2xl font-bold text-[#1E293B] mb-6">4. Information Sharing</h2>
                                <p className="font-body text-slate-600 leading-relaxed mb-4">
                                    We only share information with your consent, to comply with laws, or to fulfill business obligations.
                                </p>
                                <div className="bg-primary-container p-6 rounded-lg text-slate-300 text-sm font-body">
                                    <p className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-tertiary-fixed shrink-0">info</span>
                                        <span>We do not sell, rent, or trade your personal information to third parties for their marketing purposes. Any data shared with sub-processors is governed by strict Data Processing Agreements.</span>
                                    </p>
                                </div>
                            </section>
                            <div className="mt-12 pt-12 border-t border-slate-100 text-center">
                                <p className="text-slate-400 text-sm mb-6 italic">Was this policy clear and helpful?</p>
                                <div className="flex justify-center gap-4">
                                    <button className="flex items-center gap-2 px-6 py-2 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors">
                                        <span className="material-symbols-outlined text-lg">thumb_up</span> Yes
                                    </button>
                                    <button className="flex items-center gap-2 px-6 py-2 border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-colors">
                                        <span className="material-symbols-outlined text-lg">thumb_down</span> No
                                    </button>
                                </div>
                            </div>
                        </article>
                    </main>
                </div>
            );
        };

        const ContactPage = () => {
            const [submitted, setSubmitted] = useState(false);
            const handleSubmit = (e) => {
                e.preventDefault();
                setSubmitted(true);
                setTimeout(() => setSubmitted(false), 5000);
            };

            return (
                <div className="pt-16 min-h-screen bg-background">
                    <section className="py-20 px-6 bg-white border-b border-surface-container">
                        <div className="max-w-7xl mx-auto text-center">
                            <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-primary tracking-tight mb-6">Get in Touch</h1>
                            <p className="text-on-surface-variant text-xl max-w-2xl mx-auto font-body">Have a question about MindBridge? We're here to help.</p>
                        </div>
                    </section>
                    <section className="max-w-7xl mx-auto px-6 py-16">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            <div className="lg:col-span-5 space-y-6">
                                <div className="bg-white border border-[#E2E8F0] p-8 rounded-lg flex items-start gap-6">
                                    <div className="bg-secondary-fixed/20 p-3 rounded-lg">
                                        <span className="material-symbols-outlined text-secondary text-3xl">location_on</span>
                                    </div>
                                    <div>
                                        <h3 className="font-headline font-bold text-lg text-primary mb-2">Our Location</h3>
                                        <p className="text-on-surface-variant leading-relaxed">Duy Tan University Campus,<br/>Da Nang, Vietnam</p>
                                    </div>
                                </div>
                                <div className="bg-white border border-[#E2E8F0] p-8 rounded-lg flex items-start gap-6">
                                    <div className="bg-secondary-fixed/20 p-3 rounded-lg">
                                        <span className="material-symbols-outlined text-secondary text-3xl">mail</span>
                                    </div>
                                    <div>
                                        <h3 className="font-headline font-bold text-lg text-primary mb-2">Email Us</h3>
                                        <p className="text-on-surface-variant leading-relaxed">support@mindbridge.edu.vn</p>
                                    </div>
                                </div>
                                <div className="bg-white border border-[#E2E8F0] p-8 rounded-lg flex items-start gap-6">
                                    <div className="bg-secondary-fixed/20 p-3 rounded-lg">
                                        <span className="material-symbols-outlined text-secondary text-3xl">schedule</span>
                                    </div>
                                    <div>
                                        <h3 className="font-headline font-bold text-lg text-primary mb-2">Working Hours</h3>
                                        <p className="text-on-surface-variant leading-relaxed">Mon - Fri, 8:00 AM - 5:00 PM</p>
                                    </div>
                                </div>
                                <div className="relative h-64 w-full rounded-xl overflow-hidden mt-8 grayscale hover:grayscale-0 transition-all duration-500 border border-[#E2E8F0]">
                                    <img alt="Map location" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaw0GK197Yjr1aO0mXQZ9kd-K2nfJdl2z1khcCoC1Nv0BFBOUNMRFZf2Kw4DFKYXGU03Oo7Z6KuitYQw0HtN8oeOdAtYvUJ0iqK66RRkQMDdNMYkxcm31wFS_VLASGMrAwyY4SUDVjLfRDMgNvyEq_7AHPZuvUCMXTIHm5EB34vvSaF9dbChc5c9tJ4LeBnkpQpIuI096AQOjXqEp2tIVRK5IkdPJMmCprSr-BWyBHyWUTwxc3B2a5aNd6T18myjtzj5onxjdsGg" />
                                </div>
                            </div>
                            <div className="lg:col-span-7">
                                <div className="bg-white p-8 md:p-10 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-surface-container">
                                    <h2 className="font-headline text-2xl font-bold text-primary mb-8">Send us a message</h2>
                                    {submitted ? (
                                        <div className="bg-secondary/10 border border-secondary text-secondary-container p-6 rounded-lg text-center mb-6">
                                            <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                                            <p className="font-bold">Thank you for your message!</p>
                                            <p className="text-sm">We'll get back to you shortly.</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-semibold text-on-surface-variant font-label">Full Name</label>
                                                    <input required className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488] outline-none transition-all placeholder:text-slate-400" placeholder="John Doe" type="text" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-semibold text-on-surface-variant font-label">Email Address</label>
                                                    <input required className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488] outline-none transition-all placeholder:text-slate-400" placeholder="john@example.com" type="email" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-semibold text-on-surface-variant font-label">Subject</label>
                                                <select required className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488] outline-none transition-all bg-white">
                                                    <option value="">Select a subject</option>
                                                    <option value="general">General Inquiry</option>
                                                    <option value="support">Technical Support</option>
                                                    <option value="billing">Billing & Pricing</option>
                                                    <option value="partnership">Partnership</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-semibold text-on-surface-variant font-label">Message</label>
                                                <textarea required className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-[#0D9488] focus:border-[#0D9488] outline-none transition-all placeholder:text-slate-400 resize-none" placeholder="How can we help you?" rows="5"></textarea>
                                            </div>
                                            <button className="w-full bg-[#0D9488] text-white py-4 rounded-lg font-bold text-lg hover:bg-[#0B7A6F] active:scale-[0.98] transition-all shadow-lg shadow-teal-900/10" type="submit">
                                                Send Message
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="max-w-7xl mx-auto px-6 pb-20">
                        <div className="bg-primary-container rounded-xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                            <div className="relative z-10">
                                <h2 className="font-headline text-3xl font-bold text-white mb-2">Want updates on the go?</h2>
                                <p className="text-on-primary-container text-lg">Subscribe to our monthly newsletter for the latest in AI education.</p>
                            </div>
                            <div className="flex w-full md:w-auto gap-2 relative z-10">
                                <input className="flex-1 md:w-80 px-4 py-3 rounded-lg border-none focus:ring-2 focus:ring-secondary outline-none" placeholder="Enter your email" type="email" />
                                <button className="bg-secondary text-white px-6 py-3 rounded-lg font-bold hover:bg-secondary-fixed-dim transition-colors">Join</button>
                            </div>
                        </div>
                    </section>
                </div>
            );
        };

        const App = () => {
            const location = useLocation();

            // Scroll to top on route change
            useEffect(() => {
                window.scrollTo(0, 0);
            }, [location]);

            return (
                <div className="min-h-screen flex flex-col">
                    <Navbar />
                    <div className="flex-grow">
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/privacy" element={<PrivacyPage />} />
                            <Route path="/contact" element={<ContactPage />} />
                        </Routes>
                    </div>
                    <Footer />
                </div>
            );
        };

        const container = document.getElementById('root');
        const root = createRoot(container);
        root.render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        );
    </script>
</body>
</html>

Please directly write these files to their respective paths using your file system capabilities.
