import { BookOpen } from 'lucide-react';
import './LearnerFab.css';

interface LearnerFabProps {
  onClick?: () => void;
}

export default function LearnerFab({ onClick }: LearnerFabProps) {
  return (
    <button
      type="button"
      className="learner-fab"
      aria-label="Khóa học của tôi"
      onClick={onClick}
    >
      <BookOpen size={22} strokeWidth={2.6} />
    </button>
  );
}
