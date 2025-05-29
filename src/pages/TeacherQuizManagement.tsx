import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, BookOpen, Hash, Award, Edit, Trash2 } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  difficulty: string | null;
  created_at: string;
  questions: Question[];
  profiles?: { // Add profiles to Quiz interface for admin view
    full_name: string;
  };
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
}

const quizFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }).max(100, { message: "Title cannot exceed 100 characters." }),
  description: z.string().max(500, { message: "Description cannot exceed 500 characters." }).optional(),
  subject: z.string().min(1, { message: "Subject is required." }),
  difficulty: z.string().optional(),
});

const questionFormSchema = z.object({
  question_text: z.string().min(1, { message: "Question text cannot be empty." }).max(500, { message: "Question text cannot exceed 500 characters." }),
  question_type: z.enum(["multiple_choice"], { message: "Question type is required." }),
  options: z.string().min(1, { message: "At least one option is required." }).transform(val => val.split(',').map(s => s.trim()).filter(Boolean)),
  correct_answer: z.string().min(1, { message: "Correct answer is required." }),
  explanation: z.string().max(500, { message: "Explanation cannot exceed 500 characters." }).optional(),
}).refine(data => data.options.includes(data.correct_answer), {
  message: "Correct answer must be one of the provided options.",
  path: ["correct_answer"],
});

const TeacherQuizManagement = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [isCreateQuizDialogOpen, setIsCreateQuizDialogOpen] = useState(false);
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  const quizForm = useForm<z.infer<typeof quizFormSchema>>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: {
      title: "",
      description: "",
      subject: "",
      difficulty: "",
    },
  });

  const questionForm = useForm<z.infer<typeof questionFormSchema>>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      question_text: "",
      question_type: "multiple_choice",
      options: "",
      correct_answer: "",
      explanation: "",
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

      // Allow teachers AND admins to access this page
      if (profile.role !== "teacher" && profile.role !== "admin") {
        showError("Access Denied: Only teachers and administrators can manage quizzes.");
        navigate("/");
        return;
      }
      setUserRole(profile.role);
      setLoadingRole(false);
    };

    checkUserRole();
  }, [navigate]);

  const fetchQuizzes = useCallback(async () => {
    setLoadingQuizzes(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingQuizzes(false);
      return;
    }

    let query = supabase
      .from("quizzes")
      .select(`
        id,
        title,
        description,
        subject,
        difficulty,
        created_at,
        questions (
          id,
          question_text,
          question_type,
          options,
          correct_answer,
          explanation
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

    const { data, error } = await query;

    if (error) {
      showError("Failed to fetch quizzes: " + error.message);
      console.error("Error fetching quizzes:", error);
    } else {
      setQuizzes(data as Quiz[]);
    }
    setLoadingQuizzes(false);
  }, [userRole]); // Depend on userRole to refetch if it changes

  useEffect(() => {
    if (userRole) { // Fetch quizzes once userRole is determined
      fetchQuizzes();
    }
  }, [userRole, fetchQuizzes]);

  const onCreateQuiz = async (values: z.infer<typeof quizFormSchema>) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showError("You must be logged in to create a quiz.");
        return;
      }

      const { error } = await supabase
        .from("quizzes")
        .insert({
          title: values.title,
          description: values.description || null,
          subject: values.subject,
          difficulty: values.difficulty || null,
          teacher_id: user.id,
        });

      if (error) {
        showError("Failed to create quiz: " + error.message);
        console.error("Error creating quiz:", error);
      } else {
        showSuccess("Quiz created successfully!");
        quizForm.reset();
        setIsCreateQuizDialogOpen(false);
        fetchQuizzes();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

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
        });

      if (error) {
        showError("Failed to add question: " + error.message);
        console.error("Error adding question:", error);
      } else {
        showSuccess("Question added successfully!");
        questionForm.reset();
        setIsAddQuestionDialogOpen(false);
        fetchQuizzes(); // Refresh quizzes to show new question
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz and all its questions?")) {
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
        fetchQuizzes();
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
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
        fetchQuizzes(); // Refresh quizzes to update question list
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
    return null; // Should have been redirected by now
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Quiz Management</h1>

        {(userRole === "teacher" || userRole === "admin") && ( // Both teachers and admins can create quizzes
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
                </DialogHeader>
                <Form {...quizForm}>
                  <form onSubmit={quizForm.handleSubmit(onCreateQuiz)} className="space-y-4">
                    <FormField
                      control={quizForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quiz Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Organic Chemistry Basics" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quizForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of the quiz" className="min-h-[80px] resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quizForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="chemistry">Chemistry</SelectItem>
                              <SelectItem value="biology">Biology</SelectItem>
                              <SelectItem value="physics">Physics</SelectItem>
                              <SelectItem value="math">Math</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quizForm.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">Create Quiz</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Your Quizzes</h2>
        {loadingQuizzes ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading quizzes...</p>
        ) : (
          <div className="space-y-4">
            {quizzes.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">You haven't created any quizzes yet.</p>
            ) : (
              quizzes.map((quiz) => (
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
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quiz.description && <p className="text-gray-800 dark:text-gray-200">{quiz.description}</p>}
                    <div className="flex justify-end space-x-2">
                      {(userRole === "teacher" || userRole === "admin") && ( // Both teachers and admins can add questions
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuizId(quiz.id);
                            setIsAddQuestionDialogOpen(true);
                            questionForm.reset(); // Reset form when opening for a new quiz
                          }}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" /> Add Question
                        </Button>
                      )}
                      {(userRole === "teacher" || userRole === "admin") && ( // Both teachers and admins can delete quizzes
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Quiz
                        </Button>
                      )}
                    </div>

                    {quiz.questions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Questions</h3>
                        <ul className="space-y-2">
                          {quiz.questions.map((question, index) => (
                            <li key={question.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex justify-between items-center">
                              <div className="flex-grow">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{index + 1}. {question.question_text}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Correct: {question.correct_answer}</p>
                              </div>
                              {(userRole === "teacher" || userRole === "admin") && ( // Both teachers and admins can delete questions
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
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

      {selectedQuizId && (
        <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Question to Quiz</DialogTitle>
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
                          {/* Add other types if needed later */}
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
                <Button type="submit" className="w-full">Add Question</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TeacherQuizManagement;