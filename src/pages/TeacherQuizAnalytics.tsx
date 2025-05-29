import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Award, CalendarDays, Hash } from "lucide-react";

interface QuizWithResults extends Quiz {
  quiz_results: QuizResult[];
  profiles?: { // Add profiles to QuizWithResults for admin view
    full_name: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  subject: string;
  difficulty: string | null;
  questions: { id: string }[]; // To count total questions
}

interface QuizResult {
  id: string;
  score: number;
  total_questions: number;
  submitted_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const TeacherQuizAnalytics = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [quizzesWithResults, setQuizzesWithResults] = useState<QuizWithResults[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

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

      // Allow teachers AND admins to view this page
      if (profile.role !== "teacher" && profile.role !== "admin") {
        showError("Access Denied: Only teachers and administrators can view quiz analytics.");
        navigate("/");
        return;
      }
      setUserRole(profile.role);
      setLoadingRole(false);
    };

    checkUserRole();
  }, [navigate]);

  const fetchTeacherQuizzesAndResults = useCallback(async () => {
    if (!userRole) return; // Only fetch if userRole is determined

    setLoadingAnalytics(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingAnalytics(false);
      return;
    }

    let query = supabase
      .from("quizzes")
      .select(`
        id,
        title,
        subject,
        difficulty,
        questions (id),
        quiz_results (
          id,
          score,
          total_questions,
          submitted_at,
          user_id,
          profiles (
            full_name,
            email
          )
        ),
        profiles (
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    // Admins can see all quizzes, teachers only their own
    if (userRole === "teacher") {
      query = query.eq("teacher_id", user.id);
    }
    // If userRole is "admin", no additional filter is needed, as the initial query already selects all.

    const { data, error } = await query;

    if (error) {
      showError("Failed to fetch quiz analytics: " + error.message);
      console.error("Error fetching quiz analytics:", error);
    } else {
      setQuizzesWithResults(data as QuizWithResults[]);
    }
    setLoadingAnalytics(false);
  }, [userRole]);

  useEffect(() => {
    if (userRole) { // Fetch results only after role is confirmed
      fetchTeacherQuizzesAndResults();
    }
  }, [userRole, fetchTeacherQuizzesAndResults]);

  if (loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Checking user role...</p>
      </div>
    );
  }

  if (userRole !== "teacher" && userRole !== "admin") {
    return null; // Should have been redirected by now
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Quiz Analytics</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          View performance data for quizzes you have created.
        </p>

        {loadingAnalytics ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6">Loading analytics...</p>
        ) : (
          <div className="space-y-6">
            {quizzesWithResults.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">You haven't created any quizzes with results yet.</p>
            ) : (
              quizzesWithResults.map((quiz) => {
                const totalSubmissions = quiz.quiz_results.length;
                const averageScore = totalSubmissions > 0
                  ? (quiz.quiz_results.reduce((sum, result) => sum + result.score, 0) / totalSubmissions).toFixed(2)
                  : "N/A";
                const totalQuestions = quiz.questions.length;

                return (
                  <Card key={quiz.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                    <CardHeader>
                      <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{quiz.title}</CardTitle>
                      {userRole === "admin" && quiz.profiles?.full_name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Created by: {quiz.profiles.full_name}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <Badge variant="secondary">{quiz.subject}</Badge>
                        {quiz.difficulty && <Badge variant="secondary">{quiz.difficulty}</Badge>}
                        <span className="flex items-center"><Hash className="h-4 w-4 mr-1" /> {totalQuestions} Questions</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-4 text-base text-gray-800 dark:text-gray-200">
                        <span className="flex items-center"><Users className="h-4 w-4 mr-1" /> Submissions: {totalSubmissions}</span>
                        <span className="flex items-center"><Award className="h-4 w-4 mr-1" /> Avg. Score: {averageScore} / {totalQuestions}</span>
                      </div>

                      {totalSubmissions > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Individual Results</h3>
                          <ul className="space-y-2">
                            {quiz.quiz_results.map((result) => (
                              <li key={result.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-gray-100">{result.profiles?.full_name || "Unknown User"}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{result.profiles?.email}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-primary dark:text-primary-foreground">{result.score} / {result.total_questions}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(result.submitted_at).toLocaleDateString()}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherQuizAnalytics;