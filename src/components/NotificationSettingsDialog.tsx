import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const notificationSettingsSchema = z.object({
  comments_on_my_posts: z.boolean().default(true),
  likes_on_my_posts: z.boolean().default(true),
  messages_in_my_classes: z.boolean().default(true),
  new_assignment_creation: z.boolean().default(true),
  admin_announcements: z.boolean().default(true),
});

interface NotificationSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: () => void;
  initialSettings: Record<string, boolean>;
}

const NotificationSettingsDialog = ({ isOpen, onClose, onSettingsSaved, initialSettings }: NotificationSettingsDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof notificationSettingsSchema>>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: initialSettings,
  });

  useEffect(() => {
    form.reset(initialSettings);
  }, [initialSettings, form]);

  const onSubmit = async (values: z.infer<typeof notificationSettingsSchema>) => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showError("You must be logged in to save settings.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          notification_settings: values,
          notification_prompt_shown: true, // Mark prompt as shown
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        showError("Failed to save notification settings: " + error.message);
        console.error("Error saving notification settings:", error);
      } else {
        showSuccess("Notification settings saved!");
        onSettingsSaved();
        onClose();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showError("You must be logged in to skip settings.");
        setIsSubmitting(false);
        return;
      }

      // Mark prompt as shown without changing settings
      const { error } = await supabase
        .from("profiles")
        .update({
          notification_prompt_shown: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        showError("Failed to skip notification settings: " + error.message);
        console.error("Error skipping notification settings:", error);
      } else {
        showSuccess("Notification settings skipped for now.");
        onSettingsSaved(); // Trigger a refresh to update profile state
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Your Notification Preferences</DialogTitle>
          <DialogDescription>
            Help us keep you informed! Choose which types of notifications you'd like to receive. You can change these anytime in your profile settings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="comments_on_my_posts"
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
                      Comments on my posts
                    </FormLabel>
                    <FormDescription>
                      Receive notifications when someone comments on your posts.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="likes_on_my_posts"
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
                      Likes on my posts
                    </FormLabel>
                    <FormDescription>
                      Get notified when someone likes your posts.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="messages_in_my_classes"
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
                      Messages in my classes
                    </FormLabel>
                    <FormDescription>
                      Receive updates from class discussions.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_assignment_creation"
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
                      New assignment creation
                    </FormLabel>
                    <FormDescription>
                      Be notified when new assignments are posted in your classes.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="admin_announcements"
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
                      Admin announcements
                    </FormLabel>
                    <FormDescription>
                      Receive important announcements from administrators.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleSkip} disabled={isSubmitting}>
                Skip for now
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationSettingsDialog;