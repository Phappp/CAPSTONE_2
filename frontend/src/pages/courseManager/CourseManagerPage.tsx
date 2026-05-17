import { Link, useLocation } from "react-router-dom";

const navItems = [
  { icon: "dashboard", label: "Overview", path: "/teacher/dashboard" },
  { icon: "analytics", label: "Student Insights", path: "/teacher/analytics" },
  { icon: "library_books", label: "Curriculum", path: "/teacher/course-builder" },
  { icon: "assignment_add", label: "Assignments", path: "/teacher/courses/1/assignment-editor" },
  { icon: "rule", label: "Grading", path: "/teacher/courses/1/grading" },
  { icon: "forum", label: "Discussions", path: "/teacher/discussions" },
];

export default function CourseManagerPage() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-slate-900">MindBridge E-Learning</Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/teacher/dashboard" className="text-teal-600 font-bold border-b-2 border-teal-600 h-16 flex items-center">Dashboard</Link>
            <Link to="/teacher/analytics" className="text-slate-500 font-medium hover:text-teal-500 transition-colors h-16 flex items-center">Analytics</Link>
            <Link to="/courses" className="text-slate-500 font-medium hover:text-teal-500 transition-colors h-16 flex items-center">Courses</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input className="pl-10 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-teal-500 w-64" placeholder="Search courses..." type="text" />
          </div>
          <button className="p-2 text-slate-500 hover:text-teal-500 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-slate-500 hover:text-teal-500 transition-colors">
            <span className="material-symbols-outlined">help</span>
          </button>
          <img alt="Instructor Profile" className="w-8 h-8 rounded-full border border-slate-200" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzXLRh2nG0Mj7kf1g23jjO6rXgNVu-aZ6O0UomYxmK3Ad7n5UcOXlcA-3YOqH9FW8pR68JOWJGfjbjDo1-YSTUJfCGhVpReNs074AYLMztso3KJRQby53KwnJZIyTU0jAJEijroNqPatkc6_4PTyc-BwcP6abuX7zYitbeA11TwarWmETwrDyN5tr034P4fQ4JRyFpux8N1B1D1dN385sPNjo3F20M8lqz5vz7Mt27RwsDpono_9HqyMzofUuUfEVNtxOibzY-3w" />
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-0 h-full w-64 flex flex-col p-4 z-40 bg-slate-50 border-r border-slate-200 pt-20">
        <div className="mb-8 px-2">
          <h2 className="text-lg font-black text-slate-900">Instructor Suite</h2>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">MindBridge AI</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                currentPath === item.path || (item.path === "/teacher/courses" && currentPath.includes("/teacher/courses"))
                  ? "bg-teal-50 text-teal-700 font-semibold scale-95"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-200 space-y-1">
          <Link to="/contact" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all text-sm">
            <span className="material-symbols-outlined">contact_support</span>
            <span>Support</span>
          </Link>
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-all text-sm">
            <span className="material-symbols-outlined">manage_accounts</span>
            <span>Account</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 pt-16 min-h-screen bg-slate-50/50">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header Section */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Course Manager</h1>
              <p className="text-slate-500 mt-1">Design, manage, and monitor your curriculum performance.</p>
            </div>
            <Link
              to="/teacher/courses/new"
              className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
              Create New Course
            </Link>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-8 border-b border-slate-200 mb-8">
            <button className="pb-4 text-sm font-bold text-teal-600 border-b-2 border-teal-600">All Courses</button>
            <button className="pb-4 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">Drafts</button>
            <button className="pb-4 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">Published</button>
            <button className="pb-4 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">Archived</button>
          </div>

          {/* Courses Grid Layout */}
          <div className="grid grid-cols-1 gap-4">
            {/* Course Card 1 */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200 flex items-center gap-6 hover:shadow-md transition-shadow group">
              <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                <img alt="Advanced Python" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmcFuII38XtKHtZUnkEM0CQpvU85a1KS2auGDUYmtUjYcxFJ7ZQ-Z_jzzbKt4EvvDp4guSeG5umK93qxd1oXU9a2L3NF-GfpIbAXGF5PLxKRq3AsJAzWlERp4p5Xgu7A14GgI7K-gkkweIv641PU3ir90MqViaQfcKc5zWEnPZKX_bJf-2BYrcy-1JEt-myL43EgFmcnYuxLqiLrivW2mwwT7IAPPJ1a-Fece2QqxhcfDPOWGIo9bGGSrQugQg7zOTuQ5IUwAWYg" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate">Advanced Neural Networks with Python</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">Live</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">group</span>
                    1,284 Students
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">calendar_today</span>
                    Updated Oct 12, 2023
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link to="/teacher/courses/1/edit" className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Edit">
                  <span className="material-symbols-outlined">edit</span>
                </Link>
                <Link to="/courses/advanced-neural-networks" className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Preview">
                  <span className="material-symbols-outlined">visibility</span>
                </Link>
                <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Settings">
                  <span className="material-symbols-outlined">settings</span>
                </button>
              </div>
            </div>

            {/* Course Card 2 */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200 flex items-center gap-6 hover:shadow-md transition-shadow group">
              <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                <img alt="UI Design" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI7qKyjYq2GoU7d8jYGXRwECyS15tCtX9Att8yOYtKdyv9fzRUMv--zS_qGY6VST7TaU-64CPA5haIzVH92jK9eSxsn2pch1x1KyZujF4HLzmQ2XIR6aWV3MLo2jvoBsITh_i19PV2FzOKxf1fLyjvvBDkN1CA4padliJ2XJwg_Io4eCNAFfMqyPYyUVb4OKjTTs7F-N2nEhYzR7GM29PqerEC2uolkYiDpmxOQR0oRQKT3umwotw-RK_7TmgMJZ6HH09hnr-2Qw" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate">Human-Centered UI Design Foundations</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">Reviewing</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">group</span>
                    0 Students
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">calendar_today</span>
                    Updated 2 hours ago
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link to="/teacher/courses/2/edit" className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Edit">
                  <span className="material-symbols-outlined">edit</span>
                </Link>
                <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Preview">
                  <span className="material-symbols-outlined">visibility</span>
                </button>
                <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Settings">
                  <span className="material-symbols-outlined">settings</span>
                </button>
              </div>
            </div>

            {/* Course Card 3 */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200 flex items-center gap-6 hover:shadow-md transition-shadow group">
              <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                <img alt="Business Strategy" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDoTHvMIw9d3ASheenoO7Nsc_WH2-WI4bC18qHa_gzK7c2d1aNQ1D1jegCsYlevVWq9jgW-Q2iIkZI0x63RfX-_QUtsBVNc4REW2EO7KuC1h_1PSXaKsBm1OwHyI-nA3Ne02xCG4ljNWM3EAMuPoyY7usx2Y0R8gM1z2mYZZmJ_6TOe_dE-OZo9-3wMb0foY2_uHxS2Rm_Cw1gOsO8FRnXEdjKjrLO6dgitoaujaqapobvGSIwFS6EmDJxL7_ZoxjSMH3sXKjJ1Q" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate">AI for Business Strategy & Growth</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">Live</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">group</span>
                    3,410 Students
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">calendar_today</span>
                    Updated Sep 28, 2023
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link to="/teacher/courses/3/edit" className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Edit">
                  <span className="material-symbols-outlined">edit</span>
                </Link>
                <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Preview">
                  <span className="material-symbols-outlined">visibility</span>
                </button>
                <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Settings">
                  <span className="material-symbols-outlined">settings</span>
                </button>
              </div>
            </div>

            {/* Course Card 4 - Archived */}
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-slate-200 flex items-center gap-6 hover:shadow-md transition-shadow group">
              <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                <img alt="Web Dev" className="w-full h-full object-cover opacity-60 grayscale" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV6_kjNA8kbrBKu-ivV90b3EuZn90kUg-yyX9oHG0LBN_wJbnCTclGqMgUBhXcC3iIKRmVDOZz6d8EzXAWxMnmEr8akfihYO4NsFMZYdk2zNBlea25gZFZ0ioQtL2HHk-GUCCJ2N35v6kahq1_a3fHYQaqzOqA6JUBVoYtlf6JJNkYn8WjVYlSAwLj3hLtYfuQkex1A2T49mZ0GtyO-Gkci49UtmAHiLdxCo9hO79JI92qGIhLRYwNfS0xrQApjorXBbeZH4sJ0g" />
              </div>
              <div className="flex-1 min-w-0 opacity-60">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate">Legacy PHP Masterclass (2019)</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600">Archived</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">group</span>
                    892 Students
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">calendar_today</span>
                    Updated 2 years ago
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Restore">
                  <span className="material-symbols-outlined">unarchive</span>
                </button>
                <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all" title="Settings">
                  <span className="material-symbols-outlined">settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard Stats Summary */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 bg-primary p-6 rounded-2xl text-white shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="text-on-primary-container font-bold text-sm uppercase tracking-widest mb-2">Active Students</h4>
                <div className="text-4xl font-black font-headline">4,694</div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-teal-400 font-bold text-sm">
                <span className="material-symbols-outlined">trending_up</span>
                +12% from last month
              </div>
            </div>
            <div className="col-span-1 md:col-span-2 bg-surface-container-high p-6 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-slate-900 font-bold">Quick Insights</h4>
                <span className="text-xs font-semibold px-2 py-1 bg-slate-200 rounded text-slate-600 uppercase">Live Now</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200/50">
                  <p className="text-xs text-slate-500 font-bold mb-1">COMPLETION RATE</p>
                  <p className="text-2xl font-black text-slate-800">84.2%</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200/50">
                  <p className="text-xs text-slate-500 font-bold mb-1">AVERAGE RATING</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black text-slate-800">4.9</p>
                    <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
