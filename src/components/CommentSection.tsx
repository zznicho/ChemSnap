import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Profile {
  full_name: string;
  profile_picture_url: string;
}

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  author_id: string;
  profiles: Profile;
}

const commentFormSchema = z.object({
  comment_text: z.string().min(1, { message: "Comment cannot be empty." }).max(250, { message: "Comment cannot exceed 250 characters." }),
});

interface CommentSectionProps {
  postId: string;
}

const CommentSection = ({ postId }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const form = useForm<z.infer<typeof commentFormSchema>>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      comment_text: "",
    },
  });

  useEffect(() => {
    const fetchUserAndRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
        } else if (profile) {
          setUserRole(profile.role);
        }
      }
    };
    fetchUserAndRole();
  }, []);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select(`
        id,
        comment_text,
        created_at,
        author_id,
        profiles!comments_author_id_fkey (
          full_name,
          profile_picture_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      showError("Failed to fetch comments: " + error.message);
      console.error("Error fetching comments:", error);
    } else {
      setComments(data as Comment[]);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const onSubmit = async (values: z.infer<typeof commentFormSchema>) => {
    setIsSubmitting(true);
    try {
      if (!currentUserId) {
        showError("You must be logged in to comment.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          author_id: currentUserId,
          comment_text: values.comment_text,
        });

      if (error) {
        showError("Failed to add comment: " + error.message);
        console.error("Error adding comment:", error);
      } else {
        showSuccess("Comment added!");
        form.reset();
        fetchComments(); // Refresh comments
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, authorId: string) => {
    if (!currentUserId) {
      showError("You must be logged in to delete a comment.");
      return;
    }

    // Allow admin to delete any comment, or author to delete their own
    const canDelete = userRole === "admin" || currentUserId === authorId;

    if (!canDelete) {
      showError("You do not have permission to delete this comment.");
      return;
    }

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId); // RLS will handle permission check

      if (error) {
        showError("Failed to delete comment: " + error.message);
        console.error("Error deleting comment:", error);
      } else {
        showSuccess("Comment deleted successfully!");
        fetchComments(); // Refresh comments
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">Comments ({comments.length})</h3>
      {loading ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading comments...</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <img
                  src={comment.profiles?.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.profiles?.full_name || 'User'}`}
                  alt={comment.profiles?.full_name || "User"}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-grow">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{comment.profiles?.full_name || "Unknown User"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.created_at).toLocaleString()}</p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{comment.comment_text}</p>
                </div>
                {(userRole === "admin" || currentUserId === comment.author_id) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 ml-2">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your comment.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteComment(comment.id, comment.author_id)} className="bg-red-600 hover:bg-red-700">
                          Yes, delete comment
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-2">
          <FormField
            control={form.control}
            name="comment_text"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Add a comment..."
                    className="min-h-[60px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" size="sm" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Commenting..." : "Add Comment"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CommentSection;