import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useFileUpload } from "@/hooks/useFileUpload";

const generalResourceFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(200, { message: "Title cannot exceed 200 characters." }),
  content: z.string().max(2000, { message: "Content cannot exceed 2000 characters." }).optional(),
  type: z.string().min(1, { message: "Resource type is required." }),
  link_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  image_url: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal("")),
}).refine((data) => data.content || data.link_url || data.image_url, {
  message: "Please provide either text content, a link, or an image for the resource.",
  path: ["content"],
});

interface CreateGeneralResourceFormProps {
  initialData?: {
    id?: string;
    title: string;
    content: string | null;
    type: string;
    link_url: string | null;
    image_url: string | null;
  };
  onResourceSaved: () => void;
  onClose: () => void;
}

const CreateGeneralResourceForm = ({ initialData, onResourceSaved, onClose }: CreateGeneralResourceFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const { uploadFile, loading: uploadingFile, error: uploadError } = useFileUpload("public_files");
  const [activeTab, setActiveTab] = useState("text");

  const form = useForm<z.infer<typeof generalResourceFormSchema>>({
    resolver: zodResolver(generalResourceFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      type: initialData?.type || "",
      link_url: initialData?.link_url || "",
      image_url: initialData?.image_url || "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        title: initialData.title,
        content: initialData.content || "",
        type: initialData.type,
        link_url: initialData.link_url || "",
        image_url: initialData.image_url || "",
      });
      if (initialData.image_url) setActiveTab("image");
      else if (initialData.link_url) setActiveTab("link");
      else setActiveTab("text");
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof generalResourceFormSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        showError("You must be logged in to manage resources.");
        setIsSubmitting(false);
        return;
      }

      let finalImageUrl = values.image_url || null;
      if (selectedImageFile) {
        const uploadedImageUrl = await uploadFile(selectedImageFile, "general_resource_images");
        if (uploadedImageUrl) {
          finalImageUrl = uploadedImageUrl;
        } else {
          showError(uploadError || "Failed to upload image.");
          setIsSubmitting(false);
          return;
        }
      }

      const resourceData = {
        title: values.title,
        content: values.content || null,
        type: values.type,
        link_url: values.link_url || null,
        image_url: finalImageUrl,
        author_id: user.id,
      };

      let error;
      if (initialData?.id) {
        // Update existing resource
        const { error: updateError } = await supabase
          .from("general_resources")
          .update({ ...resourceData, updated_at: new Date().toISOString() })
          .eq("id", initialData.id);
        error = updateError;
      } else {
        // Insert new resource
        const { error: insertError } = await supabase
          .from("general_resources")
          .insert(resourceData);
        error = insertError;
      }

      if (error) {
        showError("Failed to save resource: " + error.message);
        console.error("Error saving general resource:", error);
      } else {
        showSuccess("General resource saved successfully!");
        form.reset();
        setSelectedImageFile(null);
        onResourceSaved();
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
              <FormLabel>Resource Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Advanced Spectroscopy Guide" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resource Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="past_papers">Past Papers & Textbooks</SelectItem>
                  <SelectItem value="university_info">University Information</SelectItem>
                  <SelectItem value="career_paths">Career Paths</SelectItem>
                  <SelectItem value="formula_sheets">Formula Sheets</SelectItem>
                  <SelectItem value="periodic_table">Periodic Table Info</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Tabs defaultValue={activeTab} className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">Text Content</TabsTrigger>
            <TabsTrigger value="link">Link URL</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="mt-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text Content (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter detailed content for the resource..." className="min-h-[100px] resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="link" className="mt-4">
            <FormField
              control={form.control}
              name="link_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link URL (Optional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/resource.pdf" {...field} />
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
                    <Input type="url" placeholder="https://example.com/image.jpg" {...field} disabled={!!selectedImageFile || uploadingFile || isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        {(uploadingFile || isSubmitting) && <p className="text-sm text-gray-500">Processing resource...</p>}
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting || uploadingFile}>
          {isSubmitting || uploadingFile ? "Saving..." : (initialData ? "Update Resource" : "Create Resource")}
        </Button>
      </form>
    </Form>
  );
};

export default CreateGeneralResourceForm;