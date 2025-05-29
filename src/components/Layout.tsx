import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home as HomeIcon, Newspaper, Book, Brain, CalendarDays, User, GraduationCap, Library, Users as UsersIcon, FlaskConical, BarChart2 } from "lucide-react"; // Import BarChart2 for analytics
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "./made-with-dyad";
import { supabase } from "@/integrations/supabase/client";
import { ModeToggle } from "./mode-toggle";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
        } else if (profile) {
          setUserRole(profile.role);
        }
      }
      setLoadingRole(false);
    };
    fetchUserRole();
  }, []);

  const navItems = [
    { path: "/", icon: HomeIcon, label: "Home" },
    { path: "/news", icon: Newspaper, label: "News" },
    { path: "/resources", icon: Book, label: "Resources" },
    { path: "/hsc-resources", icon: Library, label: "HSC Resources" },
    { path: "/quizzes", icon: Brain, label: "Quizzes" },
    { path: "/calendar", icon: CalendarDays, label: "Calendar" },
  ];

  // Add Class Management for teachers
  if (!loadingRole && userRole === "teacher") {
    navItems.push({ path: "/classes", icon: GraduationCap, label: "Classes" });
    navItems.push({ path: "/teacher-quizzes", icon: FlaskConical, label: "Manage Quizzes" });
    navItems.push({ path: "/quiz-analytics", icon: BarChart2, label: "Quiz Analytics" }); // New link for teachers
  }
  // Add My Classes and My Quiz Results for students
  if (!loadingRole && userRole === "student") {
    navItems.push({ path: "/my-classes", icon: UsersIcon, label: "My Classes" });
    navItems.push({ path: "/my-quiz-results", icon: Award, label: "My Quiz Results" }); // New link for students
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Bar with Logo and Profile Button */}
      <header className="w-full bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="text-2xl font-extrabold text-primary dark:text-primary-foreground" style={{ fontFamily: 'Chemistry, sans-serif' }}>
          ChemSnap!
        </div>
        <div className="flex items-center space-x-2">
          <ModeToggle />
          <Link to="/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-10 md:hidden">
        <div className="flex justify-around h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center text-sm px-2 ${
                location.pathname === item.path
                  ? "text-primary dark:text-primary-foreground"
                  : "text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-foreground"
              }`}
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="hidden sm:block">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop Sidebar (Optional, for future expansion) */}
      <aside className="hidden md:block fixed left-0 top-0 h-full w-64 bg-sidebar dark:bg-sidebar-background border-r border-sidebar-border dark:border-sidebar-border p-4 pt-20">
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 p-2 rounded-md ${
                location.pathname === item.path
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <MadeWithDyad />
    </div>
  );
};

export default Layout;