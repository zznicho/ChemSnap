import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input"; // Import Input for URLs
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Import FormLabel
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const formSchema = z.object({
  content_text: z.string().max(500, { message: "Post content cannot exceed 500 characters." }).optional(), // Make text optional if image/video is present
  content_image_url: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal("")),
  content_video_url: z.string().url({ message: "Please enter a valid video URL." }).optional().or(z.literal("")),
}).refine((data) => data.content_text || data.content_image_url || data.content_video_url, {
  message: "Post cannot be empty. Please provide text, an image URL, or a video URL.",
});

interface CreatePostFormProps {
  onPostCreated: () => void;
}

const CreatePostForm = ({ onPostCreated }: CreatePostFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content_text: "",
      content_image_url: "",
      content_video_url: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        showError("You must be logged in to create a post.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content_text: values.content_text || null,
          content_image_url: values.content_image_url || null,
          content_video_url: values.content_video_url || null,
        });

      if (error) {
        showError("Failed to create post: " + error.message);
        console.error("Error creating post:", error);
      } else {
        showSuccess("Post created successfully!");
        form.reset();
        onPostCreated(); // Callback to refresh posts in Home component
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Post</h2>
        <FormField
          control={form.control}
          name="content_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Text Content (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's on your mind, ChemSnap!?"
                  className="min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content_image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content_video_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Post"}
        </Button>
      </form>
    </Form>
  );
};

export default CreatePostForm;