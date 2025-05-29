import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreateClassForm from "@/components/CreateClassForm";
import { Users, BookOpen } from "lucide-react";

interface Class {
  id: string;
  name: string;
  subject: string;
  year_level: string;
  description: string | null;
  class_code: string;
  created_at: string;
}

const ClassManagement = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

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
        navigate("/"); // Redirect to home if role cannot be fetched
        return;
      }

      if (profile.role !== "teacher") {
        showError("Access Denied: Only teachers can manage classes.");
        navigate("/"); // Redirect if not a teacher
        return;
      }
      setUserRole(profile.role);
      setLoadingRole(false);
    };

    checkUserRole();
  }, [navigate]);

  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingClasses(false);
      return;
    }

    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch classes: " + error.message);
      console.error("Error fetching classes:", error);
    } else {
      setClasses(data as Class[]);
    }
    setLoadingClasses(false);
  }, []);

  useEffect(() => {
    if (userRole === "teacher") {
      fetchClasses();
    }
  }, [userRole, fetchClasses]);

  if (loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Checking user role...</p>
      </div>
    );
  }

  if (userRole !== "teacher") {
    return null; // Should have been redirected by now
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Class Management</h1>

        <div className="mb-8">
          <CreateClassForm onClassCreated={fetchClasses} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Your Classes</h2>
        {loadingClasses ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading classes...</p>
        ) : (
          <div className="space-y-4">
            {classes.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">You haven't created any classes yet.</p>
            ) : (
              classes.map((cls) => (
                <Card key={cls.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{cls.name}</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Subject: {cls.subject} | Year: {cls.year_level}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Class Code: <span className="font-mono text-primary dark:text-primary-foreground">{cls.class_code}</span></p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {cls.description && <p className="text-gray-800 dark:text-gray-200">{cls.description}</p>}
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center"><Users className="h-4 w-4 mr-1" /> 0 Students</span> {/* Placeholder for student count */}
                      <span className="flex items-center"><BookOpen className="h-4 w-4 mr-1" /> 0 Assignments</span> {/* Placeholder for assignment count */}
                    </div>
                    {/* Future: Buttons for managing students, assignments, etc. */}
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

export default ClassManagement;