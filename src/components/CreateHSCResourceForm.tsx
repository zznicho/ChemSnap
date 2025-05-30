import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import RichTextEditor from "@/components/RichTextEditor"; // Import RichTextEditor

const resourceFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(200, { message: "Title cannot exceed 200 characters." }),
  subject: z.string().min(1, { message: "Subject is required." }),
  year_level: z.string().min(1, { message: "Year level is required." }),
  resource_type: z.string().min(1, { message: "Resource type is required." }),
  content: z.string().max(5000, { message: "Content cannot exceed 5000 characters." }).optional(), // Increased max length
  file_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  tags: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : []),
  difficulty_level: z.string().optional(),
  syllabus_point: z.string().max(500, { message: "Syllabus point cannot exceed 500 characters." }).optional(),
  is_free: z.boolean().default(true),
}).refine((data) => data.content || data.file_url, {
  message: "Either content or a file/URL is required for the resource.",
  path: ["content"],
});

interface CreateHSCResourceFormProps {
  onResourceCreated: () => void;
}

const CreateHSCResourceForm = ({ onResourceCreated }: CreateHSCResourceFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadFile, loading: uploadingFile, error: uploadError } = useFileUpload("hsc_resources_files");

  const form = useForm<z.infer<typeof resourceFormSchema>>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      title: "",
      subject: "",
      year_level: "",
      resource_type: "",
      content: "",
      file_url: "",
      tags: [],
      difficulty_level: "",
      syllabus_point: "",
      is_free: true,
    },
  });

  const onSubmit = async (values: z.infer<typeof resourceFormSchema>) => {
    setIsSubmitting(true);
    try {
      let resourceFileUrl = values.file_url || null;

      if (selectedFile) {
        const uploadedFileUrl = await uploadFile(selectedFile, "documents");
        if (uploadedFileUrl) {
          resourceFileUrl = uploadedFileUrl;
        } else {
          showError(uploadError || "Failed to upload resource file.");
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from("hsc_resources")
        .insert({
          title: values.title,
          subject: values.subject,
          year_level: values.year_level,
          resource_type: values.resource_type,
          content: values.content || null,
          file_url: resourceFileUrl,
          tags: values.tags,
          difficulty_level: values.difficulty_level || null,
          syllabus_point: values.syllabus_point || null,
          is_free: values.is_free,
        });

      if (error) {
        showError("Failed to create resource: " + error.message);
        console.error("Error creating resource:", error);
      } else {
        showSuccess("Resource created successfully!");
        form.reset();
        setSelectedFile(null);
        onResourceCreated();
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New HSC Resource</h2>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resource Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Year 12 Chemistry Notes - Module 5" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="math">Math</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="year_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="year_7">Year 7</SelectItem>
                  <SelectItem value="year_8">Year 8</SelectItem>
                  <SelectItem value="year_9">Year 9</SelectItem>
                  <SelectItem value="year_10">Year 10</SelectItem>
                  <SelectItem value="year_11">Year 11</SelectItem>
                  <SelectItem value="year_12">Year 12</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="resource_type"
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
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="past_papers">Past Papers</SelectItem>
                  <SelectItem value="worksheets">Worksheets</SelectItem>
                  <SelectItem value="videos">Videos</SelectItem>
                  <SelectItem value="articles">Articles</SelectItem>
                  <SelectItem value="quizzes">Quizzes</SelectItem>
                  <SelectItem value="links">Links</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  placeholder="Enter text content for the resource..."
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
                <Input type="url" placeholder="https://example.com/resource.pdf" {...field} disabled={!!selectedFile || uploadingFile || isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (comma-separated, Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., module 5, organic, reactions" {...field} value={Array.isArray(field.value) ? field.value.join(', ') : field.value} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="difficulty_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty Level (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="syllabus_point"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Syllabus Point (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., CH12-13" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_free"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Mark as Free Resource
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        {(uploadingFile || isSubmitting) && <p className="text-sm text-gray-500">Processing resource...</p>}
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting || uploadingFile}>
          {isSubmitting || uploadingFile ? "Creating..." : "Create Resource"}
        </Button>
      </form>
    </Form>
  );
};

export default CreateHSCResourceForm;