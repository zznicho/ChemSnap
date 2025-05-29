import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import Home from "./Home";
import Login from "./Login"; // Import the Login component
import { updateUserStreak } from "@/utils/streakUtils";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSessionAndProfile = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
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
      }
      setLoading(false);
    };

    checkSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // No need to navigate here, the component will render Login directly
      } else {
        // Re-run streak update if session changes (e.g., after login/signup)
        checkSessionAndProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Removed navigate from dependency array as it's not directly used in the effect's logic for re-runs

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading application...</p>
      </div>
    );
  }

  if (!session) {
    return <Login />; // Render the Login component directly if no session
  }

  return (
    <Layout>
      <Home />
    </Layout>
  );
};

export default Index;