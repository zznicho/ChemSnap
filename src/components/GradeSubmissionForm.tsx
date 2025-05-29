import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const formSchema = z.object({
  grade: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().int().min(0, { message: "Grade cannot be negative." }).max(1000, { message: "Grade cannot exceed 1000." }).nullable().optional(),
  ),
  teacher_comments: z.string().max(500, { message: "Comments cannot exceed 500 characters." }).optional(),
});

interface GradeSubmissionFormProps {
  submissionId: string;
  initialGrade: number | null;
  initialComments: string | null;
  totalPoints: number;
  onGradeUpdated: () => void;
}

const GradeSubmissionForm = ({ submissionId, initialGrade, initialComments, totalPoints, onGradeUpdated }: GradeSubmissionFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grade: initialGrade,
      teacher_comments: initialComments || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("assignment_submissions")
        .update({
          grade: values.grade,
          teacher_comments: values.teacher_comments || null,
          graded_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (error) {
        showError("Failed to update grade: " + error.message);
        console.error("Error updating grade:", error);
      } else {
        showSuccess("Grade and comments updated successfully!");
        onGradeUpdated();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 mt-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700">
        <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">Grade Submission</h3>
        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade (out of {totalPoints})</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 85" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="teacher_comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Provide feedback here..." className="min-h-[60px] resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Grade"}
        </Button>
      </form>
    </Form>
  );
};

export default GradeSubmissionForm;