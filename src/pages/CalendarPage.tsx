import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CreateEventForm from "@/components/CreateEventForm";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, isSameDay, parseISO } from "date-fns";
import { PlusCircle, Clock, Tag, Users } from "lucide-react";

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
}

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);
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

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    if (!currentUserId) {
      setLoadingEvents(false);
      return;
    }

    let query = supabase
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
      .order("start_time", { ascending: true });

    // Fetch personal events for the current user
    query = query.eq("user_id", currentUserId);

    // If user is a student, also fetch events from their enrolled classes
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
        // Fetch events that are NOT personal AND belong to one of the student's classes
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
          const { data: personalEvents, error: personalEventsError } = await query; // Execute the personal events query
          if (personalEventsError) {
            showError("Failed to fetch personal events for calendar: " + personalEventsError.message);
            console.error("Error fetching personal events:", personalEventsError);
            setEvents(classEvents || []);
          } else {
            // Combine and deduplicate events
            const combinedEvents = [...(personalEvents || []), ...(classEvents || [])];
            const uniqueEvents = Array.from(new Map(combinedEvents.map(item => [item['id'], item])).values());
            setEvents(uniqueEvents as CalendarEvent[]);
          }
        }
      } else {
        // If no enrollments, just fetch personal events
        const { data: personalEvents, error: personalEventsError } = await query;
        if (personalEventsError) {
          showError("Failed to fetch personal events for calendar: " + personalEventsError.message);
          console.error("Error fetching personal events:", personalEventsError);
        } else {
          setEvents(personalEvents as CalendarEvent[]);
        }
      }
    } else {
      // For teachers or personal users, fetch all their events (personal and class-related)
      const { data, error } = await query;
      if (error) {
        showError("Failed to fetch events: " + error.message);
        console.error("Error fetching events:", error);
      } else {
        setEvents(data as CalendarEvent[]);
      }
    }
    setLoadingEvents(false);
  }, [currentUserId, userRole]);

  useEffect(() => {
    if (currentUserId && userRole) { // Ensure user ID and role are loaded before fetching events
      fetchEvents();
    }
  }, [currentUserId, userRole, fetchEvents]);

  const eventsForSelectedDate = selectedDate
    ? events.filter((event) => isSameDay(parseISO(event.start_time), selectedDate))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Your Calendar</h1>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/2 w-full">
            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Date</CardTitle>
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
            <div className="mt-6">
              <Dialog open={isCreateEventDialogOpen} onOpenChange={setIsCreateEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <PlusCircle className="h-4 w-4 mr-2" /> Create New Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create Calendar Event</DialogTitle>
                  </DialogHeader>
                  <CreateEventForm onEventCreated={() => {
                    setIsCreateEventDialogOpen(false);
                    fetchEvents(); // Refresh events after creation
                  }} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="md:w-1/2 w-full">
            <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Events on {selectedDate ? format(selectedDate, "PPP") : "No date selected"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEvents ? (
                  <p className="text-center text-gray-600 dark:text-gray-400">Loading events...</p>
                ) : eventsForSelectedDate.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400">No events for this date.</p>
                ) : (
                  <ul className="space-y-3">
                    {eventsForSelectedDate.map((event) => (
                      <li key={event.id} className="p-3 rounded-md border border-gray-200 dark:border-gray-700" style={{ borderLeft: `4px solid ${event.color}` }}>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(parseISO(event.start_time), "HH:mm")} - {format(parseISO(event.end_time), "HH:mm")}
                        </p>
                        {event.description && (
                          <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{event.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <Tag className="h-3 w-3 mr-1" />
                            {event.is_personal ? "Personal" : "Class Event"}
                          </span>
                          {!event.is_personal && event.classes?.name && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {event.classes.name}
                            </span>
                          )}
                        </div>
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