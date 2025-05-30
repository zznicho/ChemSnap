import PeriodicTable from "@/components/PeriodicTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Settings, PlusCircle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import CreateGeneralResourceForm from "@/components/CreateGeneralResourceForm"; // Import new form

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

interface GeneralResource {
  id: string;
  title: string;
  content: string | null;
  type: string;
  link_url: string | null;
  image_url: string | null;
  created_at: string;
  author_id: string;
}

const Resources = () => {
  const navigate = useNavigate();
  const [hscResources, setHscResources] = useState<HSCResource[]>([]);
  const [generalResources, setGeneralResources] = useState<GeneralResource[]>([]);
  const [loadingHscResources, setLoadingHscResources] = useState(true);
  const [loadingGeneralResources, setLoadingGeneralResources] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCreateGeneralResourceDialogOpen, setIsCreateGeneralResourceDialogOpen] = useState(false);
  const [isEditGeneralResourceDialogOpen, setIsEditGeneralResourceDialogOpen] = useState(false); // New state for edit dialog
  const [selectedGeneralResource, setSelectedGeneralResource] = useState<GeneralResource | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (error) {
          console.error("Error fetching user role for resources:", error);
        } else if (profile) {
          setUserRole(profile.role);
        }
      }
    };
    fetchUserRole();
  }, []);

  const fetchHscResources = useCallback(async () => {
    setLoadingHscResources(true);
    // Fetch only free resources as per RLS policy
    const { data, error } = await supabase
      .from("hsc_resources")
      .select("*")
      .eq("is_free", true)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch HSC resources: " + error.message);
      console.error("Error fetching HSC resources:", error);
    } else {
      setHscResources(data as HSCResource[]);
    }
    setLoadingHscResources(false);
  }, []);

  const fetchGeneralResources = useCallback(async () => {
    setLoadingGeneralResources(true);
    const { data, error } = await supabase
      .from("general_resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch general resources: " + error.message);
      console.error("Error fetching general resources:", error);
    } else {
      setGeneralResources(data as GeneralResource[]);
    }
    setLoadingGeneralResources(false);
  }, []);

  useEffect(() => {
    fetchHscResources();
    fetchGeneralResources();
  }, [fetchHscResources, fetchGeneralResources]);

  const handleManageHSCResourcesClick = () => {
    navigate("/admin/resources");
  };

  const handleEditGeneralResource = (resource: GeneralResource) => {
    setSelectedGeneralResource(resource);
    setIsEditGeneralResourceDialogOpen(true);
  };

  const handleDeleteGeneralResource = async (resourceId: string) => {
    try {
      const { error } = await supabase
        .from("general_resources")
        .delete()
        .eq("id", resourceId);

      if (error) {
        showError("Failed to delete general resource: " + error.message);
        console.error("Error deleting general resource:", error);
      } else {
        showSuccess("General resource deleted successfully!");
        fetchGeneralResources();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const canManageResources = userRole === "admin";

  const renderGeneralResourceCard = (resource: GeneralResource) => (
    <Card key={resource.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">{resource.title}</CardTitle>
        {canManageResources && (
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={() => handleEditGeneralResource(resource)}>
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
                    This action cannot be undone. This will permanently delete this general resource.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteGeneralResource(resource.id)} className="bg-red-600 hover:bg-red-700">
                    Yes, delete resource
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {resource.content && <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: resource.content }} />}
        {resource.image_url && (
          <img src={resource.image_url} alt={resource.title} className="w-full h-auto rounded-md object-cover max-h-96" />
        )}
        {resource.link_url && (
          <a
            href={resource.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:underline dark:text-blue-400 text-sm mt-2"
          >
            View More <ExternalLink className="ml-1 h-4 w-4" />
          </a>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Added: {new Date(resource.created_at).toLocaleDateString()}</p>
      </CardContent>
    </Card>
  );

  const pastPapersTextbooks = generalResources.filter(r => r.type === 'past_papers');
  const universityInfo = generalResources.filter(r => r.type === 'university_info');
  const careerPaths = generalResources.filter(r => r.type === 'career_paths');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100 font-chemistry">Chemistry Resources Hub</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Your comprehensive guide for chemistry studies, from fundamental concepts to career paths.
        </p>

        {canManageResources && (
          <div className="mb-8 space-y-4">
            <Button className="w-full" onClick={handleManageHSCResourcesClick}>
              <Settings className="h-4 w-4 mr-2" /> Manage HSC Resources (Admin)
            </Button>
            <Dialog open={isCreateGeneralResourceDialogOpen} onOpenChange={setIsCreateGeneralResourceDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" variant="secondary">
                  <PlusCircle className="h-4 w-4 mr-2" /> Create New General Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New General Resource</DialogTitle>
                </DialogHeader>
                <CreateGeneralResourceForm onResourceSaved={fetchGeneralResources} onClose={() => setIsCreateGeneralResourceDialogOpen(false)} userRole={userRole} />
              </DialogContent>
            </Dialog>
          </div>
        )}

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General Resources</TabsTrigger>
            <TabsTrigger value="hsc">HSC Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-8">
            <PeriodicTable />

            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-chemistry">Additional Resources</h2>
            {loadingGeneralResources ? (
              <p className="text-center text-gray-600 dark:text-gray-400">Loading general resources...</p>
            ) : (
              <div className="space-y-6">
                {pastPapersTextbooks.length > 0 && (
                  <>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-chemistry">Past Papers & Textbooks</h3>
                    {pastPapersTextbooks.map(renderGeneralResourceCard)}
                  </>
                )}
                {universityInfo.length > 0 && (
                  <>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-chemistry">University Information</h3>
                    {universityInfo.map(renderGeneralResourceCard)}
                  </>
                )}
                {careerPaths.length > 0 && (
                  <>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-chemistry">Fields That Require Chemistry</h3>
                    {careerPaths.map(renderGeneralResourceCard)}
                  </>
                )}
                {generalResources.filter(r => !['past_papers', 'university_info', 'career_paths'].includes(r.type)).length > 0 && (
                  <>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-chemistry">Other General Resources</h3>
                    {generalResources.filter(r => !['past_papers', 'university_info', 'career_paths'].includes(r.type)).map(renderGeneralResourceCard)}
                  </>
                )}
                {generalResources.length === 0 && (
                  <p className="text-center text-gray-600 dark:text-gray-400">No general resources available yet. Admins can add them!</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="hsc" className="mt-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-chemistry">Free HSC Resources</h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
              Explore a collection of free resources to help with your HSC studies.
            </p>

            {loadingHscResources ? (
              <p className="text-center text-gray-600 dark:text-gray-400 mt-6">Loading resources...</p>
            ) : (
              <div className="space-y-6">
                {hscResources.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400">No free resources available yet.</p>
                ) : (
                  hscResources.map((resource) => (
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
          </TabsContent>
        </Tabs>
      </div>

      {selectedGeneralResource && (
        <Dialog open={isEditGeneralResourceDialogOpen} onOpenChange={setIsEditGeneralResourceDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit General Resource</DialogTitle>
            </DialogHeader>
            <CreateGeneralResourceForm
              initialData={selectedGeneralResource}
              onResourceSaved={fetchGeneralResources}
              onClose={() => setIsEditGeneralResourceDialogOpen(false)}
              userRole={userRole}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Resources;