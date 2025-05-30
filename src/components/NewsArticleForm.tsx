import { useState, useEffect } from "react";
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

const newsArticleFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(200, { message: "Title cannot exceed 200 characters." }),
  content: z.string().max(5000, { message: "Content cannot exceed 5000 characters." }).optional(), // Increased max length
  image_url: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal("")),
  file_url: z.string().url({ message: "Please enter a valid file URL." }).optional().or(z.literal("")),
}).refine((data) => data.content || data.image_url || data.file_url, {
  message: "Please provide either text content, an image, or a file for the news article.",
  path: ["content"],
});

interface CreateNewsArticleFormProps {
  initialData?: {
    id?: string;
    title: string;
    content: string | null;
    image_url: string | null;
    file_url: string | null;
  };
  onArticleSaved: () => void;
  onClose: () => void;
}

const CreateNewsArticleForm = ({ initialData, onArticleSaved, onClose }: CreateNewsArticleFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("text");

  const { uploadFile, loading: uploadingFile, error: uploadError } = useFileUpload("public_files");

  const form = useForm<z.infer<typeof newsArticleFormSchema>>({
    resolver: zodResolver(newsArticleFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      image_url: initialData?.image_url || "",
      file_url: initialData?.file_url || "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        content: initialData.content || "",
        image_url: initialData.image_url || "",
        file_url: initialData.file_url || "",
      });
      if (initialData.image_url) setActiveTab("image");
      else if (initialData.file_url) setActiveTab("file");
      else setActiveTab("text");
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof newsArticleFormSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        showError("You must be logged in to create a news article.");
        setIsSubmitting(false);
        return;
      }

      let imageUrl = values.image_url || null;
      let fileUrl = values.file_url || null;

      if (selectedImageFile) {
        const uploadedImageUrl = await uploadFile(selectedImageFile, "news_images");
        if (uploadedImageUrl) {
          imageUrl = uploadedImageUrl;
        } else {
          showError(uploadError || "Failed to upload image.");
          setIsSubmitting(false);
          return;
        }
      }

      if (selectedFile) {
        const uploadedFileUrl = await uploadFile(selectedFile, "news_files");
        if (uploadedFileUrl) {
          fileUrl = uploadedFileUrl;
        } else {
          showError(uploadError || "Failed to upload file.");
          setIsSubmitting(false);
          return;
        }
      }

      const articleData = {
        title: values.title,
        content: values.content || null,
        image_url: imageUrl,
        file_url: fileUrl,
        author_id: user.id,
      };

      let error;
      if (initialData?.id) {
        // Update existing article
        const { error: updateError } = await supabase
          .from("news_articles")
          .update(articleData)
          .eq("id", initialData.id);
        error = updateError;
      } else {
        // Insert new article
        const { error: insertError } = await supabase
          .from("news_articles")
          .insert(articleData);
        error = insertError;
      }

      if (error) {
        showError("Failed to save news article: " + error.message);
        console.error("Error saving news article:", error);
      } else {
        showSuccess("News article saved successfully!");
        form.reset();
        setSelectedImageFile(null);
        setSelectedFile(null);
        onArticleSaved();
        onClose();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Article Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Breakthrough in Quantum Chemistry" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Tabs defaultValue={activeTab} className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="mt-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text Content (Optional)</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Write your news article content here..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="image" className="mt-4">
            <FormItem>
              <FormLabel>Upload Image (Optional)</FormLabel>
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
              name="image_url"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel>Or Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/news-image.jpg"
                      {...field}
                      disabled={!!selectedImageFile || uploadingFile || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="file" className="mt-4">
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
                <FormItem className="mt-2">
                  <FormLabel>Or File URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/news-document.pdf"
                      {...field}
                      disabled={!!selectedFile || uploadingFile || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        {(uploadingFile || isSubmitting) && <p className="text-sm text-gray-500">Processing...</p>}
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting || uploadingFile}>
          {isSubmitting || uploadingFile ? "Creating..." : "Create Article"}
        </Button>
      </form>
    </Form>
  );
};

export default CreateNewsArticleForm;