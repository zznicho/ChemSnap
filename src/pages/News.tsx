import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import NewsArticleForm from "@/components/NewsArticleForm"; // Updated import
import { PlusCircle, ExternalLink, Trash2, Edit } from "lucide-react"; // Added Edit icon
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

interface NewsArticle {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  file_url: string | null;
  created_at: string;
  author_id: string;
  profiles: {
    full_name: string;
  } | null;
}

const News = () => {
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateArticleDialogOpen, setIsCreateArticleDialogOpen] = useState(false);
  const [isEditArticleDialogOpen, setIsEditArticleDialogOpen] = useState(false); // New state for edit dialog
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null); // State to hold article being edited
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  const fetchNewsArticles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("news_articles")
      .select(`
        id,
        title,
        content,
        image_url,
        file_url,
        created_at,
        author_id,
        profiles (
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch news articles: " + error.message);
      console.error("Error fetching news articles:", error);
    } else {
      setNewsArticles(data as NewsArticle[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNewsArticles();
  }, [fetchNewsArticles]);

  const handleDeleteArticle = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from("news_articles")
        .delete()
        .eq("id", articleId);

      if (error) {
        showError("Failed to delete article: " + error.message);
        console.error("Error deleting article:", error);
      } else {
        showSuccess("Article deleted successfully!");
        fetchNewsArticles();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleEditClick = (article: NewsArticle) => {
    setSelectedArticle(article);
    setIsEditArticleDialogOpen(true);
  };

  const canManageContent = userRole === "admin" || userRole === "teacher";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Science News</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Stay updated with the latest in science and chemistry!
        </p>

        {canManageContent && (
          <div className="mb-8">
            <Dialog open={isCreateArticleDialogOpen} onOpenChange={setIsCreateArticleDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" /> Create New News Article
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New News Article</DialogTitle>
                </DialogHeader>
                <NewsArticleForm onArticleSaved={fetchNewsArticles} onClose={() => setIsCreateArticleDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Latest Articles</h2>
        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading news articles...</p>
        ) : (
          <div className="space-y-6">
            {newsArticles.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No news articles available yet.</p>
            ) : (
              newsArticles.map((article) => (
                <Card key={article.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{article.title}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        By {article.profiles?.full_name || "Unknown"} on {new Date(article.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {(userRole === "admin" || currentUserId === article.author_id) && (
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(article)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {(userRole === "admin" || currentUserId === article.author_id) && (
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
                                This action cannot be undone. This will permanently delete this news article.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteArticle(article.id)} className="bg-red-600 hover:bg-red-700">
                                Yes, delete article
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {article.content && <p className="text-gray-800 dark:text-gray-200">{article.content}</p>}
                    {article.image_url && (
                      <img src={article.image_url} alt={article.title} className="w-full h-auto rounded-md object-cover max-h-96" />
                    )}
                    {article.file_url && (
                      <a
                        href={article.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:underline dark:text-blue-400 text-sm mt-2"
                      >
                        View Attachment <ExternalLink className="ml-1 h-4 w-4" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {selectedArticle && (
        <Dialog open={isEditArticleDialogOpen} onOpenChange={setIsEditArticleDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit News Article</DialogTitle>
            </DialogHeader>
            <NewsArticleForm
              initialData={selectedArticle}
              onArticleSaved={fetchNewsArticles}
              onClose={() => setIsEditArticleDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default News;