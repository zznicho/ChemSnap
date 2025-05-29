import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateClassForm from "@/components/CreateClassForm";
import CreateAssignmentForm from "@/components/CreateAssignmentForm"; // Import CreateAssignmentForm
import { Users, BookOpen, PlusCircle, FileText } from "lucide-react"; // Import FileText icon

interface Class {
  id: string;
  name: string;
  subject: string;
  year_level: string;
  description: string | null;
  class_code: string;
  created_at: string;
  assignments: Assignment[]; // Add assignments to Class interface
}

interface Assignment {
  id: string;
  title: string;
  due_date: string | null;
  total_points: number;
  file_url: string | null;
}

const ClassManagement = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [isCreateAssignmentDialogOpen, setIsCreateAssignmentDialogOpen] = useState(false);
  const [selectedClassIdForAssignment, setSelectedClassIdForAssignment] = useState<string | null>(null);

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
      .select(`
        id,
        name,
        subject,
        year_level,
        description,
        class_code,
        created_at,
        assignments (
          id,
          title,
          due_date,
          total_points,
          file_url
        )
      `)
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

  const handleOpenCreateAssignmentDialog = (classId: string) => {
    setSelectedClassIdForAssignment(classId);
    setIsCreateAssignmentDialogOpen(true);
  };

  const handleAssignmentCreated = () => {
    setIsCreateAssignmentDialogOpen(false);
    fetchClasses(); // Refresh classes to show new assignment
  };

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
                      <span className="flex items-center"><BookOpen className="h-4 w-4 mr-1" /> {cls.assignments.length} Assignments</span>
                    </div>
                    <div className="mt-4">
                      <Button onClick={() => handleOpenCreateAssignmentDialog(cls.id)} className="w-full" variant="outline">
                        <PlusCircle className="h-4 w-4 mr-2" /> Create New Assignment
                      </Button>
                    </div>

                    {cls.assignments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Assignments</h3>
                        <ul className="space-y-2">
                          {cls.assignments.map(assignment => (
                            <li key={assignment.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                              <div className="flex-grow">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{assignment.title}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No due date"} | {assignment.total_points} points
                                </p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4 mr-1" /> View
                              </Button>
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

      {selectedClassIdForAssignment && (
        <Dialog open={isCreateAssignmentDialogOpen} onOpenChange={setIsCreateAssignmentDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
            </DialogHeader>
            <CreateAssignmentForm
              classId={selectedClassIdForAssignment}
              onAssignmentCreated={handleAssignmentCreated}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClassManagement;