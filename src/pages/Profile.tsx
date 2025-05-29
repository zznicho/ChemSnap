import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import ProfileEditForm from "@/components/ProfileEditForm";
import AccountActions from "@/components/AccountActions";

interface Profile {
  full_name: string;
  email: string;
  role: string;
  education_level?: string | null;
  profile_picture_url?: string | null;
  current_streak: number; // Add current_streak
  last_activity_date: string | null; // Add last_activity_date
}

const Profile = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, role, education_level, profile_picture_url, current_streak, last_activity_date") // Select new fields
        .eq("id", user.id)
        .single();

      if (error) {
        showError("Failed to fetch profile: " + error.message);
        console.error("Error fetching profile:", error);
        setUserProfile(null);
      } else {
        setUserProfile(data as Profile); // Cast to Profile type
      }
    } else {
      navigate("/login");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [navigate]);

  const handleProfileUpdate = async (values: { full_name: string; education_level?: string | null; profile_picture_url?: string | null; }) => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in to update your profile.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name,
        education_level: values.education_level || null,
        profile_picture_url: values.profile_picture_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      showError("Failed to update profile: " + error.message);
      console.error("Error updating profile:", error);
    } else {
      showSuccess("Profile updated successfully!");
      setEditMode(false);
      fetchProfile();
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Logout failed: " + error.message);
    } else {
      showSuccess("Logged out successfully!");
      navigate("/login");
    }
  };

  const handleChangePassword = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });
      if (error) {
        showError("Failed to send password reset email: " + error.message);
      } else {
        showSuccess("Password reset email sent! Check your inbox.");
      }
    } else {
      showError("You must be logged in to change your password.");
    }
  };

  const handleChangeEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      showError("Email change functionality requires a new email input and verification. Please contact support for now.");
    } else {
      showError("You must be logged in to change your email.");
    }
  };

  const handleDeleteAccount = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Failed to sign out before account deletion attempt: " + error.message);
    } else {
      showSuccess("Your account has been signed out. For full account deletion, please contact support or refer to the app's documentation for further steps.");
      navigate("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
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
    <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-md rounded-lg">
        <CardHeader className="text-center">
          <img
            src={userProfile.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${userProfile.full_name}`}
            alt={userProfile.full_name}
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
          />
          <CardTitle className="text-2xl text-gray-900 dark:text-gray-100">{userProfile.full_name}</CardTitle>
          <p className="text-gray-600 dark:text-gray-400">{userProfile.email}</p>
          <p className="text-gray-600 dark:text-gray-400 capitalize">Role: {userProfile.role}</p>
          {userProfile.role === "student" && userProfile.education_level && (
            <p className="text-gray-600 dark:text-gray-400">Education Level: {userProfile.education_level}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <ProfileEditForm
              initialProfile={userProfile}
              onSave={handleProfileUpdate}
              onCancel={() => setEditMode(false)}
              isSaving={isSaving}
            />
          ) : (
            <>
              {userProfile.role === "student" && (
                <div className="text-center text-gray-700 dark:text-gray-300">
                  <h3 className="font-semibold text-lg mb-2">Student Progress</h3>
                  <p>Current Streak: {userProfile.current_streak} days 🔥</p> {/* Display streak */}
                  <p>Achievements: None yet</p>
                </div>
              )}
              <Button onClick={() => setEditMode(true)} className="w-full">
                Edit Profile
              </Button>
              <AccountActions
                onLogout={handleLogout}
                onChangePassword={handleChangePassword}
                onChangeEmail={handleChangeEmail}
                onDeleteAccount={handleDeleteAccount}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;