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
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const eventFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100, { message: "Title cannot exceed 100 characters." }),
  description: z.string().max(500, { message: "Description cannot exceed 500 characters." }).optional(),
  start_time: z.date({ required_error: "Start time is required." }),
  end_time: z.date({ required_error: "End time is required." }),
  color: z.string().optional(),
  is_personal: z.boolean().default(true),
  class_id: z.string().optional().nullable(),
}).refine((data) => data.end_time > data.start_time, {
  message: "End time cannot be before start time.",
  path: ["end_time"],
});

interface CreateEventFormProps {
  onEventCreated: () => void;
}

interface Class {
  id: string;
  name: string;
}

const CreateEventForm = ({ onEventCreated }: CreateEventFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      start_time: new Date(),
      end_time: new Date(),
      color: "#3B82F6", // Default blue
      is_personal: true,
      class_id: null,
    },
  });

  const isPersonalEvent = form.watch("is_personal");

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
          console.error("Error fetching profile for event form:", profileError);
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

  const onSubmit = async (values: z.infer<typeof eventFormSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        showError("You must be logged in to create an event.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("calendar_events")
        .insert({
          user_id: user.id,
          title: values.title,
          description: values.description || null,
          start_time: values.start_time.toISOString(),
          end_time: values.end_time.toISOString(),
          color: values.color || '#3B82F6',
          is_personal: values.is_personal,
          class_id: values.is_personal ? null : values.class_id, // Only set class_id if not personal
        });

      if (error) {
        showError("Failed to create event: " + error.message);
        console.error("Error creating event:", error);
      } else {
        showSuccess("Event created successfully!");
        form.reset({
          title: "",
          description: "",
          start_time: new Date(),
          end_time: new Date(),
          color: "#3B82F6",
          is_personal: true,
          class_id: null,
        });
        onEventCreated();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', date: Date | undefined, timeString: string) => {
    if (!date) return;
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    form.setValue(field, newDate, { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create New Event</h2>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Chemistry Exam" {...field} />
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
                <Textarea placeholder="Details about the event" className="min-h-[80px] resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date & Time</FormLabel>
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
                          format(field.value, "PPP HH:mm")
                        ) : (
                          <span>Pick a date and time</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          const currentTime = field.value ? format(field.value, "HH:mm") : "00:00";
                          handleTimeChange('start_time', date, currentTime);
                        }
                      }}
                      initialFocus
                    />
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <Input
                        type="time"
                        value={field.value ? format(field.value, "HH:mm") : "00:00"}
                        onChange={(e) => handleTimeChange('start_time', field.value, e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date & Time</FormLabel>
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
                          format(field.value, "PPP HH:mm")
                        ) : (
                          <span>Pick a date and time</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          const currentTime = field.value ? format(field.value, "HH:mm") : "00:00";
                          handleTimeChange('end_time', date, currentTime);
                        }
                      }}
                      initialFocus
                    />
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                      <Input
                        type="time"
                        value={field.value ? format(field.value, "HH:mm") : "00:00"}
                        onChange={(e) => handleTimeChange('end_time', field.value, e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Color</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a color" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="#3B82F6">Blue</SelectItem> {/* primary-500 */}
                  <SelectItem value="#10B981">Green</SelectItem> {/* emerald-500 */}
                  <SelectItem value="#F59E0B">Yellow</SelectItem> {/* amber-500 */}
                  <SelectItem value="#EF4444">Red</SelectItem> {/* red-500 */}
                  <SelectItem value="#8B5CF6">Purple</SelectItem> {/* violet-500 */}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_personal"
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
                  Personal Event
                </FormLabel>
                <FormDescription>
                  Check this if the event is for your personal calendar only.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        {userRole === "teacher" && !isPersonalEvent && (
          <FormField
            control={form.control}
            name="class_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Class (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teacherClasses.length === 0 ? (
                      <SelectItem value="" disabled>No classes available</SelectItem>
                    ) : (
                      teacherClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Assign this event to one of your classes. It will appear on their calendars.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Event"}
        </Button>
      </form>
    </Form>
  );
};

export default CreateEventForm;