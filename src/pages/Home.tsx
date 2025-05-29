import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import CreatePostForm from "@/components/CreatePostForm";
import CommentSection from "@/components/CommentSection"; // Import CommentSection
import { ThumbsUp } from "lucide-react"; // Import ThumbsUp icon

interface Post {
  id: string;
  content_text: string;
  author_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    profile_picture_url: string;
  };
  likes: { id: string, user_id: string }[]; // Add user_id to likes array
}

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select(`
          id,
          content_text,
          author_id,
          created_at,
          profiles (
            full_name,
            profile_picture_url
          ),
          likes (
            id,
            user_id
          )
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

  const handleLikeToggle = async (postId: string) => {
    if (!currentUserId) {
      showError("You must be logged in to like a post.");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const hasLiked = post.likes.some(like => like.user_id === currentUserId);

    if (hasLiked) {
      // Unlike the post
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId);

      if (error) {
        showError("Failed to unlike post: " + error.message);
        console.error("Error unliking post:", error);
      } else {
        showSuccess("Post unliked!");
        fetchPosts(); // Refresh posts to update like count
      }
    } else {
      // Like the post
      const { error } = await supabase
        .from("likes")
        .insert({ post_id: postId, user_id: currentUserId });

      if (error) {
        showError("Failed to like post: " + error.message);
        console.error("Error liking post:", error);
      } else {
        showSuccess("Post liked!");
        fetchPosts(); // Refresh posts to update like count
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center pb-20">
      <div className="w-full max-w-2xl p-4">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">ChemSnap! Feed</h1>

        <CreatePostForm onPostCreated={fetchPosts} />

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6">Loading posts...</p>
        ) : (
          <div className="space-y-6 mt-6">
            {posts.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No posts yet. Be the first to share!</p>
            ) : (
              posts.map((post) => {
                const hasLiked = post.likes.some(like => like.user_id === currentUserId);
                const likeCount = post.likes.length;

                return (
                  <Card key={post.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                    <CardHeader className="flex flex-row items-center space-x-4">
                      <img
                        src={post.profiles?.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.full_name || 'User'}`}
                        alt={post.profiles?.full_name || "User"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{post.profiles?.full_name || "Unknown User"}</CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(post.created_at).toLocaleString()}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-800 dark:text-gray-200">{post.content_text}</p>
                      <div className="flex justify-end mt-4 space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLikeToggle(post.id)}
                          className={`flex items-center gap-1 ${hasLiked ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"}`}
                        >
                          <ThumbsUp className="h-4 w-4" fill={hasLiked ? "currentColor" : "none"} />
                          {likeCount > 0 && <span className="ml-1">{likeCount}</span>}
                          Like
                        </Button>
                      </div>
                      <CommentSection postId={post.id} /> {/* Integrate CommentSection here */}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Home;