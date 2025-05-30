import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Award, BookOpen, Users, FlaskConical, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface UserProfile {
  full_name: string;
  profile_picture_url: string | null;
  role: string;
  current_streak: number;
  last_activity_date: string | null;
}

interface QuizResult {
  id: string;
  score: number;
  total_questions: number;
  submitted_at: string;
  quizzes: {
    title: string;
    subject: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  due_date: string | null;
  total_points: number;
  classes: {
    name: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  subject: string;
  difficulty: string | null;
}

interface Class {
  id: string;
  name: string;
  subject: string;
  class_code: string;
}

const Home = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recentQuizResults, setRecentQuizResults] = useState<QuizResult[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [teacherQuizzes, setTeacherQuizzes] = useState<Quiz[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<Assignment[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      showError("User not logged in.");
      setLoading(false);
      return;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, profile_picture_url, role, current_streak, last_activity_date")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      showError("Failed to fetch profile: " + (profileError?.message || "Unknown error"));
      console.error("Error fetching profile:", profileError);
      setLoading(false);
      return;
    }
    setUserProfile(profile as UserProfile);

    if (profile.role === "student") {
      // Fetch recent quiz results for student
      const { data: quizResultsData, error: quizResultsError } = await supabase
        .from("quiz_results")
        .select(`
          id,
          score,
          total_questions,
          submitted_at,
          quizzes (title, subject)
        `)
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(3);

      if (quizResultsError) {
        console.error("Error fetching quiz results:", quizResultsError);
      } else {
        setRecentQuizResults(quizResultsData as QuizResult[]);
      }

      // Fetch upcoming assignments for student's enrolled classes
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("student_id", user.id);

      if (enrollmentsError) {
        console.error("Error fetching enrollments:", enrollmentsError);
      } else if (enrollments && enrollments.length > 0) {
        const classIds = enrollments.map(e => e.class_id);
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("assignments")
          .select(`
            id,
            title,
            due_date,
            total_points,
            classes (name)
          `)
          .in("class_id", classIds)
          .gte("due_date", new Date().toISOString()) // Only future assignments
          .order("due_date", { ascending: true })
          .limit(5);

        if (assignmentsError) {
          console.error("Error fetching upcoming assignments:", assignmentsError);
        } else {
          setUpcomingAssignments(assignmentsData as Assignment[]);
        }

        // Fetch enrolled classes for student
        const { data: enrolledClassesData, error: enrolledClassesError } = await supabase
          .from("class_enrollments")
          .select(`
            classes (
              id,
              name,
              subject,
              class_code
            )
          `)
          .eq("student_id", user.id)
          .limit(3);

        if (enrolledClassesError) {
          console.error("Error fetching enrolled classes:", enrolledClassesError);
        } else {
          setEnrolledClasses(enrolledClassesData.map(e => e.classes) as Class[]);
        }
      }
    } else if (profile.role === "teacher") {
      // Fetch recent quizzes created by teacher
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("id, title, subject, difficulty")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (quizzesError) {
        console.error("Error fetching teacher quizzes:", quizzesError);
      } else {
        setTeacherQuizzes(quizzesData as Quiz[]);
      }

      // Fetch upcoming assignments created by teacher
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          due_date,
          total_points,
          classes (name)
        `)
        .eq("teacher_id", user.id)
        .gte("due_date", new Date().toISOString()) // Only future assignments
        .order("due_date", { ascending: true })
        .limit(5);

      if (assignmentsError) {
        console.error("Error fetching teacher assignments:", assignmentsError);
      } else {
        setTeacherAssignments(assignmentsData as Assignment[]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Profile not found. Please log in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100 font-chemistry">
          Welcome, {userProfile.full_name.split(' ')[0]}!
        </h1>

        <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg mb-6">
          <CardHeader className="flex flex-row items-center space-x-4">
            <img
              src={userProfile.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userProfile.full_name}`}
              alt={userProfile.full_name}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100 font-chemistry">{userProfile.full_name}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">Role: {userProfile.role}</p>
              {userProfile.role === "student" && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak: {userProfile.current_streak} days 🔥</p>
              )}
            </div>
          </CardHeader>
        </Card>

        {userProfile.role === "student" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center font-chemistry">
                  <Award className="h-5 w-5 mr-2" /> Recent Quiz Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentQuizResults.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">No quiz results yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {recentQuizResults.map((result) => (
                      <li key={result.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{result.quizzes.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Score: {result.score} / {result.total_questions} ({result.quizzes.subject})
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Submitted: {new Date(result.submitted_at).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="link" className="w-full mt-4" asChild>
                  <Link to="/my-quiz-results">View All Results</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center font-chemistry">
                  <CalendarDays className="h-5 w-5 mr-2" /> Upcoming Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAssignments.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">No upcoming assignments.</p>
                ) : (
                  <ul className="space-y-3">
                    {upcomingAssignments.map((assignment) => (
                      <li key={assignment.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{assignment.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Class: {assignment.classes.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "N/A"}
                        </p>
                        <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                          <Link to={`/assignments/${assignment.id}`}>View Assignment</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="link" className="w-full mt-4" asChild>
                  <Link to="/my-classes">View All Classes & Assignments</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg md:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center font-chemistry">
                  <Users className="h-5 w-5 mr-2" /> My Enrolled Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrolledClasses.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">You are not enrolled in any classes yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {enrolledClasses.map((cls) => (
                      <li key={cls.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{cls.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Subject: {cls.subject}</p>
                        <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                          <Link to={`/classes/${cls.id}/discussions`}>Go to Class</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="link" className="w-full mt-4" asChild>
                  <Link to="/my-classes">Manage My Classes</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {userProfile.role === "teacher" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center font-chemistry">
                  <FlaskConical className="h-5 w-5 mr-2" /> Recent Quizzes Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teacherQuizzes.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">No quizzes created yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {teacherQuizzes.map((quiz) => (
                      <li key={quiz.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{quiz.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Subject: {quiz.subject} {quiz.difficulty && `(${quiz.difficulty})`}
                        </p>
                        <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                          <Link to={`/quizzes`}>Manage Quiz</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="link" className="w-full mt-4" asChild>
                  <Link to="/quizzes">View All Quizzes</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center font-chemistry">
                  <FileText className="h-5 w-5 mr-2" /> Upcoming Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teacherAssignments.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">No upcoming assignments created.</p>
                ) : (
                  <ul className="space-y-3">
                    {teacherAssignments.map((assignment) => (
                      <li key={assignment.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{assignment.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Class: {assignment.classes.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "N/A"}
                        </p>
                        <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                          <Link to={`/assignments/${assignment.id}`}>View Assignment</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="link" className="w-full mt-4" asChild>
                  <Link to="/classes">Manage All Assignments</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {userProfile.role === "personal" && (
          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-chemistry">Your Personal Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                This is your personal space. You can use the calendar to track events, explore resources, and take quizzes.
              </p>
              <div className="mt-4 space-y-2">
                <Button className="w-full" asChild><Link to="/calendar">Go to Calendar</Link></Button>
                <Button className="w-full" asChild><Link to="/quizzes">Explore Quizzes</Link></Button>
                <Button className="w-full" asChild><Link to="/resources">Browse Resources</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Home;