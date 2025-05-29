import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
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
import ClassDiscussionPage from "./pages/ClassDiscussionPage"; // Import ClassDiscussionPage
import Layout from "./components/Layout";
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
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Index />} />
            <Route element={<Layout />}>
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
              <Route path="/classes/:classId/discussions" element={<ClassDiscussionPage />} /> {/* New route for class discussions */}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;