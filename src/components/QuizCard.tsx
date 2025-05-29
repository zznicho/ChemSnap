import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Award, Hash } from "lucide-react";
import { Link } from "react-router-dom";

interface QuizCardProps {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  difficulty: string | null;
  questionCount: number;
  totalPoints: number; // Add totalPoints
}

const QuizCard = ({ id, title, description, subject, difficulty, questionCount, totalPoints }: QuizCardProps) => {
  return (
    <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <CardHeader>
        <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{title}</CardTitle>
        <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center"><BookOpen className="h-4 w-4 mr-1" /> {subject}</span>
          {difficulty && <span className="flex items-center"><Award className="h-4 w-4 mr-1" /> {difficulty}</span>}
          <span className="flex items-center"><Hash className="h-4 w-4 mr-1" /> {questionCount} Questions ({totalPoints} Points)</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {description && <p className="text-gray-800 dark:text-gray-200">{description}</p>}
        <Link to={`/quizzes/${id}`}>
          <Button className="w-full mt-2">Start Quiz</Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default QuizCard;