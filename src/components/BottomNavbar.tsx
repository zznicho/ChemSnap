import { Link, useLocation } from "react-router-dom";
import { Home, Newspaper, Book, Brain, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", icon: Home, path: "/home" },
  { name: "News", icon: Newspaper, path: "/news" },
  { name: "Resources", icon: Book, path: "/resources" },
  { name: "Quizzes", icon: Brain, path: "/quizzes" },
  { name: "Calendar", icon: Calendar, path: "/calendar" },
  { name: "Classrooms", icon: Users, path: "/classrooms" },
];

const BottomNavbar = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50 md:hidden">
      <div className="flex justify-around h-16 items-center">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center text-sm font-medium transition-colors",
              location.pathname === item.path
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="h-6 w-6 mb-1" />
            <span className="text-xs">{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavbar;