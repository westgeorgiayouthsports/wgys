import { Navigate, ReactNode } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  requiredRole?: UserRole | 'admin';
  children: ReactNode;
}

function ProtectedRoute({ isAuthenticated, requiredRole, children }: ProtectedRouteProps) {
  const { role } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (requiredRole) {
    // Special case: 'admin' requirement allows both admin and owner roles
    if (requiredRole === 'admin' && role !== 'admin' && role !== 'owner') {
      return <Navigate to="/dashboard" replace />;
    }
    // Exact role match for other roles
    else if (requiredRole !== 'admin' && role !== requiredRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
