import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const ProfileButton = () => {
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("profile_picture_url")
          .eq("id", user.id)
          .single();

        if (data) {
          setProfilePictureUrl(data.profile_picture_url);
        } else if (error) {
          console.error("Error fetching profile picture:", error);
        }
      }
    };

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        fetchProfile();
      } else if (event === "SIGNED_OUT") {
        setProfilePictureUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Link to="/profile" className="absolute top-4 right-4 z-50">
      <Avatar className="h-10 w-10 border-2 border-primary">
        {profilePictureUrl ? (
          <AvatarImage src={profilePictureUrl} alt="Profile Picture" />
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-6 w-6" />
          </AvatarFallback>
        )}
      </Avatar>
    </Link>
  );
};

export default ProfileButton;