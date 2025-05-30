import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, CalendarDays, Award } from "lucide-react";
import SubmitAssignmentForm from "@/components/SubmitAssignmentForm";
import GradeSubmissionForm from "@/components/GradeSubmissionForm"; // Import GradeSubmissionForm

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  total_points: number;
  file_url: string | null;
  created_at: string;
  classes: {
    name: string;
    subject: string;
    year_level: string;
    profiles: {
      full_name: string;
    };
  };
  assignment_submissions: {
    id: string;
    submission_text: string | null;
    file_url: string | null;
    submitted_at: string;
    grade: number | null;
    teacher_comments: string | null;
    student_id: string; // Add student_id to submission
    profiles: { // Add profiles to submission for student name
      full_name: string;
    };
  }[];
}

const AssignmentDetails = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchAssignmentDetails = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      showError("You must be logged in to view this assignment.");
      navigate("/login");
      return;
    }
    setCurrentUserId(user.id);

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
    setUserRole(profile.role);

    const { data, error } = await supabase
      .from("assignments")
      .select(`
        id,
        title,
        description,
        due_date,
        total_points,
        file_url,
        created_at,
        classes (
          name,
          subject,
          year_level,
          profiles (
            full_name
          )
        ),
        assignment_submissions!left (
          id,
          submission_text,
          file_url,
          submitted_at,
          grade,
          teacher_comments,
          student_id,
          profiles (
            full_name
          )
        )
      `)
      .eq("id", assignmentId)
      .single();

    if (error) {
      showError("Failed to fetch assignment details: " + error.message);
      console.error("Error fetching assignment:", error);
      setAssignment(null);
    } else {
      // Filter submissions to only show the current user's submission if they are a student
      // Or all submissions if they are a teacher
      const processedData = { ...data };
      if (profile.role === "student") {
        processedData.assignment_submissions = data.assignment_submissions.filter(
          (submission: any) => submission.student_id === user.id
        );
      }
      setAssignment(processedData as Assignment);
    }
    setLoading(false);
  }, [assignmentId, navigate]);

  useEffect(() => {
    fetchAssignmentDetails();
  }, [fetchAssignmentDetails]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Loading assignment details...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Assignment not found or you do not have access.</p>
      </div>
    );
  }

  const studentSubmission = assignment.assignment_submissions.find(
    (submission) => submission.student_id === currentUserId
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-chemistry">{assignment.title}</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              From: {assignment.classes.name} ({assignment.classes.subject}, {assignment.classes.year_level})
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Teacher: {assignment.classes.profiles?.full_name || "N/A"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment.description && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Description:</h3>
                <p className="text-gray-800 dark:text-gray-200">{assignment.description}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-1" /> Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No due date"}
              </span>
              <span className="flex items-center">
                <Award className="h-4 w-4 mr-1" /> Points: {assignment.total_points}
              </span>
              {assignment.file_url && (
                <a
                  href={assignment.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:underline dark:text-blue-400"
                >
                  <FileText className="h-4 w-4 mr-1" /> View Attachment <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {userRole === "student" && (
          <>
            <SubmitAssignmentForm
              assignmentId={assignment.id}
              onSubmissionSuccess={fetchAssignmentDetails}
              initialSubmission={studentSubmission}
            />

            {studentSubmission && (
              <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg mt-6">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Your Current Submission</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {studentSubmission.submission_text && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Text:</h3>
                      <p className="text-gray-800 dark:text-gray-200">{studentSubmission.submission_text}</p>
                    </div>
                  )}
                  {studentSubmission.file_url && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">File:</h3>
                      <a
                        href={studentSubmission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:underline dark:text-blue-400 text-sm"
                      >
                        View Submitted File <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Submitted: {new Date(studentSubmission.submitted_at).toLocaleString()}
                  </p>
                  {studentSubmission.grade !== null && (
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      Grade: {studentSubmission.grade} / {assignment.total_points}
                    </p>
                  )}
                  {studentSubmission.teacher_comments && (
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Teacher Comments:</h3>
                      <p className="text-gray-800 dark:text-gray-200">{studentSubmission.teacher_comments}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {userRole === "teacher" && (
          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Student Submissions ({assignment.assignment_submissions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {assignment.assignment_submissions.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No submissions yet for this assignment.</p>
              ) : (
                <ul className="space-y-4">
                  {assignment.assignment_submissions.map((submission) => (
                    <li key={submission.id} className="border-b pb-4 last:pb-0 last:border-b-0 border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Student: {submission.profiles?.full_name || "Unknown Student"}
                        </p>
                        {submission.grade !== null && (
                          <Badge variant="secondary" className="text-lg font-bold">
                            {submission.grade} / {assignment.total_points}
                          </Badge>
                        )}
                      </div>
                      {submission.submission_text && (
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Text Submission:</h4>
                          <p className="text-gray-800 dark:text-gray-200 text-sm">{submission.submission_text}</p>
                        </div>
                      )}
                      {submission.file_url && (
                        <a
                          href={submission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:underline dark:text-blue-400 text-sm mt-1"
                        >
                          View Submitted File <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                      {submission.teacher_comments && (
                        <div className="mt-2">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Teacher Comments:</h4>
                          <p className="text-gray-800 dark:text-gray-200 text-sm">{submission.teacher_comments}</p>
                        </div>
                      )}
                      <GradeSubmissionForm
                        submissionId={submission.id}
                        initialGrade={submission.grade}
                        initialComments={submission.teacher_comments}
                        totalPoints={assignment.total_points}
                        onGradeUpdated={fetchAssignmentDetails}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetails;