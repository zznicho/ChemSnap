import PeriodicTable from "@/components/PeriodicTable";
import FormulaSheets from "@/components/FormulaSheets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

const Resources = () => {
  const navigate = useNavigate();
  const [hscResources, setHscResources] = useState<HSCResource[]>([]);
  const [loadingHscResources, setLoadingHscResources] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  useEffect(() => {
    fetchHscResources();
  }, [fetchHscResources]);

  const handleManageResourcesClick = () => {
    navigate("/admin/resources");
  };

  const canManageResources = userRole === "admin";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Chemistry Resources Hub</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Your comprehensive guide for chemistry studies, from fundamental concepts to career paths.
        </p>

        {canManageResources && (
          <div className="mb-8">
            <Button className="w-full" onClick={handleManageResourcesClick}>
              <Settings className="h-4 w-4 mr-2" /> Manage HSC Resources (Admin)
            </Button>
          </div>
        )}

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General Resources</TabsTrigger>
            <TabsTrigger value="hsc">HSC Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-8">
            <PeriodicTable />
            <FormulaSheets />

            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Past Papers & Textbooks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 dark:text-gray-200 mb-2">
                  Access a collection of past examination papers and recommended textbooks to aid your revision.
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                  <li>HSC Chemistry Past Papers (Coming Soon)</li>
                  <li>Recommended University Chemistry Textbooks (Coming Soon)</li>
                  <li>Interactive Study Guides (Coming Soon)</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">University Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 dark:text-gray-200 mb-2">
                  Find information about chemistry programs, admission requirements, and student life at various universities.
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                  <li>University Course Guides (Coming Soon)</li>
                  <li>Scholarship Opportunities (Coming Soon)</li>
                  <li>Student Testimonials (Coming Soon)</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Fields That Require Chemistry</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 dark:text-gray-200 mb-2">
                  Explore diverse career paths and industries where a strong foundation in chemistry is essential.
                </p>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                  <li>Medicine & Healthcare (Coming Soon)</li>
                  <li>Environmental Science (Coming Soon)</li>
                  <li>Forensic Science (Coming Soon)</li>
                  <li>Chemical Engineering (Coming Soon)</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hsc" className="mt-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Free HSC Resources</h2>
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
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Resources;