import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const loginFormSchema = z.object({
  identifier: z.string().min(1, { message: "Email or Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

const Login = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordDialogOpen, setIsForgotPasswordDialogOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (values: z.infer<typeof loginFormSchema>) => {
    setIsSubmitting(true);
    try {
      let emailToLogin: string | undefined = undefined;

      // Check if the identifier is an email or a username
      if (values.identifier.includes("@")) {
        emailToLogin = values.identifier;
      } else {
        // Assume it's a username, try to find the associated email
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", values.identifier)
          .single();

        if (profileError || !profileData) {
          showError("Invalid username or password.");
          setIsSubmitting(false);
          return;
        }
        emailToLogin = profileData.email;
      }

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password: values.password,
      });

      if (error) {
        showError("Login failed: " + error.message);
        console.error("Login error:", error);
      } else if (signInData.user) {
        // After successful sign-in, check if the user is blocked
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_blocked")
          .eq("id", signInData.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile after login:", profileError);
          showError("Failed to load user profile. Please try logging in again.");
          await supabase.auth.signOut(); // Sign out if profile can't be fetched
          setIsSubmitting(false);
          return;
        }

        if (profile && profile.is_blocked) {
          showError("Your account has been blocked. Please contact support.");
          await supabase.auth.signOut(); // Sign out blocked user
          setIsSubmitting(false);
          return;
        }

        showSuccess("Logged in successfully!");
        navigate("/");
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setIsSendingResetEmail(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });

      if (error) {
        showError("Failed to send password reset email: " + error.message);
        console.error("Error sending reset email:", error);
      } else {
        showSuccess("Password reset email sent! Check your inbox.");
        setIsForgotPasswordDialogOpen(false);
        setForgotPasswordEmail(""); // Clear the input
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleForgotUsername = () => {
    showSuccess("You can log in using your email address. If you've forgotten both, please contact support.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Log In to ChemSnap!</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Your email or username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Logging In..." : "Sign In"}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          <Button variant="link" className="p-0 h-auto text-blue-600 hover:underline dark:text-blue-400" onClick={() => setIsForgotPasswordDialogOpen(true)}>
            Forgot password?
          </Button>
          <span className="mx-2 text-gray-600 dark:text-gray-400">|</span>
          <Button variant="link" className="p-0 h-auto text-blue-600 hover:underline dark:text-blue-400" onClick={handleForgotUsername}>
            Forgot username?
          </Button>
        </div>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account? <a href="/signup" className="text-blue-600 hover:underline dark:text-blue-400">Sign Up</a>
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={isForgotPasswordDialogOpen} onOpenChange={setIsForgotPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address below. We'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)} className="space-y-4 py-4">
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        id="forgotPasswordEmail"
                        type="email"
                        placeholder="your@example.com"
                        {...field}
                        disabled={isSendingResetEmail}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSendingResetEmail}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSendingResetEmail}>
                  {isSendingResetEmail ? "Sending..." : "Send Reset Link"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;