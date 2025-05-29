import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const formSchema = z.object({
  class_code: z.string().min(1, { message: "Class code is required." }).max(10, { message: "Class code cannot exceed 10 characters." }),
});

interface JoinClassFormProps {
  onClassJoined: () => void;
}

const JoinClassForm = ({ onClassJoined }: JoinClassFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      class_code: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        showError("You must be logged in to join a class.");
        setIsSubmitting(false);
        return;
      }

      // 1. Find the class by class_code
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id")
        .eq("class_code", values.class_code)
        .single();

      if (classError || !classData) {
        showError("Invalid class code or class not found.");
        console.error("Error finding class:", classError);
        setIsSubmitting(false);
        return;
      }

      const classId = classData.id;

      // 2. Check if student is already enrolled
      const { data: existingEnrollment, error: enrollmentCheckError } = await supabase
        .from("class_enrollments")
        .select("id")
        .eq("class_id", classId)
        .eq("student_id", user.id)
        .single();

      if (existingEnrollment) {
        showError("You are already enrolled in this class.");
        setIsSubmitting(false);
        return;
      }

      // 3. Insert enrollment record
      const { error: insertError } = await supabase
        .from("class_enrollments")
        .insert({
          class_id: classId,
          student_id: user.id,
        });

      if (insertError) {
        showError("Failed to join class: " + insertError.message);
        console.error("Error joining class:", insertError);
      } else {
        showSuccess("Successfully joined the class!");
        form.reset();
        onClassJoined(); // Callback to refresh the list of enrolled classes
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Join a Class</h2>
        <FormField
          control={form.control}
          name="class_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class Code</FormLabel>
              <FormControl>
                <Input placeholder="Enter class code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Joining..." : "Join Class"}
        </Button>
      </form>
    </Form>
  );
};

export default JoinClassForm;