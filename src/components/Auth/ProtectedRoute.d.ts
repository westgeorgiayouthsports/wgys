import type { ReactNode } from 'react';
import type { UserRole } from '../../types';
interface ProtectedRouteProps {
    isAuthenticated: boolean;
    requiredRole?: UserRole | 'admin';
    children: ReactNode;
}
declare function ProtectedRoute({ isAuthenticated, requiredRole, children }: ProtectedRouteProps): import("react/jsx-runtime").JSX.Element;
export default ProtectedRoute;
