import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreatePostForm from "@/components/CreatePostForm";
import CommentSection from "@/components/CommentSection";
import { MessageSquare, Heart, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
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

interface Post {
  id: string;
  content_text: string | null;
  content_image_url: string | null;
  content_video_url: string | null;
  created_at: string;
  author_id: string;
  profiles: {
    full_name: string;
    profile_picture_url: string | null;
  };
  likes: { id: string; user_id: string }[];
  comments: { id: string }[];
}

const SocialFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

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

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        content_text,
        content_image_url,
        content_video_url,
        created_at,
        author_id,
        profiles (
          full_name,
          profile_picture_url
        ),
        likes (id, user_id),
        comments (id)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch posts: " + error.message);
      console.error("Error fetching posts:", error);
    } else {
      setPosts(data as Post[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleLike = async (postId: string) => {
    if (!currentUserId) {
      showError("You must be logged in to like a post.");
      return;
    }

    // Check if already liked
    const { data: existingLike, error: checkError } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", currentUserId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
      showError("Failed to check like status: " + checkError.message);
      console.error("Error checking like:", checkError);
      return;
    }

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("id", existingLike.id);

      if (error) {
        showError("Failed to unlike post: " + error.message);
        console.error("Error unliking:", error);
      } else {
        showSuccess("Post unliked!");
        fetchPosts();
      }
    } else {
      // Like
      const { error } = await supabase
        .from("likes")
        .insert({
          post_id: postId,
          user_id: currentUserId,
        });

      if (error) {
        showError("Failed to like post: " + error.message);
        console.error("Error liking:", error);
      } else {
        showSuccess("Post liked!");
        fetchPosts();
      }
    }
  };

  const handleShare = async (postId: string) => {
    const postUrl = `${window.location.origin}/feed/${postId}`; // Construct the URL for the specific post
    try {
      await navigator.clipboard.writeText(postUrl);
      showSuccess("Post link copied to clipboard!");
    } catch (err) {
      showError("Failed to copy link. Please try again.");
      console.error("Error copying to clipboard:", err);
    }
  };

  const handleDeletePost = async (postId: string, authorId: string) => {
    if (!currentUserId) {
      showError("You must be logged in to delete a post.");
      return;
    }

    // Allow admin to delete any post, or author to delete their own
    const canDelete = userRole === "admin" || currentUserId === authorId;

    if (!canDelete) {
      showError("You do not have permission to delete this post.");
      return;
    }

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId); // RLS will handle permission check

      if (error) {
        showError("Failed to delete post: " + error.message);
        console.error("Error deleting post:", error);
      } else {
        showSuccess("Post deleted successfully!");
        fetchPosts(); // Refresh posts
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100 font-chemistry">ChemSnap! Social Feed</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Share your chemistry journey, ask questions, and connect with other students and teachers!
        </p>

        <div className="mb-8">
          <CreatePostForm onPostCreated={fetchPosts} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-chemistry">Recent Posts</h2>
        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading posts...</p>
        ) : (
          <div className="space-y-6">
            {posts.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No posts yet. Be the first to share something!</p>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <Link to={`/profile/${post.author_id}`} className="flex items-center space-x-3 group">
                      <img
                        src={post.profiles?.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.full_name || 'User'}`}
                        alt={post.profiles?.full_name || "User"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <CardTitle className="text-lg text-gray-900 dark:text-gray-100 group-hover:underline">{post.profiles?.full_name || "Unknown User"}</CardTitle>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(post.created_at).toLocaleString()}</p>
                      </div>
                    </Link>
                    {(userRole === "admin" || currentUserId === post.author_id) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your post and any associated comments.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePost(post.id, post.author_id)} className="bg-red-600 hover:bg-red-700">
                              Yes, delete post
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {post.content_text && <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.content_text }} />}
                    {post.content_image_url && (
                      <img src={post.content_image_url} alt="Post image" className="w-full h-auto rounded-md object-cover max-h-96" />
                    )}
                    {post.content_video_url && (
                      <video controls src={post.content_video_url} className="w-full h-auto rounded-md max-h-96">
                        Your browser does not support the video tag.
                      </video>
                    )}
                    <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 text-sm mt-3">
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center ${post.likes.some(like => like.user_id === currentUserId) ? 'text-red-500' : ''}`}
                        >
                          <Heart className="h-4 w-4 mr-1" /> {post.likes.length} Likes
                        </Button>
                        <Button variant="ghost" size="sm" className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-1" /> {post.comments.length} Comments
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="flex items-center" onClick={() => handleShare(post.id)}>
                        <Share2 className="h-4 w-4 mr-1" /> Share
                      </Button>
                    </div>
                    <CommentSection postId={post.id} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialFeed;