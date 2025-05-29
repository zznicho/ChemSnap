import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "./Layout";
import { showError } from "@/utils/toast";
import { updateUserStreak } from "@/utils/streakUtils";

const ProtectedRoute: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        showError("Failed to check session. Please try logging in again.");
        navigate("/login");
        return;
      }

      if (session) {
        setIsAuthenticated(true);
        // Update user streak on authenticated access
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("current_streak, last_activity_date")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile for streak update:", profileError);
        } else if (profile) {
          await updateUserStreak(session.user.id, profile.current_streak, profile.last_activity_date);
        }
      } else {
        setIsAuthenticated(false);
        navigate("/login");
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        // Re-run streak update if session changes (e.g., after login/signup)
        checkAuth();
      } else {
        setIsAuthenticated(false);
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading application...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be redirected by navigate("/login")
  }

  return (
    <Layout>
      <Outlet /> {/* Renders the child route component */}
    </Layout>
  );
};

export default ProtectedRoute;