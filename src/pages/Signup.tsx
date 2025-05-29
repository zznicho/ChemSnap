import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { showError } from "@/utils/toast";

const Signup = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Create Your ChemSnap! Account</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme="light"
          redirectTo={window.location.origin}
          localization={{
            variables: {
              sign_up: {
                email_label: "Email (Optional)",
                password_label: "Password",
                email_input_placeholder: "Your email address",
                password_input_placeholder: "Create a password (7+ chars, 1 capital/special)",
                button_label: "Sign Up",
                social_provider_text: "Sign up with {{provider}}",
                link_text: "Don't have an account? Sign up",
                password_helper_text: "Passwords must be at least 7 characters and contain a capital letter or special character.",
              },
            },
          }}
          magicLink={true}
          onError={(error) => {
            showError(error.message);
          }}
        />
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline dark:text-blue-400">Log In</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;