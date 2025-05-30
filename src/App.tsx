import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home"; // New Home (Dashboard)
import Feed from "./pages/Feed"; // Renamed SocialFeed to Feed
import News from "./pages/News";
import Resources from "./pages/Resources";
import Quizzes from "./pages/Quizzes";
import CalendarPage from "./pages/CalendarPage";
import Profile from "./pages/Profile";
import ClassManagement from "./pages/ClassManagement";
import MyClasses from "./pages/MyClasses";
import AssignmentDetails from "./pages/AssignmentDetails";
import QuizDetails from "./pages/QuizDetails";
import ClassDiscussionPage from "./pages/ClassDiscussionPage";
import MyQuizResults from "./pages/MyQuizResults";
import AdminResourcesPage from "./pages/AdminResourcesPage";
import UserManagement from "./pages/UserManagement"; // Import UserManagement
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "@/components/theme-provider";
import ResetPassword from "./pages/ResetPassword"; // Import ResetPassword

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} /> {/* New Reset Password route */}

            {/* Index route acts as a session gate and redirects */}
            <Route path="/" element={<Index />} />

            {/* Authenticated routes wrapped by ProtectedRoute */}
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<Home />} /> {/* New Dashboard */}
              <Route path="/feed" element={<Feed />} /> {/* Renamed Social Feed */}
              <Route path="/news" element={<News />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/quizzes" element={<Quizzes />} />
              <Route path="/quizzes/:quizId" element={<QuizDetails />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:userId" element={<Profile />} /> {/* New dynamic profile route */}
              <Route path="/classes" element={<ClassManagement />} />
              {/* Removed /hsc-resources as it's now part of /resources */}
              <Route path="/my-classes" element={<MyClasses />} />
              <Route path="/assignments/:assignmentId" element={<AssignmentDetails />} />
              {/* Removed /teacher-quizzes and /quiz-analytics as they are now tabs within /quizzes */}
              <Route path="/classes/:classId/discussions" element={<ClassDiscussionPage />} />
              <Route path="/my-quiz-results" element={<MyQuizResults />} />
              <Route path="/admin/resources" element={<AdminResourcesPage />} />
              <Route path="/admin/users" element={<UserManagement />} /> {/* New Admin Users route */}
            </Route>

            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;