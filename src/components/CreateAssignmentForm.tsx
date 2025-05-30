import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription

const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100, { message: "Title cannot exceed 100 characters." }),
  description: z.string().max(500, { message: "Description cannot exceed 500 characters." }).optional(),
  due_date: z.date().optional().nullable(),
  total_points: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().int().min(0, { message: "Points cannot be negative." }).max(1000, { message: "Points cannot exceed 1000." }).optional().nullable(),
  ),
  file_url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  class_id: z.string().min(1, { message: "Class is required." }), // Added class_id to schema
});

interface CreateAssignmentFormProps {
  onAssignmentCreated: () => void;
  onClose: () => void; // Added onClose prop
  classId?: string; // Make classId optional for general use, but required for specific class context
}

interface Class {
  id: string;
  name: string;
}

const CreateAssignmentForm = ({ onAssignmentCreated, onClose, classId: propClassId }: CreateAssignmentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);

  const { uploadFile, loading: uploadingFile, error: uploadError } = useFileUpload("public_files");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      due_date: undefined,
      total_points: 100,
      file_url: "",
      class_id: propClassId || "", // Use propClassId if provided, otherwise default to empty
    },
  });

  useEffect(() => {
    // Set class_id from prop if it changes or is initially provided
    if (propClassId) {
      form.setValue("class_id", propClassId);
    }
  }, [propClassId, form]);

  useEffect(() => {
    const fetchUserAndClasses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile for assignment form:", profileError);
        } else if (profile) {
          setUserRole(profile.role);
          if (profile.role === "teacher") {
            const { data: classesData, error: classesError } = await supabase
              .from("classes")
              .select("id, name")
              .eq("teacher_id", user.id);

            if (classesError) {
              console.error("Error fetching teacher classes:", classesError);
            } else {
              setTeacherClasses(classesData || []);
            }
          }
        }
      }
    };
    fetchUserAndClasses();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        showError("You must be logged in to create an assignment.");
        setIsSubmitting(false);
        return;
      }

      let assignmentFileUrl = values.file_url || null;

      if (selectedFile) {
        const uploadedFileUrl = await uploadFile(selectedFile, "assignment_files");
        if (uploadedFileUrl) {
          assignmentFileUrl = uploadedFileUrl;
        } else {
          showError(uploadError || "Failed to upload assignment file.");
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from("assignments")
        .insert({
          class_id: values.class_id, // Use class_id from form
          teacher_id: user.id,
          title: values.title,
          description: values.description || null,
          due_date: values.due_date ? values.due_date.toISOString() : null,
          total_points: values.total_points || 0,
          file_url: assignmentFileUrl,
        });

      if (error) {
        showError("Failed to create assignment: " + error.message);
        console.error("Error creating assignment:", error);
      } else {
        showSuccess("Assignment created successfully!");
        form.reset();
        setSelectedFile(null);
        onAssignmentCreated();
        onClose(); // Close dialog on success
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Assignment</h2>
        <DialogDescription>
          Fill out the form to create a new assignment for your class.
        </DialogDescription>
        {userRole === "teacher" && (
          <FormField
            control={form.control}
            name="class_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Class</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}> {/* Ensure value is always a string */}
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teacherClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                    {teacherClasses.length === 0 && (
                      // Removed SelectItem with empty value
                      <SelectItem value="no-classes-available" disabled>No classes available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignment Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Stoichiometry Homework" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detailed instructions for the assignment" className="min-h-[80px] resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="total_points"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Points (Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Upload Attachment (Optional)</FormLabel>
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
              <FormLabel>Or Attachment URL (Optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="e.g., https://example.com/worksheet.pdf" {...field} disabled={!!selectedFile || uploadingFile || isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {(uploadingFile || isSubmitting) && <p className="text-sm text-gray-500">Uploading file...</p>}
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting || uploadingFile}>
          {isSubmitting || uploadingFile ? "Creating..." : "Create Assignment"}
        </Button>
      </form>
    </Form>
  );
};

export default CreateAssignmentForm;