import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";

interface Profile {
  full_name: string;
  email: string;
  role: string;
  education_level?: string;
  profile_picture_url?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, email, role, education_level, profile_picture_url")
          .eq("id", user.id)
          .single();

        if (error) {
          showError("Failed to fetch profile: " + error.message);
          console.error("Error fetching profile:", error);
        } else {
          setUserProfile(data);
        }
      } else {
        navigate("/login");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Logout failed: " + error.message);
    } else {
      showSuccess("Logged out successfully!");
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
          {userProfile.role === "student" && (
            <div className="text-center text-gray-700 dark:text-gray-300">
              <h3 className="font-semibold text-lg mb-2">Student Progress</h3>
              <p>Streaks: 0</p>
              <p>Achievements: None yet</p>
              {/* Placeholder for Duolingo-like progress */}
            </div>
          )}
          <Button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white">
            Log Out
          </Button>
          {/* Add buttons for changing display name, password, email, profile picture, delete account later */}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;