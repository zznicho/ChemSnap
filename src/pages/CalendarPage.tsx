import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

const CalendarPage = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-950 p-4">
      <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100">Your Calendar</h1>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border w-full"
        />
        <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
          Manage your personal and class events here. More features coming soon!
        </p>
      </div>
    </div>
  );
};

export default CalendarPage;