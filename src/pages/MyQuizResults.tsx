import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, CalendarDays, Hash } from "lucide-react";

interface QuizResult {
  id: string;
  score: number;
  total_questions: number;
  submitted_at: string;
  quizzes: {
    title: string;
    subject: string;
    difficulty: string | null;
  };
  profiles?: { // Add profiles to QuizResult interface for admin view
    full_name: string;
    email: string;
  };
}

const MyQuizResults = () => {
  const navigate = useNavigate();
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

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

      // Allow students AND admins to view this page
      if (profile.role !== "student" && profile.role !== "admin") {
        showError("Access Denied: Only students and administrators can view quiz results.");
        navigate("/");
        return;
      }
      setUserRole(profile.role);
      setLoading(false); // Set loading to false after role check
    };

    checkUserRole();
  }, [navigate]);

  const fetchQuizResults = useCallback(async () => {
    if (!userRole) return; // Only fetch if userRole is determined

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("quiz_results")
      .select(`
        id,
        score,
        total_questions,
        submitted_at,
        quizzes (
          title,
          subject,
          difficulty
        ),
        profiles (
          full_name,
          email
        )
      `)
      .order("submitted_at", { ascending: false });

    // Admins can see all quiz results, students only their own
    if (userRole === "student") {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      showError("Failed to fetch quiz results: " + error.message);
      console.error("Error fetching quiz results:", error);
    } else {
      setQuizResults(data as QuizResult[]);
    }
    setLoading(false);
  }, [userRole]);

  useEffect(() => {
    if (userRole) { // Fetch results only after role is confirmed
      fetchQuizResults();
    }
  }, [userRole, fetchQuizResults]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Loading quiz results...</p>
      </div>
    );
  }

  if (userRole !== "student" && userRole !== "admin") {
    return null; // Should have been redirected by now
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">My Quiz Results</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Review your past quiz performances.
        </p>

        {quizResults.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">You haven't completed any quizzes yet.</p>
        ) : (
          <div className="space-y-6">
            {quizResults.map((result) => (
              <Card key={result.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{result.quizzes.title}</CardTitle>
                  {userRole === "admin" && result.profiles?.full_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Student: {result.profiles.full_name} ({result.profiles.email})</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <Badge variant="secondary">{result.quizzes.subject}</Badge>
                    {result.quizzes.difficulty && <Badge variant="secondary">{result.quizzes.difficulty}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-lg font-bold text-primary dark:text-primary-foreground">
                    Score: {result.score} / {result.total_questions}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    <CalendarDays className="h-4 w-4 mr-1" /> Submitted: {new Date(result.submitted_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyQuizResults;