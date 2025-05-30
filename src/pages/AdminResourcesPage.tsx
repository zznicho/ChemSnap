import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateHSCResourceForm from "@/components/CreateHSCResourceForm";
import { PlusCircle, ExternalLink, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const [isEditResourceDialogOpen, setIsEditResourceDialogOpen] = useState(false); // New state for edit dialog
  const [selectedResource, setSelectedResource] = useState<HSCResource | null>(null); // State to hold resource being edited

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

  const handleEditResource = (resource: HSCResource) => {
    setSelectedResource(resource);
    setIsEditResourceDialogOpen(true);
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
              <CreateHSCResourceForm onResourceSaved={() => {
                setIsCreateResourceDialogOpen(false);
                fetchAllResources(); // Refresh resources after creation
              }} onClose={() => setIsCreateResourceDialogOpen(false)} />
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
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{resource.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary">{resource.subject}</Badge>
                        <Badge variant="secondary">{resource.year_level}</Badge>
                        <Badge variant="secondary">{resource.resource_type}</Badge>
                        {resource.difficulty_level && <Badge variant="secondary">{resource.difficulty_level}</Badge>}
                        {resource.is_free ? <Badge className="bg-green-500">Free</Badge> : <Badge className="bg-yellow-500">Paid</Badge>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditResource(resource)}>
                        <Edit className="h-4 w-4" />
                      </Button>
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
                              This action cannot be undone. This will permanently delete this resource.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteResource(resource.id)} className="bg-red-600 hover:bg-red-700">
                              Yes, delete resource
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {resource.content && <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: resource.content }} />}
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
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {selectedResource && (
        <Dialog open={isEditResourceDialogOpen} onOpenChange={setIsEditResourceDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit HSC Resource</DialogTitle>
            </DialogHeader>
            <CreateHSCResourceForm
              initialData={selectedResource}
              onResourceSaved={() => {
                setIsEditResourceDialogOpen(false);
                fetchAllResources(); // Refresh resources after edit
              }}
              onClose={() => setIsEditResourceDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminResourcesPage;