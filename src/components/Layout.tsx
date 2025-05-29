import React from "react";
import BottomNavbar from "./BottomNavbar";
import ProfileButton from "./ProfileButton";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col">
      <ProfileButton />
      <main className="flex-grow pb-16 md:pb-0"> {/* Add padding for mobile navbar */}
        {children}
      </main>
      {isMobile && <BottomNavbar />}
    </div>
  );
};

export default Layout;