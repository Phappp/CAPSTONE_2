import {ReactNode} from "react";
import {Navigate} from "react-router-dom";
import {useAuth} from "../contexts/Auth";
import { hasAnyRole, resolvePrimaryRole } from "../utils/roles";

type AuthenticationProps = {
    children: ReactNode;
    fallback?: ReactNode;
    allowedRoles?: string[];
};

export default function Authentication({
                                           children,
                                           fallback,
                                           allowedRoles = [],
                                       }: AuthenticationProps) {
    const {isAuthenticated, user} = useAuth();

    if (!isAuthenticated) {
        return fallback ? <>{fallback}</> : <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !hasAnyRole(user, allowedRoles)) {
        const role = resolvePrimaryRole(user);
        if (role === "admin") return <Navigate to="/admin" replace />;
        if (role === "course_manager" || role === "teacher") {
            return <Navigate to="/teacher/dashboard" replace />;
        }
        return <Navigate to="/student/dashboard" replace />;
    }

    return (
        <>{children}</>
    );
}
