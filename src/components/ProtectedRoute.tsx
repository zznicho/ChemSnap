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
      console.log("ProtectedRoute: Checking authentication status...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("ProtectedRoute: Error fetching session:", sessionError);
        showError("Failed to check session. Please try logging in again.");
        navigate("/login");
        setLoading(false);
        return;
      }

      if (session) {
        console.log("ProtectedRoute: Session found, fetching user profile for ID:", session.user.id);
        // Fetch user profile to check for blocked status
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, current_streak, last_activity_date, is_blocked")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("ProtectedRoute: Error fetching profile for auth check:", profileError);
          showError("Failed to load user profile. Please try logging in again.");
          await supabase.auth.signOut(); // Sign out if profile can't be fetched
          navigate("/login");
          setLoading(false);
          return;
        }

        if (!profile) {
          console.error("ProtectedRoute: Profile not found for user ID:", session.user.id);
          showError("Failed to load user profile. Profile data is missing. Please try logging in again.");
          await supabase.auth.signOut(); // Sign out if profile is missing
          navigate("/login");
          setLoading(false);
          return;
        }

        if (profile.is_blocked) {
          console.warn("ProtectedRoute: User account is blocked for ID:", session.user.id);
          showError("Your account has been blocked. Please contact support.");
          await supabase.auth.signOut(); // Sign out blocked user
          navigate("/login");
          setLoading(false);
          return;
        }

        console.log("ProtectedRoute: User authenticated and profile loaded successfully for ID:", session.user.id);
        setIsAuthenticated(true);
        // Update user streak on authenticated access (only if not blocked)
        await updateUserStreak(session.user.id, profile.current_streak, profile.last_activity_date);
      } else {
        console.log("ProtectedRoute: No active session found, redirecting to login.");
        setIsAuthenticated(false);
        navigate("/login");
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("ProtectedRoute: Auth state changed. Event:", _event, "Session:", session);
      if (session) {
        // Re-run full auth check including blocked status if session changes
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