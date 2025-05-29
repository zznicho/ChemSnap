import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

export const updateUserStreak = async (userId: string, currentStreak: number, lastActivityDate: string | null) => {
  // First, fetch the user's role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.error("Error fetching profile for streak update:", profileError);
    return;
  }

  // Only update streak for students
  if (profile.role !== "student") {
    console.log(`Streak update skipped for non-student user ${userId} (Role: ${profile.role}).`);
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  let newStreak = currentStreak;
  let newLastActivityDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  if (lastActivityDate) {
    const lastActivity = new Date(lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0); // Normalize to start of day

    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    const diffDays = Math.round(Math.abs((today.getTime() - lastActivity.getTime()) / oneDay));

    if (diffDays === 1) {
      // Active yesterday, continue streak
      newStreak += 1;
    } else if (diffDays === 0) {
      // Already active today, no change needed
      return;
    } else {
      // Gap in activity, reset streak
      newStreak = 1;
    }
  } else {
    // First activity, start streak
    newStreak = 1;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      current_streak: newStreak,
      last_activity_date: newLastActivityDate,
      updated_at: new Date().toISOString(), // Also update the general updated_at timestamp
    })
    .eq("id", userId);

  if (error) {
    showError("Failed to update streak: " + error.message);
    console.error("Error updating streak:", error);
  } else {
    console.log(`Streak updated for user ${userId}: ${newStreak} days.`);
  }
};