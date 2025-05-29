import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react"; // Import useCallback
import { showError } from "@/utils/toast";
import CreatePostForm from "@/components/CreatePostForm"; // Import the new component

interface Post {
  id: string;
  content_text: string;
  author_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    profile_picture_url: string;
  };
}

const Home = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => { // Wrap fetchPosts in useCallback
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
  }, []); // Empty dependency array as it doesn't depend on any props/state

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]); // Add fetchPosts to useEffect dependencies

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center pb-20">
      <div className="w-full max-w-2xl p-4">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">ChemSnap! Feed</h1>

        <CreatePostForm onPostCreated={fetchPosts} /> {/* Add the new component here */}

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6">Loading posts...</p>
        ) : (
          <div className="space-y-6 mt-6"> {/* Added mt-6 for spacing */}
            {posts.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No posts yet. Be the first to share!</p>
            ) : (
              posts.map((post) => (
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
                    {/* Add image/video display here later */}
                    <div className="flex justify-end mt-4 space-x-2">
                      <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Like</Button>
                      <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">Comment</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Home;