import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import QuizCard from "@/components/QuizCard"; // Import the new QuizCard component

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  difficulty: string | null;
  created_at: string;
  questions: { id: string }[]; // To count questions
}

const Quizzes = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

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
        created_at,
        questions (id)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch quizzes: " + error.message);
      console.error("Error fetching quizzes:", error);
    } else {
      setQuizzes(data.map(quiz => ({
        ...quiz,
        questionCount: quiz.questions.length,
      })) as Quiz[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Chemistry Quizzes</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Test your knowledge with interactive quizzes!
        </p>

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6">Loading quizzes...</p>
        ) : (
          <div className="space-y-6">
            {quizzes.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No quizzes available yet. Check back soon!</p>
            ) : (
              quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  id={quiz.id}
                  title={quiz.title}
                  description={quiz.description}
                  subject={quiz.subject}
                  difficulty={quiz.difficulty}
                  questionCount={quiz.questionCount}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quizzes;