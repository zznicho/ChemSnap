import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle } from "lucide-react";
import { updateUserStreak } from "@/utils/streakUtils"; // Import streak utility

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  points: number; // Add points
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  difficulty: string | null;
  questions: Question[];
}

const QuizDetails = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  const fetchQuizDetails = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quizzes")
      .select(`
        id,
        title,
        description,
        subject,
        difficulty,
        questions (
          id,
          question_text,
          question_type,
          options,
          correct_answer,
          explanation,
          points
        )
      `)
      .eq("id", quizId)
      .eq("is_published", true) // Only fetch published quizzes
      .single();

    if (error) {
      showError("Failed to fetch quiz details: " + error.message);
      console.error("Error fetching quiz:", error);
      setQuiz(null);
    } else {
      setQuiz(data as Quiz);
    }
    setLoading(false);
  }, [quizId]);

  useEffect(() => {
    fetchQuizDetails();
  }, [fetchQuizDetails]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || !currentUserId) {
      showError("Cannot submit quiz. User not logged in or quiz data missing.");
      return;
    }

    let correctPoints = 0;
    let totalPossiblePoints = 0;

    quiz.questions.forEach((question) => {
      totalPossiblePoints += question.points;
      if (userAnswers[question.id] === question.correct_answer) {
        correctPoints += question.points;
      }
    });
    setScore(correctPoints);
    setSubmitted(true);

    // Save quiz result to database
    const { error: insertError } = await supabase
      .from("quiz_results")
      .insert({
        quiz_id: quiz.id,
        user_id: currentUserId,
        score: correctPoints,
        total_questions: quiz.questions.length,
        total_score_possible: totalPossiblePoints, // Save total possible score
      });

    if (insertError) {
      showError("Failed to save quiz result: " + insertError.message);
      console.error("Error saving quiz result:", insertError);
    } else {
      showSuccess(`Quiz completed! You scored ${correctPoints} out of ${totalPossiblePoints}. Result saved.`);

      // Update user streak after successful quiz submission
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("current_streak, last_activity_date")
        .eq("id", currentUserId)
        .single();

      if (profileError) {
        console.error("Error fetching profile for streak update:", profileError);
      } else if (profile) {
        await updateUserStreak(currentUserId, profile.current_streak, profile.last_activity_date);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Loading quiz...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Quiz not found or not published.</p>
      </div>
    );
  }

  const totalQuizPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-2xl">
        <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">{quiz.title}</CardTitle>
            {quiz.description && (
              <p className="text-center text-gray-600 dark:text-gray-400 mt-2">{quiz.description}</p>
            )}
            <div className="flex justify-center flex-wrap gap-2 mt-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Subject: {quiz.subject}</span>
              {quiz.difficulty && <span>Difficulty: {quiz.difficulty}</span>}
              <span>Questions: {quiz.questions.length}</span>
              <span>Total Points: {totalQuizPoints}</span>
            </div>
          </CardHeader>
        </Card>

        {submitted && (
          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6 p-4 text-center">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Your Score: {score} / {totalQuizPoints}
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Review your answers below.</p>
          </Card>
        )}

        <div className="space-y-6">
          {quiz.questions.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">No questions available for this quiz yet.</p>
          ) : (
            quiz.questions.map((question, index) => (
              <Card key={question.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {index + 1}. {question.question_text} ({question.points} points)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {question.question_type === "multiple_choice" && (
                    <RadioGroup
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                      value={userAnswers[question.id]}
                      disabled={submitted}
                    >
                      {question.options.map((option, optIndex) => {
                        const isCorrect = submitted && option === question.correct_answer;
                        const isUserSelected = submitted && userAnswers[question.id] === option;
                        const isWrongAndSelected = submitted && isUserSelected && !isCorrect;

                        return (
                          <div
                            key={optIndex}
                            className={`flex items-center space-x-2 p-3 rounded-md border mb-2
                              ${submitted ? (isCorrect ? "border-green-500 bg-green-50/50 dark:bg-green-900/20" : (isWrongAndSelected ? "border-red-500 bg-red-50/50 dark:bg-red-900/20" : "border-gray-200 dark:border-gray-700")) : "border-gray-200 dark:border-gray-700"}
                            `}
                          >
                            <RadioGroupItem value={option} id={`q${question.id}-opt${optIndex}`} />
                            <Label htmlFor={`q${question.id}-opt${optIndex}`} className="flex-grow text-gray-800 dark:text-gray-200 cursor-pointer">
                              {option}
                            </Label>
                            {submitted && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                            {submitted && isWrongAndSelected && <XCircle className="h-5 w-5 text-red-500" />}
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}
                  {submitted && question.explanation && (
                    <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
                      <h4 className="font-semibold mb-1">Explanation:</h4>
                      <p>{question.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {!submitted && quiz.questions.length > 0 && (
          <CardFooter className="mt-6 p-4 bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <Button onClick={handleSubmitQuiz} className="w-full">
              Submit Quiz
            </Button>
          </CardFooter>
        )}
      </div>
    </div>
  );
};

export default QuizDetails;