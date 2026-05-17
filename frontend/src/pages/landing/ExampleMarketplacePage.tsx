import { Link } from "react-router-dom";

const categories = [
  { name: "AI & Machine Learning", checked: true },
  { name: "Business Strategy", checked: false },
  { name: "Tech Stack Mastery", checked: false },
  { name: "Design & UX", checked: false },
];

const difficulties = [
  { name: "Beginner", checked: false },
  { name: "Professional", checked: true },
  { name: "Expert", checked: false },
];

const instructors = [
  { name: "Top Rated", checked: false },
  { name: "Verified Only", checked: false },
];

const courses = [
  {
    badge: "AI/ML",
    badgeColor: "bg-teal-500",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    title: "Advanced Neural Networks & Deep Learning",
    instructor: "Dr. Sarah Jenkins",
    rating: 4.9,
    price: "$129.99",
  },
  {
    badge: "BUSINESS",
    badgeColor: "bg-blue-500",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
    title: "Strategic Product Management Masterclass",
    instructor: "Marcus Thorne",
    rating: 4.7,
    price: "$89.99",
  },
  {
    badge: "TECH",
    badgeColor: "bg-purple-500",
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800",
    title: "Full-Stack Development with Modern Architectures",
    instructor: "Elena Rodriguez",
    rating: 4.8,
    price: "$149.99",
  },
  {
    badge: "AI/ML",
    badgeColor: "bg-teal-500",
    image: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=800",
    title: "Data Engineering for Scalable Analytics",
    instructor: "Dr. James Wilson",
    rating: 5.0,
    price: "$114.99",
  },
  {
    badge: "DESIGN",
    badgeColor: "bg-pink-500",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800",
    title: "UX Research Methods & Behavioral Analytics",
    instructor: "Sophia Chen",
    rating: 4.6,
    price: "$79.99",
  },
  {
    badge: "BUSINESS",
    badgeColor: "bg-blue-500",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800",
    title: "Agile Leadership & Organizational Growth",
    instructor: "David Grahams",
    rating: 4.9,
    price: "$99.99",
  },
];

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  return "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
};

export default function ExampleMarketplacePage() {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-slate-900">MindBridge</Link>
          <nav className="flex items-center gap-6">
            <Link to="/courses" className="text-slate-600 hover:text-teal-500 transition-colors font-medium">Courses</Link>
            <Link to="/instructors" className="text-slate-600 hover:text-teal-500 transition-colors font-medium">Instructors</Link>
            <Link to="/pricing" className="text-slate-600 hover:text-teal-500 transition-colors font-medium">Pricing</Link>
            <Link to="/login" className="px-4 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-colors">Sign In</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Wrapper */}
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-60 flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Categories</h3>

            <div className="mb-6">
              <div className="filter-group mb-6">
                {categories.map((cat) => (
                  <label key={cat.name} className="flex items-center gap-3 mb-3 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                    <input type="checkbox" defaultChecked={cat.checked} className="w-4 h-4 accent-teal-500" />
                    {cat.name}
                  </label>
                ))}
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Difficulty</h4>
                {difficulties.map((diff) => (
                  <label key={diff.name} className="flex items-center gap-3 mb-3 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                    <input type="checkbox" defaultChecked={diff.checked} className="w-4 h-4 accent-teal-500" />
                    {diff.name}
                  </label>
                ))}
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Instructor</h4>
                {instructors.map((inst) => (
                  <label key={inst.name} className="flex items-center gap-3 mb-3 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                    <input type="checkbox" defaultChecked={inst.checked} className="w-4 h-4 accent-teal-500" />
                    {inst.name}
                  </label>
                ))}
              </div>

              <button className="w-full py-3 border-2 border-teal-500 bg-white text-teal-500 font-bold rounded-lg hover:bg-teal-500 hover:text-white transition-all">
                Clear All Filters
              </button>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-slate-900">Showing 248 premium courses</h2>
              <div className="text-sm">
                Sort by: <strong className="text-slate-900">Most Popular ▼</strong>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, index) => (
                <div key={index} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="relative h-40">
                    <span className={`absolute top-3 left-3 ${course.badgeColor} text-white text-xs font-bold px-2 py-1 rounded`}>
                      {course.badge}
                    </span>
                    <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-slate-500 mb-2">{course.instructor}</p>
                    <div className="text-teal-500 text-sm mb-3">{renderStars(course.rating)} ({course.rating})</div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-slate-900">{course.price}</span>
                      <button className="bg-teal-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-teal-600 transition-colors">
                        View Course
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-center gap-2">
              <button className="w-10 h-10 border border-slate-300 bg-white rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">‹</button>
              <button className="w-10 h-10 bg-teal-500 text-white rounded flex items-center justify-center font-bold">1</button>
              <button className="w-10 h-10 border border-slate-300 bg-white rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">2</button>
              <button className="w-10 h-10 border border-slate-300 bg-white rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">3</button>
              <span className="w-10 h-10 flex items-center justify-center text-slate-400">...</span>
              <button className="w-10 h-10 border border-slate-300 bg-white rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">12</button>
              <button className="w-10 h-10 border border-slate-300 bg-white rounded flex items-center justify-center text-slate-600 hover:bg-slate-50">›</button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
