import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import QuizCard from "@/components/QuizCard"; // Import QuizCard
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateQuizForm from "@/components/CreateQuizForm"; // Will create this next

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  difficulty: string | null;
  teacher_id: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
  questions_count: number; // To store the count of questions
}

const Quizzes = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCreateQuizDialogOpen, setIsCreateQuizDialogOpen] = useState(false);

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
          console.error("Error fetching user role for quizzes:", error);
        } else if (profile) {
          setUserRole(profile.role);
        }
      }
    };
    fetchUserRole();
  }, []);

  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quizzes")
      .select(`
        id,
        title,
        description,
        subject,
        difficulty,
        teacher_id,
        created_at,
        profiles (
          full_name
        ),
        questions(count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch quizzes: " + error.message);
      console.error("Error fetching quizzes:", error);
    } else {
      const quizzesWithCounts = data.map(quiz => ({
        ...quiz,
        questions_count: quiz.questions ? quiz.questions.length : 0,
      }));
      setQuizzes(quizzesWithCounts as Quiz[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handleQuizCreated = () => {
    setIsCreateQuizDialogOpen(false);
    fetchQuizzes(); // Refresh the list of quizzes
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Chemistry Quizzes</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Test your knowledge with interactive quizzes!
        </p>

        {userRole === "teacher" && (
          <div className="mb-8">
            <Dialog open={isCreateQuizDialogOpen} onOpenChange={setIsCreateQuizDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Create New Quiz</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Quiz</DialogTitle>
                </DialogHeader>
                <CreateQuizForm onQuizCreated={handleQuizCreated} />
              </DialogContent>
            </Dialog>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6">Loading quizzes...</p>
        ) : (
          <div className="space-y-6">
            {quizzes.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No quizzes available yet.</p>
            ) : (
              quizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quizzes;