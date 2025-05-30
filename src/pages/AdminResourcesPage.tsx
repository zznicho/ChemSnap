import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateHSCResourceForm from "@/components/CreateHSCResourceForm";
import { PlusCircle, ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HSCResource {
  id: string;
  title: string;
  subject: string;
  year_level: string;
  resource_type: string;
  content: string | null;
  file_url: string | null;
  tags: string[] | null;
  difficulty_level: string | null;
  syllabus_point: string | null;
  is_free: boolean;
  created_at: string;
}

const AdminResourcesPage = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [resources, setResources] = useState<HSCResource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [isCreateResourceDialogOpen, setIsCreateResourceDialogOpen] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        showError("You must be logged in to access this page.");
        navigate("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        showError("Failed to fetch user role.");
        console.error("Error fetching profile:", profileError);
        navigate("/");
        return;
      }

      if (profile.role !== "admin") {
        showError("Access Denied: Only administrators can manage resources.");
        navigate("/");
        return;
      }
      setUserRole(profile.role);
      setLoadingRole(false);
    };

    checkUserRole();
  }, [navigate]);

  const fetchAllResources = useCallback(async () => {
    setLoadingResources(true);
    const { data, error } = await supabase
      .from("hsc_resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch resources: " + error.message);
      console.error("Error fetching resources:", error);
    } else {
      setResources(data as HSCResource[]);
    }
    setLoadingResources(false);
  }, []);

  useEffect(() => {
    if (userRole === "admin") {
      fetchAllResources();
    }
  }, [userRole, fetchAllResources]);

  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) {
      return;
    }
    try {
      const { error } = await supabase
        .from("hsc_resources")
        .delete()
        .eq("id", resourceId);

      if (error) {
        showError("Failed to delete resource: " + error.message);
        console.error("Error deleting resource:", error);
      } else {
        showSuccess("Resource deleted successfully!");
        fetchAllResources();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  if (loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Checking user role...</p>
      </div>
    );
  }

  if (userRole !== "admin") {
    return null; // Should have been redirected by now
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100 font-chemistry">Admin: Manage HSC Resources</h1>

        <div className="mb-8">
          <Dialog open={isCreateResourceDialogOpen} onOpenChange={setIsCreateResourceDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" /> Create New Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New HSC Resource</DialogTitle>
              </DialogHeader>
              <CreateHSCResourceForm onResourceCreated={() => {
                setIsCreateResourceDialogOpen(false);
                fetchAllResources(); // Refresh resources after creation
              }} />
            </DialogContent>
          </Dialog>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">All Resources</h2>
        {loadingResources ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading resources...</p>
        ) : (
          <div className="space-y-4">
            {resources.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No resources available yet.</p>
            ) : (
              resources.map((resource) => (
                <Card key={resource.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{resource.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">{resource.subject}</Badge>
                      <Badge variant="secondary">{resource.year_level}</Badge>
                      <Badge variant="secondary">{resource.resource_type}</Badge>
                      {resource.difficulty_level && <Badge variant="secondary">{resource.difficulty_level}</Badge>}
                      {resource.is_free ? <Badge className="bg-green-500">Free</Badge> : <Badge className="bg-yellow-500">Paid</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {resource.content && <p className="text-gray-800 dark:text-gray-200">{resource.content}</p>}
                    {resource.syllabus_point && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">Syllabus Point: {resource.syllabus_point}</p>
                    )}
                    {resource.file_url && (
                      <a
                        href={resource.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:underline dark:text-blue-400 text-sm mt-2"
                      >
                        View Resource <ExternalLink className="ml-1 h-4 w-4" />
                      </a>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Added: {new Date(resource.created_at).toLocaleDateString()}</p>
                    <div className="flex justify-end">
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteResource(resource.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </Button>
                    </div>
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

export default AdminResourcesPage;