import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JoinClassForm from "@/components/JoinClassForm";
import { BookOpen, Users } from "lucide-react";

interface EnrolledClass {
  id: string;
  joined_at: string;
  classes: {
    id: string;
    name: string;
    subject: string;
    year_level: string;
    description: string | null;
    class_code: string;
    profiles: {
      full_name: string;
    };
  };
}

const MyClasses = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
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

      if (profile.role !== "student") {
        showError("Access Denied: Only students can view this page. Teachers manage classes via 'Class Management'.");
        navigate("/"); // Redirect if not a student
        return;
      }
      setUserRole(profile.role);
      setLoadingRole(false);
    };

    checkUserRole();
  }, [navigate]);

  const fetchEnrolledClasses = useCallback(async () => {
    setLoadingClasses(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingClasses(false);
      return;
    }

    const { data, error } = await supabase
      .from("class_enrollments")
      .select(`
        id,
        joined_at,
        classes (
          id,
          name,
          subject,
          year_level,
          description,
          class_code,
          profiles (
            full_name
          )
        )
      `)
      .eq("student_id", user.id)
      .order("joined_at", { ascending: false });

    if (error) {
      showError("Failed to fetch enrolled classes: " + error.message);
      console.error("Error fetching enrolled classes:", error);
    } else {
      setEnrolledClasses(data as EnrolledClass[]);
    }
    setLoadingClasses(false);
  }, []);

  useEffect(() => {
    if (userRole === "student") {
      fetchEnrolledClasses();
    }
  }, [userRole, fetchEnrolledClasses]);

  if (loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Checking user role...</p>
      </div>
    );
  }

  if (userRole !== "student") {
    return null; // Should have been redirected by now
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">My Classes</h1>

        <div className="mb-8">
          <JoinClassForm onClassJoined={fetchEnrolledClasses} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Enrolled Classes</h2>
        {loadingClasses ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading enrolled classes...</p>
        ) : (
          <div className="space-y-4">
            {enrolledClasses.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">You are not enrolled in any classes yet. Join one using the form above!</p>
            ) : (
              enrolledClasses.map((enrollment) => (
                <Card key={enrollment.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{enrollment.classes.name}</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Subject: {enrollment.classes.subject} | Year: {enrollment.classes.year_level}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Teacher: {enrollment.classes.profiles?.full_name || "N/A"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {enrollment.classes.description && <p className="text-gray-800 dark:text-gray-200">{enrollment.classes.description}</p>}
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center"><BookOpen className="h-4 w-4 mr-1" /> View Assignments</span> {/* Placeholder for assignments */}
                    </div>
                    {/* Future: Buttons for viewing class details, assignments, discussions */}
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

export default MyClasses;