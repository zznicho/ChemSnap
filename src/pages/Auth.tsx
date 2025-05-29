import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/home");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Welcome to ChemSnap!
        </h2>
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
          view="sign_in"
          redirectTo={window.location.origin + "/home"}
          localization={{
            variables: {
              sign_in: {
                email_label: "Email (Optional)",
                password_label: "Password",
                email_input_placeholder: "Your email address (optional)",
                password_input_placeholder: "Your password",
                button_label: "Sign In",
                social_provider_text: "Sign in with {{provider}}",
                link_text: "Already have an account? Sign In",
              },
              sign_up: {
                email_label: "Email (Optional)",
                password_label: "Create Password",
                email_input_placeholder: "Your email address (optional)",
                password_input_placeholder: "Create your password",
                button_label: "Sign Up",
                social_provider_text: "Sign up with {{provider}}",
                link_text: "Don't have an account? Sign Up",
              },
              forgotten_password: {
                link_text: "Forgot your password?",
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default AuthPage;