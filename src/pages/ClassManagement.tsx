import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import CreateClassForm from "@/components/CreateClassForm";
import CreateAssignmentForm from "@/components/CreateAssignmentForm";
import { Users, BookOpen, PlusCircle, FileText, MessageSquare, Trash2 } from "lucide-react";

interface Class {
  id: string;
  name: string;
  subject: string;
  year_level: string;
  description: string | null;
  class_code: string;
  created_at: string;
  assignments: Assignment[];
  student_count: number;
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
        navigate("/");
        return;
      }

      if (profile.role !== "teacher" && profile.role !== "admin") {
        showError("Access Denied: Only teachers and administrators can manage classes.");
        navigate("/");
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

    let query = supabase
      .from("classes")
      .select(`
        id,
        name,
        subject,
        year_level,
        description,
        class_code,
        created_at,
        assignments!assignments_class_id_fkey (
          id,
          title,
          due_date,
          total_points,
          file_url
        ),
        class_enrollments(count)
      `)
      .order("created_at", { ascending: false });

    if (userRole === "teacher") {
      query = query.eq("teacher_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      showError("Failed to fetch classes: " + error.message);
      console.error("Error fetching classes:", error);
    } else {
      const classesWithCounts = data.map(cls => ({
        ...cls,
        student_count: cls.class_enrollments && cls.class_enrollments.length > 0 ? cls.class_enrollments[0].count : 0,
      }));
      setClasses(classesWithCounts as Class[]);
    }
    setLoadingClasses(false);
  }, [userRole]);

  useEffect(() => {
    if (userRole) {
      fetchClasses();
    }
  }, [userRole, fetchClasses]);

  const handleOpenCreateAssignmentDialog = (classId: string) => {
    setSelectedClassIdForAssignment(classId);
    setIsCreateAssignmentDialogOpen(true);
  };

  const handleAssignmentCreated = () => {
    setIsCreateAssignmentDialogOpen(false);
    fetchClasses();
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId);

      if (error) {
        showError("Failed to delete class: " + error.message);
        console.error("Error deleting class:", error);
      } else {
        showSuccess("Class deleted successfully!");
        fetchClasses(); // Refresh the list of classes
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

  if (userRole !== "teacher" && userRole !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Class Management</h1>

        {userRole === "teacher" && (
          <div className="mb-8">
            <CreateClassForm onClassCreated={fetchClasses} />
          </div>
        )}

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
                      <span className="flex items-center"><Users className="h-4 w-4 mr-1" /> {cls.student_count} Students</span>
                      <span className="flex items-center"><BookOpen className="h-4 w-4 mr-1" /> {cls.assignments.length} Assignments</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {(userRole === "teacher" || userRole === "admin") && (
                        <Button onClick={() => handleOpenCreateAssignmentDialog(cls.id)} className="flex-1" variant="outline">
                          <PlusCircle className="h-4 w-4 mr-2" /> Create Assignment
                        </Button>
                      )}
                      <Link to={`/classes/${cls.id}/discussions`} className="flex-1">
                        <Button className="w-full" variant="secondary">
                          <MessageSquare className="h-4 w-4 mr-2" /> Discussions
                        </Button>
                      </Link>
                      {(userRole === "teacher" || userRole === "admin") && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="flex-1">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Class
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the class,
                                all its assignments, and discussion messages. Student enrollments will also be removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteClass(cls.id)} className="bg-red-600 hover:bg-red-700">
                                Yes, delete class
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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

      {selectedClassIdForAssignment && (
        <Dialog open={isCreateAssignmentDialogOpen} onOpenChange={setIsCreateAssignmentDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
            </DialogHeader>
            <CreateAssignmentForm
              classId={selectedClassIdForAssignment}
              onAssignmentCreated={handleAssignmentCreated}
              onClose={() => setIsCreateAssignmentDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClassManagement;