import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MessageSquare, Send } from "lucide-react";

interface Profile {
  full_name: string;
  profile_picture_url: string;
}

interface DiscussionMessage {
  id: string;
  message: string;
  created_at: string;
  author_id: string;
  profiles: Profile;
}

const messageFormSchema = z.object({
  message: z.string().min(1, { message: "Message cannot be empty." }).max(500, { message: "Message cannot exceed 500 characters." }),
});

const ClassDiscussionPage = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [className, setClassName] = useState<string | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof messageFormSchema>>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      message: "",
    },
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  const fetchClassDetailsAndMessages = useCallback(async () => {
    setLoading(true);
    if (!classId) {
      showError("Class ID is missing.");
      navigate("/classes"); // Or /my-classes depending on role
      setLoading(false);
      return;
    }

    // Fetch class name
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("name")
      .eq("id", classId)
      .single();

    if (classError || !classData) {
      showError("Failed to fetch class details: " + (classError?.message || "Class not found."));
      console.error("Error fetching class details:", classError);
      navigate("/classes"); // Or /my-classes
      setLoading(false);
      return;
    }
    setClassName(classData.name);

    // Fetch discussion messages
    const { data: messagesData, error: messagesError } = await supabase
      .from("class_discussions")
      .select(`
        id,
        message,
        created_at,
        author_id,
        profiles (
          full_name,
          profile_picture_url
        )
      `)
      .eq("class_id", classId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      showError("Failed to fetch discussion messages: " + messagesError.message);
      console.error("Error fetching messages:", messagesError);
    } else {
      setMessages(messagesData as DiscussionMessage[]);
    }
    setLoading(false);
  }, [classId, navigate]);

  useEffect(() => {
    fetchClassDetailsAndMessages();
  }, [fetchClassDetailsAndMessages]);

  const onSubmit = async (values: z.infer<typeof messageFormSchema>) => {
    setIsSubmitting(true);
    try {
      if (!currentUserId) {
        showError("You must be logged in to post a message.");
        setIsSubmitting(false);
        return;
      }
      if (!classId) {
        showError("Class ID is missing for posting.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("class_discussions")
        .insert({
          class_id: classId,
          author_id: currentUserId,
          message: values.message,
        });

      if (error) {
        showError("Failed to post message: " + error.message);
        console.error("Error posting message:", error);
      } else {
        showSuccess("Message posted!");
        form.reset();
        fetchClassDetailsAndMessages(); // Refresh messages
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Loading discussion...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100 font-chemistry">
          Discussion: {className}
        </h1>

        <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No messages yet. Be the first to start a discussion!</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <img
                    src={msg.profiles?.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.profiles?.full_name || 'User'}`}
                    alt={msg.profiles?.full_name || "User"}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{msg.profiles?.full_name || "Unknown User"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(msg.created_at).toLocaleString()}</p>
                    <p className="text-gray-800 dark:text-gray-200 mt-1">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Post a Message</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Type your message here..."
                          className="min-h-[80px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Send className="h-4 w-4 mr-2" /> {isSubmitting ? "Posting..." : "Post Message"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClassDiscussionPage;