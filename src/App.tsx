import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Attendance from "./pages/Attendance";
import Records from "./pages/Records";
import Students from "./pages/Students";
import Schedule from "./pages/Schedule";
import SessionStudents from "./pages/SessionStudents";
import TakeAttendance from "./pages/TakeAttendance";
import TakeAttendanceSession from "./pages/TakeAttendanceSession";
import Accounts from "./pages/Accounts";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ExcuseApplication from "./pages/ExcuseApplication";
import AcademicYear from "./pages/AcademicYear";
import Profile from "./pages/Profile";
import { AuthProvider } from "./contexts/AuthContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { useAuth } from "./hooks/useAuth";
import { usePageTitle } from "./hooks/usePageTitle";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Return null to prevent flash during initial auth check
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppRoutes = () => {
  usePageTitle(); // Add dynamic page title hook
  
  return (
    <Routes>
    <Route path="/login" element={<Login />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      }
    />
    <Route
      path="/attendance"
      element={
        <ProtectedRoute>
          <Attendance />
        </ProtectedRoute>
      }
    />
    <Route
      path="/records"
      element={
        <ProtectedRoute>
          <Records />
        </ProtectedRoute>
      }
    />
    <Route
      path="/students"
      element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['admin']}>
            <Students />
          </RoleProtectedRoute>
        </ProtectedRoute>
      }
    />
    <Route
      path="/schedule"
      element={
        <ProtectedRoute>
          <Schedule />
        </ProtectedRoute>
      }
    />
    <Route
      path="/sessions/:sessionId/students"
      element={
        <ProtectedRoute>
          <SessionStudents />
        </ProtectedRoute>
      }
    />
    <Route path="/take-attendance">
      <Route
        index
        element={
          <ProtectedRoute>
            <TakeAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path=":sessionId"
        element={
          <ProtectedRoute>
            <TakeAttendanceSession />
          </ProtectedRoute>
        }
      />
    </Route>
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
    <Route
      path="/accounts"
      element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['admin']}>
            <Accounts />
          </RoleProtectedRoute>
        </ProtectedRoute>
      }
    />
    <Route
      path="/excuse-application"
      element={
        <ProtectedRoute>
          <ExcuseApplication />
        </ProtectedRoute>
      }
    />
    <Route
      path="/academic-year"
      element={
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={['admin']}>
            <AcademicYear />
          </RoleProtectedRoute>
        </ProtectedRoute>
      }
    />
    <Route
      path="/profile"
      element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SidebarProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </SidebarProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;