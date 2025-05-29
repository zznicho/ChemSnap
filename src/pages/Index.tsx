import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Login from "./Login";
import { updateUserStreak } from "@/utils/streakUtils";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSessionAndProfile = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (currentSession) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("current_streak, last_activity_date")
          .eq("id", currentSession.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile for streak update:", profileError);
        } else if (profile) {
          await updateUserStreak(currentSession.user.id, profile.current_streak, profile.last_activity_date);
        }
        // If session exists, navigate to the actual home route under Layout
        navigate("/home", { replace: true });
      } else {
        setLoading(false); // Only set loading to false if no session, so Login can render
      }
    };

    checkSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkSessionAndProfile(); // Re-run streak update and navigation if session changes
      } else {
        setLoading(false); // If signed out, stop loading and allow Login to render
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]); // Added navigate to dependency array as it's used in the effect

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading application...</p>
      </div>
    );
  }

  // If no session and not loading, render the Login component
  if (!session) {
    return <Login />;
  }

  // This component should ideally redirect and not render anything if session exists
  // The actual content will be rendered by the /home route within the Layout
  return null;
};

export default Index;