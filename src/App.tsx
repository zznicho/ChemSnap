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
import SocialFeed from "./pages/SocialFeed"; // Renamed Home to SocialFeed
import News from "./pages/News";
import Resources from "./pages/Resources";
import Quizzes from "./pages/Quizzes";
import CalendarPage from "./pages/CalendarPage";
import Profile from "./pages/Profile";
import ClassManagement from "./pages/ClassManagement";
import HSCResources from "./pages/HSCResources";
import MyClasses from "./pages/MyClasses";
import AssignmentDetails from "./pages/AssignmentDetails";
import QuizDetails from "./pages/QuizDetails";
import TeacherQuizManagement from "./pages/TeacherQuizManagement";
import ClassDiscussionPage from "./pages/ClassDiscussionPage";
import MyQuizResults from "./pages/MyQuizResults";
import TeacherQuizAnalytics from "./pages/TeacherQuizAnalytics";
import AdminResourcesPage from "./pages/AdminResourcesPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "@/components/theme-provider";

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

            {/* Index route acts as a session gate and redirects */}
            <Route path="/" element={<Index />} />

            {/* Authenticated routes wrapped by ProtectedRoute */}
            <Route element={<ProtectedRoute />}>
              <Route path="/home" element={<Home />} /> {/* New Dashboard */}
              <Route path="/feed" element={<SocialFeed />} /> {/* Renamed Social Feed */}
              <Route path="/news" element={<News />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/quizzes" element={<Quizzes />} />
              <Route path="/quizzes/:quizId" element={<QuizDetails />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/classes" element={<ClassManagement />} />
              <Route path="/hsc-resources" element={<HSCResources />} />
              <Route path="/my-classes" element={<MyClasses />} />
              <Route path="/assignments/:assignmentId" element={<AssignmentDetails />} />
              <Route path="/teacher-quizzes" element={<TeacherQuizManagement />} />
              <Route path="/classes/:classId/discussions" element={<ClassDiscussionPage />} />
              <Route path="/my-quiz-results" element={<MyQuizResults />} />
              <Route path="/quiz-analytics" element={<TeacherQuizAnalytics />} />
              <Route path="/admin/resources" element={<AdminResourcesPage />} />
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