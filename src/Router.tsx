import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store/store';

// Pages
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Admin from './pages/Admin';
import Announcements from './pages/Announcements';
import People from './pages/People';
import MyFamily from './pages/MyFamily';
import Programs from './pages/Programs';
import ProgramDetail from './pages/ProgramDetail';
import RegistrationHelp from './pages/RegistrationHelp';
import Schedules from './pages/Schedules';
import Settings from './pages/Settings';

import UserManagement from './pages/UserManagement';
import NotFound from './pages/NotFound';

// Layouts
import AuthLayout from './components/Layout/AuthLayout';
import MainLayout from './components/Layout/MainLayout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Views
import EventsView from './components/Events/EventsView';
import RegistrationsView from './components/Registrations/RegistrationsView';
import RostersView from './components/Rosters/RostersView';
import AdminPagesView from './components/AdminPages/AdminPagesView';


function Router() {
  const { isAuthenticated, loading, role } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
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


          {/* New Feature Routes - Events */}
          <Route path="/events" element={isAuthenticated ? <EventsView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />
          <Route path="/events/:teamId" element={isAuthenticated ? <EventsView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />

          {/* New Feature Routes - Registrations */}
          <Route path="/registrations" element={isAuthenticated ? <RegistrationsView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />
          <Route path="/registrations/:teamId" element={isAuthenticated ? <RegistrationsView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />

          {/* New Feature Routes - Rosters */}
          <Route path="/rosters" element={isAuthenticated ? <RostersView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />
          <Route path="/rosters/:teamId" element={isAuthenticated ? <RostersView isAdmin={role === 'admin'} /> : <Navigate to="/signin" replace />} />

          {/* New Feature Routes - Admin Pages */}
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
    </BrowserRouter>
  );  

  // return (
  //   <BrowserRouter>
  //     <Routes>
  //       {/* Auth Routes */}
  //       <Route element={<AuthLayout />}>
  //         <Route path="/signin" element={<SignIn />} />
  //         <Route path="/signup" element={<SignUp />} />
  //       </Route>

  //       {/* Protected Routes */}
  //       <Route element={<MainLayout />}>
  //         <Route
  //           path="/dashboard"
  //           element={
  //             <ProtectedRoute isAuthenticated={isAuthenticated}>
  //               <Dashboard />
  //             </ProtectedRoute>
  //           }
  //         />
  //         <Route
  //           path="/teams"
  //           element={
  //             <ProtectedRoute isAuthenticated={isAuthenticated}>
  //               <Teams />
  //             </ProtectedRoute>
  //           }
  //         />
  //         <Route
  //           path="/announcements"
  //           element={
  //             <ProtectedRoute isAuthenticated={isAuthenticated}>
  //               <Announcements />
  //             </ProtectedRoute>
  //           }
  //         />
  //         <Route
  //           path="/contacts"
  //           element={
  //             <ProtectedRoute isAuthenticated={isAuthenticated}>
  //               <Contacts />
  //             </ProtectedRoute>
  //           }
  //         />
  //         <Route
  //           path="/schedules"
  //           element={
  //             <ProtectedRoute isAuthenticated={isAuthenticated}>
  //               <Schedules />
  //             </ProtectedRoute>
  //           }
  //         />
  //         <Route
  //           path="/settings"
  //           element={
  //             <ProtectedRoute isAuthenticated={isAuthenticated}>
  //               <Settings />
  //             </ProtectedRoute>
  //           }
  //         />

  //         {/* Admin Routes */}
  //         <Route
  //           path="/admin"
  //           element={
  //             <ProtectedRoute isAuthenticated={isAuthenticated} requiredRole="admin">
  //               <Admin />
  //             </ProtectedRoute>
  //           }
  //         />
  //         <Route
  //           path="/admin/announcements"
  //           element={
  //             <ProtectedRoute isAuthenticated={isAuthenticated} requiredRole="admin">
  //               <Announcements />
  //             </ProtectedRoute>
  //           }
  //         />
  //       </Route>

  //       {/* Default & 404 Routes */}
  //       <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/signin'} />} />
  //       <Route path="*" element={<NotFound />} />
  //     </Routes>
  //   </BrowserRouter>
  // );
}

export default Router;
