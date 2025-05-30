import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QuizCard from "@/components/QuizCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, BookOpen, Hash, Award, Eye, EyeOff, Trash2, Users as UsersIcon, CalendarDays } from "lucide-react";
import CreateQuizForm from "@/components/CreateQuizForm";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  difficulty: string | null;
  created_at: string;
  is_published: boolean;
  questions: { id: string; points: number }[];
  totalPoints: number;
  teacher_id?: string; // Optional for quizzes fetched by admin
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  points: number;
}

interface QuizResult {
  id: string;
  score: number;
  total_questions: number;
  total_score_possible: number | null;
  submitted_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface QuizWithResults extends Quiz {
  quiz_results: QuizResult[];
}

const questionFormSchema = z.object({
  question_text: z.string().min(1, { message: "Question text cannot be empty." }).max(500, { message: "Question text cannot exceed 500 characters." }),
  question_type: z.enum(["multiple_choice"], { message: "Question type is required." }),
  options: z.string().min(1, { message: "At least one option is required." }).transform(val => val.split(',').map(s => s.trim()).filter(Boolean)),
  correct_answer: z.string().min(1, { message: "Correct answer is required." }),
  explanation: z.string().max(500, { message: "Explanation cannot exceed 500 characters." }).optional(),
  points: z.preprocess(
    (val) => (val === "" ? 1 : Number(val)),
    z.number().int().min(1, { message: "Points must be at least 1." }).max(100, { message: "Points cannot exceed 100." })
  ),
}).refine(data => data.options.includes(data.correct_answer), {
  message: "Correct answer must be one of the provided options.",
  path: ["correct_answer"],
});

const Quizzes = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [teacherQuizzes, setTeacherQuizzes] = useState<QuizWithResults[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [isCreateQuizDialogOpen, setIsCreateQuizDialogOpen] = useState(false);
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("available"); // Default tab

  const questionForm = useForm<z.infer<typeof questionFormSchema>>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      question_text: "",
      question_type: "multiple_choice",
      options: "",
      correct_answer: "",
      explanation: "",
      points: 1,
    },
  });

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
      setUserRole(profile.role);
      setLoadingRole(false);
    };

    checkUserRole();
  }, [navigate]);

  const fetchQuizzesData = useCallback(async () => {
    setLoadingQuizzes(true);
    const { data: { user }, error: currentUserError } = await supabase.auth.getUser();
    if (currentUserError || !user) {
      showError("User not logged in for fetching quizzes.");
      console.error("Error getting current user:", currentUserError);
      setLoadingQuizzes(false);
      return;
    }

    // Fetch available quizzes (published ones for all users)
    const { data: availableData, error: availableError } = await supabase
      .from("quizzes")
      .select(`
        id,
        title,
        description,
        subject,
        difficulty,
        created_at,
        is_published,
        questions (id, points)
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (availableError) {
      showError("Failed to fetch available quizzes: " + availableError.message);
      console.error("Error fetching available quizzes:", availableError);
    } else {
      setAvailableQuizzes(availableData.map(quiz => ({
        ...quiz,
        totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
      })) as Quiz[]);
    }

    // Fetch teacher/admin specific quizzes and results
    if (userRole === "teacher" || userRole === "admin") {
      let query = supabase
        .from("quizzes")
        .select(`
          id,
          title,
          description,
          subject,
          difficulty,
          created_at,
          is_published,
          questions (id, points, question_text, question_type, options, correct_answer, explanation),
          quiz_results (
            id,
            score,
            total_questions,
            total_score_possible,
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

      if (userRole === "teacher") {
        query = query.eq("teacher_id", user.id);
      }

      const { data: teacherData, error: teacherError } = await query;

      if (teacherError) {
        showError("Failed to fetch your quizzes and analytics: " + teacherError.message);
        console.error("Error fetching teacher quizzes/analytics:", teacherError);
      } else {
        setTeacherQuizzes(teacherData as QuizWithResults[]);
      }
    }
    setLoadingQuizzes(false);
  }, [userRole]);

  useEffect(() => {
    if (userRole) {
      fetchQuizzesData();
    }
  }, [userRole, fetchQuizzesData]);

  const onAddQuestion = async (values: z.infer<typeof questionFormSchema>) => {
    if (!selectedQuizId) {
      showError("No quiz selected to add question to.");
      return;
    }
    try {
      const { error } = await supabase
        .from("questions")
        .insert({
          quiz_id: selectedQuizId,
          question_text: values.question_text,
          question_type: values.question_type,
          options: values.options,
          correct_answer: values.correct_answer,
          explanation: values.explanation || null,
          points: values.points,
        });

      if (error) {
        showError("Failed to add question: " + error.message);
        console.error("Error adding question:", error);
      } else {
        showSuccess("Question added successfully!");
        questionForm.reset();
        setIsAddQuestionDialogOpen(false);
        fetchQuizzesData();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleTogglePublish = async (quizId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ is_published: !currentStatus })
        .eq("id", quizId);

      if (error) {
        showError("Failed to update quiz status: " + error.message);
        console.error("Error updating quiz status:", error);
      } else {
        showSuccess(`Quiz ${!currentStatus ? 'published' : 'hidden'} successfully!`);
        fetchQuizzesData();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz and all its questions? This action cannot be undone.")) {
      return;
    }
    try {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (error) {
        showError("Failed to delete quiz: " + error.message);
        console.error("Error deleting quiz:", error);
      } else {
        showSuccess("Quiz deleted successfully!");
        fetchQuizzesData();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm("Are you sure you want to delete this question? This action cannot be undone.")) {
      return;
    }
    try {
      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      if (error) {
        showError("Failed to delete question: " + error.message);
        console.error("Error deleting question:", error);
      } else {
        showSuccess("Question deleted successfully!");
        fetchQuizzesData();
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

  if (userRole !== "admin") {
    return null; // Should have been redirected by now
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Chemistry Quizzes</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Test your knowledge with interactive quizzes or manage your own!
        </p>

        <Tabs defaultValue="available" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: userRole === "teacher" || userRole === "admin" ? "repeat(3, 1fr)" : "1fr" }}>
            <TabsTrigger value="available">Available Quizzes</TabsTrigger>
            {(userRole === "teacher" || userRole === "admin") && (
              <>
                <TabsTrigger value="manage">Manage Quizzes</TabsTrigger>
                <TabsTrigger value="analytics">Quiz Analytics</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="available" className="mt-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Explore Quizzes</h2>
            {loadingQuizzes ? (
              <p className="text-center text-gray-600 dark:text-gray-400 mt-6">Loading quizzes...</p>
            ) : (
              <div className="space-y-6">
                {availableQuizzes.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400">No quizzes available yet. Check back soon!</p>
                ) : (
                  availableQuizzes.map((quiz) => (
                    <QuizCard
                      key={quiz.id}
                      id={quiz.id}
                      title={quiz.title}
                      description={quiz.description}
                      subject={quiz.subject}
                      difficulty={quiz.difficulty}
                      questionCount={quiz.questions.length}
                      totalPoints={quiz.totalPoints}
                    />
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {(userRole === "teacher" || userRole === "admin") && (
            <>
              <TabsContent value="manage" className="mt-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Manage Your Quizzes</h2>
                <div className="mb-8">
                  <Dialog open={isCreateQuizDialogOpen} onOpenChange={setIsCreateQuizDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <PlusCircle className="h-4 w-4 mr-2" /> Create New Quiz
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Create New Quiz</DialogTitle>
                        <DialogDescription>
                          Fill out the form to create a new quiz.
                        </DialogDescription>
                      </DialogHeader>
                      <CreateQuizForm
                        onQuizCreated={fetchQuizzesData}
                        onClose={() => setIsCreateQuizDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                {loadingQuizzes ? (
                  <p className="text-center text-gray-600 dark:text-gray-400">Loading quizzes...</p>
                ) : (
                  <div className="space-y-4">
                    {teacherQuizzes.length === 0 ? (
                      <p className="text-center text-gray-600 dark:text-gray-400">You haven't created any quizzes yet.</p>
                    ) : (
                      teacherQuizzes.map((quiz) => (
                        <Card key={quiz.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                          <CardHeader>
                            <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{quiz.title}</CardTitle>
                            {userRole === "admin" && quiz.profiles?.full_name && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">Created by: {quiz.profiles.full_name}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex items-center"><BookOpen className="h-4 w-4 mr-1" /> {quiz.subject}</span>
                              {quiz.difficulty && <span className="flex items-center"><Award className="h-4 w-4 mr-1" /> {quiz.difficulty}</span>}
                              <span className="flex items-center"><Hash className="h-4 w-4 mr-1" /> {quiz.questions.length} Questions</span>
                              <span className="flex items-center">
                                {quiz.is_published ? <Eye className="h-4 w-4 mr-1 text-green-500" /> : <EyeOff className="h-4 w-4 mr-1 text-red-500" />}
                                {quiz.is_published ? "Published" : "Hidden"}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {quiz.description && <p className="text-gray-800 dark:text-gray-200">{quiz.description}</p>}
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedQuizId(quiz.id);
                                  setIsAddQuestionDialogOpen(true);
                                  questionForm.reset();
                                }}
                              >
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Question
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleTogglePublish(quiz.id, quiz.is_published)}
                              >
                                {quiz.is_published ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                {quiz.is_published ? "Hide Quiz" : "Publish Quiz"}
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Quiz
                              </Button>
                            </div>

                            {quiz.questions.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Questions</h3>
                                <ul className="space-y-2">
                                  {quiz.questions.map((question, index) => (
                                    <li key={question.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex justify-between items-center">
                                      <div className="flex-grow">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{index + 1}. {question.question_text}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Correct: {question.correct_answer} | Points: {question.points}</p>
                                      </div>
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                                        <Trash2 className="h-4 w-4" />
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
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quiz Analytics</h2>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
                  View performance data for quizzes you have created.
                </p>

                {loadingQuizzes ? (
                  <p className="text-center text-gray-600 dark:text-gray-400 mt-6">Loading analytics...</p>
                ) : (
                  <div className="space-y-6">
                    {teacherQuizzes.length === 0 ? (
                      <p className="text-center text-gray-600 dark:text-gray-400">You haven't created any quizzes with results yet.</p>
                    ) : (
                      teacherQuizzes.map((quiz) => {
                        const totalSubmissions = quiz.quiz_results.length;
                        const totalQuestions = quiz.questions.length;
                        const totalPossiblePoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);

                        const averageScore = totalSubmissions > 0
                          ? (quiz.quiz_results.reduce((sum, result) => sum + result.score, 0) / totalSubmissions).toFixed(2)
                          : "N/A";

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
                                <span className="flex items-center"><Hash className="h-4 w-4 mr-1" /> {totalQuestions} Questions ({totalPossiblePoints} Points)</span>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center space-x-4 text-base text-gray-800 dark:text-gray-200">
                                <span className="flex items-center"><UsersIcon className="h-4 w-4 mr-1" /> Submissions: {totalSubmissions}</span>
                                <span className="flex items-center"><Award className="h-4 w-4 mr-1" /> Avg. Score: {averageScore} / {totalPossiblePoints}</span>
                              </div>

                              {totalSubmissions > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Individual Results</h3>
                                  <ul className="space-y-2">
                                    {quiz.quiz_results.map((result) => (
                                      <li key={result.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                          <p className="font-medium text-gray-900 dark:text-gray-100">{result.profiles?.full_name || "Unknown User"}</p>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">{result.profiles?.email}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold text-primary dark:text-primary-foreground">
                                            {result.score} / {result.total_score_possible !== null ? result.total_score_possible : result.total_questions}
                                          </p>
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
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {selectedQuizId && (
        <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Question to Quiz</DialogTitle>
              <DialogDescription>
                Add a new question to the selected quiz.
              </DialogDescription>
            </DialogHeader>
            <Form {...questionForm}>
              <form onSubmit={questionForm.handleSubmit(onAddQuestion)} className="space-y-4">
                <FormField
                  control={questionForm.control}
                  name="question_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., What is the chemical symbol for water?" className="min-h-[80px] resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={questionForm.control}
                  name="question_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select question type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={questionForm.control}
                  name="options"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Options (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., H2O, CO2, O2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={questionForm.control}
                  name="correct_answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correct Answer</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., H2O" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={questionForm.control}
                  name="explanation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Explanation (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Explain the correct answer" className="min-h-[60px] resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={questionForm.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points for this Question</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Add Question</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Quizzes;