import { Link } from "react-router-dom";

export default function PublicSiteFooter() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <span className="text-xl font-bold text-white mb-6 block">MindBridge</span>
          <p className="text-slate-400 text-sm leading-relaxed">
            The world&apos;s leading platform for AI-integrated learning and professional development.
          </p>
        </div>
        <div>
          <h4 className="text-teal-500 font-bold mb-4 uppercase text-xs tracking-widest">Platform</h4>
          <ul className="space-y-2">
            <li><Link to="/courses" className="text-slate-400 text-sm hover:text-white transition-colors">Course Catalog</Link></li>
            <li><Link to="/instructors" className="text-slate-400 text-sm hover:text-white transition-colors">Instructor Directory</Link></li>
            <li><Link to="/pricing" className="text-slate-400 text-sm hover:text-white transition-colors">Pricing Plans</Link></li>
            <li><Link to="/resources" className="text-slate-400 text-sm hover:text-white transition-colors">Resource Hub</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-teal-500 font-bold mb-4 uppercase text-xs tracking-widest">Company</h4>
          <ul className="space-y-2">
            <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">About Us</a></li>
            <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">Careers</a></li>
            <li><Link to="/contact" className="text-slate-400 text-sm hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-teal-500 font-bold mb-4 uppercase text-xs tracking-widest">Legal</h4>
          <ul className="space-y-2">
            <li><Link to="/privacy" className="text-slate-400 text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">Terms of Service</a></li>
            <li><Link to="/contact" className="text-slate-400 text-sm hover:text-white transition-colors">Help Center</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-800 text-center">
        <p className="text-sm font-normal text-slate-400">© 2026 MindBridge Co. The Intelligent Workspace.</p>
      </div>
    </footer>
  );
}
