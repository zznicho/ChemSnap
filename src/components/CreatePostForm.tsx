import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import RichTextEditor from "@/components/RichTextEditor"; // Import RichTextEditor

const formSchema = z.object({
  content_text: z.string().max(5000, { message: "Post content cannot exceed 5000 characters." }).optional(), // Increased max length for rich text
  content_image_url: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal("")),
  content_video_url: z.string().url({ message: "Please enter a valid video URL." }).optional().or(z.literal("")),
  content_embed_url: z.string().url({ message: "Please enter a valid embed URL." }).optional().or(z.literal("")), // New embed URL field
}).refine((data) => data.content_text || data.content_image_url || data.content_video_url || data.content_embed_url, {
  message: "Post cannot be empty. Please provide text, an image URL/file, a video URL/file, or an embed link.",
});

interface CreatePostFormProps {
  onPostCreated: () => void;
}

const CreatePostForm = ({ onPostCreated }: CreatePostFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("text");

  const { uploadFile, loading: uploadingFile, error: uploadError } = useFileUpload("public_files");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content_text: "",
      content_image_url: "",
      content_video_url: "",
      content_embed_url: "", // Initialize new field
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

      let imageUrl = values.content_image_url || null;
      let videoUrl = values.content_video_url || null;
      let embedUrl = values.content_embed_url || null; // Get embed URL

      if (selectedImageFile) {
        const uploadedImageUrl = await uploadFile(selectedImageFile, "post_images");
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl;
        } else {
          showError(uploadError || "Failed to upload image.");
          setIsSubmitting(false);
          return;
        }
      }

      if (selectedVideoFile) {
        const uploadedVideoUrl = await uploadFile(selectedVideoFile, "post_videos");
        if (uploadedVideoUrl) {
          videoUrl = uploadedVideoUrl;
        } else {
          showError(uploadError || "Failed to upload video.");
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content_text: values.content_text || null,
          content_image_url: imageUrl,
          content_video_url: videoUrl,
          content_embed_url: embedUrl, // Insert embed URL
        });

      if (error) {
        showError("Failed to create post: " + error.message);
        console.error("Error creating post:", error);
      } else {
        showSuccess("Post created successfully!");
        form.reset();
        setSelectedImageFile(null);
        setSelectedVideoFile(null);
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Share Your ChemSnap! Moment</h2>

        <Tabs defaultValue="text" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4"> {/* Increased grid columns */}
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="embed">Embed Link</TabsTrigger> {/* New tab */}
          </TabsList>
          <TabsContent value="text" className="mt-4">
            <FormField
              control={form.control}
              name="content_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text Content</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="What's on your mind, ChemSnap!?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="image" className="mt-4">
            <FormItem>
              <FormLabel>Upload Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedImageFile(e.target.files ? e.target.files[0] : null)}
                  disabled={uploadingFile || isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormField
              control={form.control}
              name="content_image_url"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel>Or Image URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      {...field}
                      disabled={!!selectedImageFile || uploadingFile || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="video" className="mt-4">
            <FormItem>
              <FormLabel>Upload Video</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setSelectedVideoFile(e.target.files ? e.target.files[0] : null)}
                  disabled={uploadingFile || isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormField
              control={form.control}
              name="content_video_url"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel>Or Video URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/video.mp4"
                      {...field}
                      disabled={!!selectedVideoFile || uploadingFile || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="embed" className="mt-4"> {/* New tab content */}
            <FormField
              control={form.control}
              name="content_embed_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embed Link</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="Paste a social media post link (e.g., Instagram, TikTok)"
                      {...field}
                      disabled={uploadingFile || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        {(uploadingFile || isSubmitting) && <p className="text-sm text-gray-500">Processing files...</p>}
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting || uploadingFile}>
          {isSubmitting || uploadingFile ? "Posting..." : "Post"}
        </Button>
      </form>
    </Form>
  );
};

export default CreatePostForm;