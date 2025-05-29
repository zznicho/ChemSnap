import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useFileUpload } from "@/hooks/useFileUpload"; // Import the file upload hook
import { updateUserStreak } from "@/utils/streakUtils"; // Import streak utility

const formSchema = z.object({
  submission_text: z.string().max(1000, { message: "Submission text cannot exceed 1000 characters." }).optional(),
  file_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
}).refine((data) => data.submission_text || data.file_url, {
  message: "Please provide either text or a file URL/upload for your submission.",
});

interface SubmitAssignmentFormProps {
  assignmentId: string;
  onSubmissionSuccess: () => void;
  initialSubmission?: {
    submission_text: string | null;
    file_url: string | null;
  } | null;
}

const SubmitAssignmentForm = ({ assignmentId, onSubmissionSuccess, initialSubmission }: SubmitAssignmentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { uploadFile, loading: uploadingFile, error: uploadError } = useFileUpload("public_files");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      submission_text: initialSubmission?.submission_text || "",
      file_url: initialSubmission?.file_url || "",
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (initialSubmission) {
      form.reset({
        submission_text: initialSubmission.submission_text || "",
        file_url: initialSubmission.file_url || "",
      });
    }
  }, [initialSubmission, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      if (!currentUserId) {
        showError("You must be logged in to submit an assignment.");
        setIsSubmitting(false);
        return;
      }

      let submissionFileUrl = values.file_url || null;

      if (selectedFile) {
        const uploadedFileUrl = await uploadFile(selectedFile, "assignment_submissions");
        if (uploadedFileUrl) {
          submissionFileUrl = uploadedFileUrl;
        } else {
          showError(uploadError || "Failed to upload submission file.");
          setIsSubmitting(false);
          return;
        }
      }

      const { data: existingSubmission, error: fetchError } = await supabase
        .from("assignment_submissions")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("student_id", currentUserId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        showError("Failed to check for existing submission: " + fetchError.message);
        console.error("Error checking existing submission:", fetchError);
        setIsSubmitting(false);
        return;
      }

      if (existingSubmission) {
        // Update existing submission
        const { error } = await supabase
          .from("assignment_submissions")
          .update({
            submission_text: values.submission_text || null,
            file_url: submissionFileUrl,
            submitted_at: new Date().toISOString(),
          })
          .eq("id", existingSubmission.id);

        if (error) {
          showError("Failed to update submission: " + error.message);
          console.error("Error updating submission:", error);
        } else {
          showSuccess("Submission updated successfully!");
          setSelectedFile(null);
          onSubmissionSuccess();

          // Update user streak after successful assignment submission
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("current_streak, last_activity_date")
            .eq("id", currentUserId)
            .single();

          if (profileError) {
            console.error("Error fetching profile for streak update:", profileError);
          } else if (profile) {
            await updateUserStreak(currentUserId, profile.current_streak, profile.last_activity_date);
          }
        }
      } else {
        // Insert new submission
        const { error } = await supabase
          .from("assignment_submissions")
          .insert({
            assignment_id: assignmentId,
            student_id: currentUserId,
            submission_text: values.submission_text || null,
            file_url: submissionFileUrl,
          });

        if (error) {
          showError("Failed to submit assignment: " + error.message);
          console.error("Error submitting assignment:", error);
        } else {
          showSuccess("Assignment submitted successfully!");
          form.reset();
          setSelectedFile(null);
          onSubmissionSuccess();

          // Update user streak after successful assignment submission
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("current_streak, last_activity_date")
            .eq("id", currentUserId)
            .single();

          if (profileError) {
            console.error("Error fetching profile for streak update:", profileError);
          } else if (profile) {
            await updateUserStreak(currentUserId, profile.current_streak, profile.last_activity_date);
          }
        }
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Submission</h2>
        <FormField
          control={form.control}
          name="submission_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Submission Text (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Type your answer here..."
                  className="min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Upload File (Optional)</FormLabel>
          <FormControl>
            <Input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              disabled={uploadingFile || isSubmitting}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
        <FormField
          control={form.control}
          name="file_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Or File URL (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/your-document.pdf"
                  {...field}
                  disabled={!!selectedFile || uploadingFile || isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {(uploadingFile || isSubmitting) && <p className="text-sm text-gray-500">Uploading file...</p>}
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting || uploadingFile}>
          {isSubmitting || uploadingFile ? "Submitting..." : (initialSubmission ? "Update Submission" : "Submit Assignment")}
        </Button>
      </form>
    </Form>
  );
};

export default SubmitAssignmentForm;