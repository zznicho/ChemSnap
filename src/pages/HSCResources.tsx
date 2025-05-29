import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

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

const HSCResources = () => {
  const [resources, setResources] = useState<HSCResource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    // Fetch only free resources as per RLS policy
    const { data, error } = await supabase
      .from("hsc_resources")
      .select("*")
      .eq("is_free", true)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch resources: " + error.message);
      console.error("Error fetching resources:", error);
    } else {
      setResources(data as HSCResource[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Free HSC Resources</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Explore a collection of free resources to help with your HSC studies.
        </p>

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6">Loading resources...</p>
        ) : (
          <div className="space-y-6">
            {resources.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No free resources available yet.</p>
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
      </div>
    </div>
  );
};

export default HSCResources;