import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { showError, showSuccess } from "@/utils/toast";

const ResetPassword = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
        // User has successfully updated their password or is in the recovery flow
        // We can show a success message and redirect them to login
        showSuccess("Password updated successfully! Please log in with your new password.");
        navigate("/login");
      } else if (session) {
        // If a session exists and it's not a password recovery event, redirect to home
        navigate("/home");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Reset Your Password</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="light"
          view="update_password"
          showLinks={false} // Hide other links like sign in/sign up
          providers={[]} // No third-party providers for password reset
          redirectTo={`${window.location.origin}/reset-password`} // Keep redirect to this page for internal handling
        />
      </div>
    </div>
  );
};

export default ResetPassword;