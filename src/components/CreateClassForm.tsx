import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(3, { message: "Class name must be at least 3 characters." }).max(100, { message: "Class name cannot exceed 100 characters." }),
  subject: z.string().min(1, { message: "Subject is required." }),
  year_level: z.string().min(1, { message: "Year level is required." }),
  description: z.string().max(500, { message: "Description cannot exceed 500 characters." }).optional(),
});

interface CreateClassFormProps {
  onClassCreated: () => void;
}

const CreateClassForm = ({ onClassCreated }: CreateClassFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subject: "",
      year_level: "",
      description: "",
    },
  });

  const generateClassCode = () => {
    return Math.random().toString(36).substring(2, 9).toUpperCase();
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        showError("You must be logged in to create a class.");
        setIsSubmitting(false);
        return;
      }

      const classCode = generateClassCode();
      console.log("Generated Class Code:", classCode); // Log the generated code

      const { error } = await supabase
        .from("classes")
        .insert({
          teacher_id: user.id,
          name: values.name,
          subject: values.subject,
          year_level: values.year_level,
          description: values.description,
          class_code: classCode,
        });

      if (error) {
        showError("Failed to create class: " + error.message);
        console.error("Error creating class:", error);
      } else {
        showSuccess("Class created successfully!");
        form.reset();
        onClassCreated();
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Class</h2>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Year 12 Chemistry" {...field} />
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief description of the class" className="min-h-[80px] resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Class"}
        </Button>
      </form>
    </Form>
  );
};

export default CreateClassForm;