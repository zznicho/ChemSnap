import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import CreateEventForm from "@/components/CreateEventForm";
import CreateAssignmentForm from "@/components/CreateAssignmentForm"; // Import CreateAssignmentForm
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isSameDay, parseISO } from "date-fns";
import { PlusCircle, Clock, Tag, Users, FileText } from "lucide-react"; // Import FileText icon
import { Link } from "react-router-dom"; // Import Link for navigating to assignment details

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  color: string;
  is_personal: boolean;
  class_id: string | null;
  classes: {
    name: string;
  } | null;
  type: "event"; // Add type discriminator
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  total_points: number;
  file_url: string | null;
  classes: {
    name: string;
  } | null;
  type: "assignment"; // Add type discriminator
}

type CalendarItem = CalendarEvent | Assignment;

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);
  const [isCreateAssignmentDialogOpen, setIsCreateAssignmentDialogOpen] = useState(false); // New state for assignment dialog
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (error) {
          console.error("Error fetching user role for calendar:", error);
        } else if (profile) {
          setUserRole(profile.role);
        }
      }
    };
    fetchUser();
  }, []);

  const fetchCalendarItems = useCallback(async () => {
    setLoadingItems(true);
    if (!currentUserId) {
      setLoadingItems(false);
      return;
    }

    const fetchedEvents: CalendarEvent[] = [];
    const fetchedAssignments: Assignment[] = [];

    // Fetch personal events for the current user
    const { data: personalEvents, error: personalEventsError } = await supabase
      .from("calendar_events")
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        color,
        is_personal,
        class_id,
        classes (
          name
        )
      `)
      .eq("user_id", currentUserId)
      .order("start_time", { ascending: true });

    if (personalEventsError) {
      showError("Failed to fetch personal events for calendar: " + personalEventsError.message);
      console.error("Error fetching personal events:", personalEventsError);
    } else {
      fetchedEvents.push(...(personalEvents || []).map(e => ({ ...e, type: "event" as const })));
    }

    // Fetch class-related items based on user role
    if (userRole === "student") {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .eq("student_id", currentUserId);

      if (enrollmentsError) {
        showError("Failed to fetch class enrollments for calendar: " + enrollmentsError.message);
        console.error("Error fetching enrollments:", enrollmentsError);
      } else if (enrollments && enrollments.length > 0) {
        const classIds = enrollments.map(e => e.class_id);

        // Fetch class events (not personal) for enrolled classes
        const { data: classEvents, error: classEventsError } = await supabase
          .from("calendar_events")
          .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            color,
            is_personal,
            class_id,
            classes (
              name
            )
          `)
          .eq("is_personal", false)
          .in("class_id", classIds)
          .order("start_time", { ascending: true });

        if (classEventsError) {
          showError("Failed to fetch class events for calendar: " + classEventsError.message);
          console.error("Error fetching class events:", classEventsError);
        } else {
          fetchedEvents.push(...(classEvents || []).map(e => ({ ...e, type: "event" as const })));
        }

        // Fetch assignments for enrolled classes
        const { data: classAssignments, error: classAssignmentsError } = await supabase
          .from("assignments")
          .select(`
            id,
            title,
            description,
            due_date,
            total_points,
            file_url,
            classes!assignments_class_id_fkey (
              name
            )
          `)
          .in("class_id", classIds)
          .gte("due_date", new Date().toISOString()) // Only future assignments
          .order("due_date", { ascending: true });

        if (classAssignmentsError) {
          showError("Failed to fetch class assignments for calendar: " + classAssignmentsError.message);
          console.error("Error fetching class assignments:", classAssignmentsError);
        } else {
          fetchedAssignments.push(...(classAssignments || []).map(a => ({ ...a, type: "assignment" as const })));
        }
      }
    } else if (userRole === "teacher") {
      // Fetch events created by the teacher for their classes (non-personal)
      const { data: teacherClassEvents, error: teacherClassEventsError } = await supabase
        .from("calendar_events")
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          color,
          is_personal,
          class_id,
          classes (
            name
          )
        `)
        .eq("user_id", currentUserId) // Events created by this teacher
        .eq("is_personal", false) // Only class events
        .order("start_time", { ascending: true });

      if (teacherClassEventsError) {
        showError("Failed to fetch teacher's class events: " + teacherClassEventsError.message);
        console.error("Error fetching teacher's class events:", teacherClassEventsError);
      } else {
        fetchedEvents.push(...(teacherClassEvents || []).map(e => ({ ...e, type: "event" as const })));
      }

      // Fetch assignments created by the teacher
      const { data: teacherAssignments, error: teacherAssignmentsError } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          description,
          due_date,
          total_points,
          file_url,
          classes!assignments_class_id_fkey (
            name
          )
        `)
        .eq("teacher_id", currentUserId)
        .gte("due_date", new Date().toISOString()) // Only future assignments
        .order("due_date", { ascending: true });

      if (teacherAssignmentsError) {
        showError("Failed to fetch teacher's assignments: " + teacherAssignmentsError.message);
        console.error("Error fetching teacher's assignments:", teacherAssignmentsError);
        } else {
          fetchedAssignments.push(...(teacherAssignments || []).map(a => ({ ...a, type: "assignment" as const })));
        }
      }

      // Combine all fetched items and sort them
      const combinedItems: CalendarItem[] = [
        ...fetchedEvents,
        ...fetchedAssignments,
      ].sort((a, b) => {
        const dateA = a.type === "event" ? parseISO(a.start_time) : (a.due_date ? parseISO(a.due_date) : new Date(0));
        const dateB = b.type === "event" ? parseISO(b.start_time) : (b.due_date ? parseISO(b.due_date) : new Date(0));
        return dateA.getTime() - dateB.getTime();
      });

      // Deduplicate by ID (important if an event/assignment could be fetched by multiple queries)
      const uniqueItems = Array.from(new Map(combinedItems.map(item => [item.id, item])).values());
      setCalendarItems(uniqueItems);
      setLoadingItems(false);
    }, [currentUserId, userRole]);

  useEffect(() => {
    if (currentUserId && userRole) {
      fetchCalendarItems();
    }
  }, [currentUserId, userRole, fetchCalendarItems]);

  const itemsForSelectedDate = selectedDate
    ? calendarItems.filter((item) => {
        if (item.type === "event") {
          return isSameDay(parseISO(item.start_time), selectedDate);
        } else if (item.type === "assignment" && item.due_date) {
          return isSameDay(parseISO(item.due_date), selectedDate);
        }
        return false;
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100 font-chemistry">
          Your Calendar
        </h1>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/2 w-full">
            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-chemistry mb-4">Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border w-full"
                />
              </CardContent>
            </Card>
            <div className="mt-6 space-y-3">
              <Dialog open={isCreateEventDialogOpen} onOpenChange={setIsCreateEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" /> Create New Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create Calendar Event</DialogTitle>
                    <DialogDescription>
                      Fill out the form to create a new calendar event.
                    </DialogDescription>
                  </DialogHeader>
                  <CreateEventForm onEventCreated={fetchCalendarItems} onClose={() => setIsCreateEventDialogOpen(false)} />
                </DialogContent>
              </Dialog>

              {userRole === "teacher" && (
                <Dialog open={isCreateAssignmentDialogOpen} onOpenChange={setIsCreateAssignmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="secondary">
                      <PlusCircle className="h-4 w-4 mr-2" /> Create New Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Create New Assignment</DialogTitle>
                      <DialogDescription>
                        Fill out the form to create a new assignment for your class.
                      </DialogDescription>
                    </DialogHeader>
                    <CreateAssignmentForm onAssignmentCreated={fetchCalendarItems} onClose={() => setIsCreateAssignmentDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="md:w-1/2 w-full">
            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-chemistry mb-4">
                  Items on {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingItems ? (
                  <p className="text-center text-gray-600 dark:text-gray-400">Loading calendar items...</p>
                ) : itemsForSelectedDate.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400">No events or assignments for this date.</p>
                ) : (
                  <ul className="space-y-3">
                    {itemsForSelectedDate.map((item) => (
                      <li key={item.id} className="p-3 rounded-md border border-gray-200 dark:border-gray-700" style={{ borderLeft: `4px solid ${item.type === "event" ? item.color : '#F59E0B'}` }}> {/* Orange for assignments */}
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                        {item.type === "event" ? (
                          <>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(parseISO(item.start_time), "HH:mm")} - {format(parseISO(item.end_time), "HH:mm")}
                            </p>
                            {item.description && (
                              <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{item.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <Tag className="h-3 w-3 mr-1" />
                                {item.is_personal ? "Personal Event" : "Class Event"}
                              </span>
                              {!item.is_personal && item.classes?.name && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {item.classes.name}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                              <FileText className="h-3 w-3 mr-1" /> Assignment
                            </p>
                            {item.description && (
                              <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{item.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {item.classes?.name || "N/A"}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                Points: {item.total_points}
                              </span>
                            </div>
                            <Link to={`/assignments/${item.id}`} className="text-blue-600 hover:underline dark:text-blue-400 text-sm mt-2 inline-block">
                              View Assignment Details
                            </Link>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;