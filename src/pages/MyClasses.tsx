import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JoinClassForm from "@/components/JoinClassForm";
import { BookOpen, Users, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    assignments: {
      id: string;
      title: string;
      due_date: string | null;
      total_points: number;
    }[];
    // student_count is no longer directly available via this query
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
        navigate("/");
        return;
      }

      // Allow students and admins to view this page
      if (profile.role !== "student" && profile.role !== "admin") {
        showError("Access Denied: Only students and administrators can view this page.");
        navigate("/");
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

    let query = supabase
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
          ),
          assignments!assignments_class_id_fkey (
            id,
            title,
            due_date,
            total_points
          )
          // Removed class_enrollments!class_enrollments_class_id_fkey(count) to resolve embedding error
        )
      `)
      .order("joined_at", { ascending: false });

    // Admins can see all enrollments, students only their own
    if (userRole === "student") {
      query = query.eq("student_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      showError("Failed to fetch enrolled classes: " + error.message);
      console.error("Error fetching enrolled classes:", error);
    } else {
      // student_count is no longer directly available here, so we remove the mapping
      setEnrolledClasses(data as EnrolledClass[]);
    }
    setLoadingClasses(false);
  }, [userRole]); // Depend on userRole to refetch if it changes

  useEffect(() => {
    if (userRole) { // Fetch results only after role is confirmed
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

  if (userRole !== "student" && userRole !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100 font-chemistry">My Classes</h1>

        {userRole === "student" && ( // Only students can join classes
          <div className="mb-8">
            <JoinClassForm onClassJoined={fetchEnrolledClasses} />
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-chemistry">Enrolled Classes</h2>
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
                      {/* Removed student count display as it's no longer directly available here */}
                      <span className="flex items-center"><BookOpen className="h-4 w-4 mr-1" /> {enrollment.classes.assignments.length} Assignments</span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link to={`/classes/${enrollment.classes.id}/discussions`} className="flex-1">
                        <Button className="w-full" variant="secondary">
                          <MessageSquare className="h-4 w-4 mr-2" /> Discussions
                        </Button>
                      </Link>
                    </div>

                    {enrollment.classes.assignments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Assignments</h3>
                        <ul className="space-y-2">
                          {enrollment.classes.assignments.map(assignment => (
                            <li key={assignment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                              <div className="flex-grow">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{assignment.title}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No due date"} | {assignment.total_points} points
                                </p>
                              </div>
                              <Link to={`/assignments/${assignment.id}`}>
                                <Button variant="ghost" size="sm">
                                  <FileText className="h-4 w-4 mr-1" /> View
                                </Button>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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