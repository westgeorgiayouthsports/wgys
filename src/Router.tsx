import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import type { RootState } from './store/store';

// Layouts (keep these as regular imports since they're always needed)
import AuthLayout from './components/Layout/AuthLayout';
import MainLayout from './components/Layout/MainLayout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Auth pages (keep these as regular imports - small and needed early)
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';

// Lazy load all other pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Teams = lazy(() => import('./pages/Teams'));
const Admin = lazy(() => import('./pages/Admin'));
const Announcements = lazy(() => import('./pages/Announcements'));
const People = lazy(() => import('./pages/People'));
const MyFamily = lazy(() => import('./pages/MyFamily'));
const Programs = lazy(() => import('./pages/Programs'));
const ProgramDetail = lazy(() => import('./pages/ProgramDetail'));
const RegistrationHelp = lazy(() => import('./pages/RegistrationHelp'));
const Schedules = lazy(() => import('./pages/Schedules'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Lazy load views
const EventsView = lazy(() => import('./components/Events/EventsView'));
const RegistrationsView = lazy(() => import('./components/Registrations/RegistrationsView'));
const RostersView = lazy(() => import('./components/Rosters/RostersView'));
const AdminPagesView = lazy(() => import('./components/AdminPages/AdminPagesView'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-300">Loading...</p>
    </div>
  </div>
);

function Router() {
  const { isAuthenticated, loading, role } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter basename="/wgys">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/signin" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignIn />} />
            <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignUp />} />
          </Route>

          {/* Protected Main Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/signin" replace />} />
            <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/signin" replace />} />
            <Route path="/teams" element={isAuthenticated ? <Teams /> : <Navigate to="/signin" replace />} />
            <Route path="/announcements" element={isAuthenticated ? <Announcements /> : <Navigate to="/signin" replace />} />
            <Route
              path="/people"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} requiredRole="admin">
                  <People />
                </ProtectedRoute>
              }
            />
            <Route
              path="/programs"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} requiredRole="admin">
                  <Programs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/programs/:programId"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} requiredRole="admin">
                  <ProgramDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/schedules" element={isAuthenticated ? <Schedules /> : <Navigate to="/signin" replace />} />
            <Route path="/registration-help" element={isAuthenticated ? <RegistrationHelp /> : <Navigate to="/signin" replace />} />
            <Route path="/my-family" element={isAuthenticated ? <MyFamily /> : <Navigate to="/signin" replace />} />
            <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/signin" replace />} />

            {/* Feature Routes - Events */}
            <Route path="/events" element={isAuthenticated ? <EventsView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />
            <Route path="/events/:teamId" element={isAuthenticated ? <EventsView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />

            {/* Feature Routes - Registrations */}
            <Route path="/registrations" element={isAuthenticated ? <RegistrationsView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />
            <Route path="/registrations/:teamId" element={isAuthenticated ? <RegistrationsView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />

            {/* Feature Routes - Rosters */}
            <Route path="/rosters" element={isAuthenticated ? <RostersView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />
            <Route path="/rosters/:teamId" element={isAuthenticated ? <RostersView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />

            {/* Feature Routes - Admin Pages */}
            <Route path="/admin-pages" element={isAuthenticated ? <AdminPagesView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />
            <Route path="/admin-pages/:page" element={isAuthenticated ? <AdminPagesView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />

            {/* Admin Panel Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute isAuthenticated={isAuthenticated} requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default Router;