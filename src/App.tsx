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
import ClassManagement from "./pages/ClassManagement"; // Import ClassManagement
import Layout from "./components/Layout"; // Import the Layout component

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* The Index route now handles authentication and renders Layout + Home */}
          <Route path="/" element={<Index />} />
          {/* Routes wrapped by Layout */}
          <Route element={<Layout />}>
            <Route path="/news" element={<News />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/classes" element={<ClassManagement />} /> {/* New route for Class Management */}
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;