import { Outlet } from "react-router-dom";

export default function LearnerSidebarLayout() {
  return (
    <main className="learner-shell__content">
      <Outlet />
    </main>
  );
}
