import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useNavigate } from "react-router-dom";

const signupFormSchema = z.object({
  full_name: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(50, { message: "Full name cannot exceed 50 characters." }),
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(30, { message: "Username cannot exceed 30 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores." }),
  email: z.string().email({ message: "Please enter a valid email address." }), // Email is now required
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }) // Changed from 7 to 6
    .regex(/[A-Z]|\W/, { message: "Password must contain at least one capital letter or special character." }),
  confirm_password: z.string(),
  role: z.enum(["student", "teacher", "personal"], { message: "Please select a role." }),
  education_level: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords do not match.",
  path: ["confirm_password"],
}).refine((data) => {
  if (data.role === "student") {
    return !!data.education_level;
  }
  return true;
}, {
  message: "Education level is required for students.",
  path: ["education_level"],
});

const Signup = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const form = useForm<z.infer<typeof signupFormSchema>>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      full_name: "",
      username: "",
      email: "",
      password: "",
      confirm_password: "",
      role: "student", // Default to student
      education_level: "",
    },
  });

  const selectedRole = form.watch("role");

  const hasMinLength = passwordInput.length >= 6; // Changed from 7 to 6
  const hasCapitalOrSpecial = /[A-Z]|\W/.test(passwordInput);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (values: z.infer<typeof signupFormSchema>) => {
    setIsSubmitting(true);
    try {
      const { email, password, full_name, role, education_level, username } = values;

      const { data, error } = await supabase.auth.signUp({
        email: email, // Email is now required
        password,
        options: {
          data: {
            full_name,
            role,
            education_level: role === "student" ? education_level : null,
            username, // Pass the username to raw_user_meta_data
          },
        },
      });

      if (error) {
        showError("Signup failed: " + error.message);
        console.error("Signup error:", error);
      } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        // This case happens if email is optional and not provided, or if email is provided but requires confirmation
        showSuccess("Account created! Please check your email to confirm your account if you provided one.");
        navigate("/login");
      } else {
        showSuccess("Account created successfully!");
        navigate("/");
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Create Your ChemSnap! Account</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Choose a unique username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel> {/* Removed (Optional) */}
                  <FormControl>
                    <Input type="email" placeholder="Your email address" {...field} />
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
                    <Input
                      type="password"
                      placeholder="Create a password"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setPasswordInput(e.target.value);
                      }}
                    />
                  </FormControl>
                  <div className="text-sm mt-2 space-y-1">
                    <p className={`flex items-center ${hasMinLength ? "text-green-500" : "text-gray-500"}`}>
                      <Check className={`h-4 w-4 mr-2 ${hasMinLength ? "text-green-500" : "text-gray-400"}`} />
                      At least 6 characters {/* Updated message */}
                    </p>
                    <p className={`flex items-center ${hasCapitalOrSpecial ? "text-green-500" : "text-gray-500"}`}>
                      <Check className={`h-4 w-4 mr-2 ${hasCapitalOrSpecial ? "text-green-500" : "text-gray-400"}`} />
                      At least one capital letter or special character
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>I am using ChemSnap! as a:</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="personal">Personal User</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedRole === "student" && (
              <FormField
                control={form.control}
                name="education_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Education Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your education level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="year_11_prelim">Year 11 Prelim</SelectItem>
                        <SelectItem value="year_12_hsc">Year 12 HSC</SelectItem>
                        <SelectItem value="university">University</SelectItem>
                        <SelectItem value="post_graduate">Post Graduate</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline dark:text-blue-400">Log In</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;