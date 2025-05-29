import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom"; // Import useParams
import { showError, showSuccess } from "@/utils/toast";
import ProfileEditForm from "@/components/ProfileEditForm";
import AccountActions from "@/components/AccountActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, UserMinus, Check, X, Users, UserCheck, UserX } from "lucide-react"; // Import new icons

interface ProfileData {
  id: string; // Add id to ProfileData
  full_name: string;
  email: string;
  role: string;
  education_level?: string | null;
  profile_picture_url?: string | null;
  current_streak: number;
  last_activity_date: string | null;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  profiles: { // Sender's profile
    full_name: string;
    profile_picture_url: string | null;
  };
}

const Profile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>(); // Get userId from URL params
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmailChangeDialogOpen, setIsEmailChangeDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isEmailChanging, setIsEmailChanging] = useState(false);
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(null);

  // State for friend/follow relationships
  const [isFriend, setIsFriend] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasPendingRequestSent, setHasPendingRequestSent] = useState(false);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendRequest[]>([]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setCurrentAuthUserId(authUser?.id || null);

    const targetUserId = userId || authUser?.id; // Use param userId or current auth user's ID

    if (!targetUserId) {
      showError("No user ID provided or logged in.");
      navigate("/login");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, education_level, profile_picture_url, current_streak, last_activity_date")
      .eq("id", targetUserId)
      .single();

    if (error) {
      showError("Failed to fetch profile: " + error.message);
      console.error("Error fetching profile:", error);
      setUserProfile(null);
    } else {
      setUserProfile(data as ProfileData);

      // Fetch friend/follow status if viewing another user's profile
      if (authUser && authUser.id !== targetUserId) {
        // Check if already friends (accepted request in either direction)
        const { data: friendStatus, error: friendError } = await supabase
          .from("friend_requests")
          .select("id, status")
          .or(`and(sender_id.eq.${authUser.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${authUser.id})`)
          .eq("status", "accepted");

        if (friendError) console.error("Error checking friend status:", friendError);
        setIsFriend(friendStatus && friendStatus.length > 0);

        // Check if following
        const { data: followStatus, error: followError } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", authUser.id)
          .eq("following_id", targetUserId)
          .single();

        if (followError && followError.code !== 'PGRST116') console.error("Error checking follow status:", followError);
        setIsFollowing(!!followStatus);

        // Check for pending request sent by current user to target user
        const { data: pendingSent, error: pendingSentError } = await supabase
          .from("friend_requests")
          .select("id")
          .eq("sender_id", authUser.id)
          .eq("receiver_id", targetUserId)
          .eq("status", "pending")
          .single();

        if (pendingSentError && pendingSentError.code !== 'PGRST116') console.error("Error checking pending sent request:", pendingSentError);
        setHasPendingRequestSent(!!pendingSent);

      } else if (authUser && authUser.id === targetUserId) {
        // If viewing own profile, fetch incoming friend requests
        const { data: incomingRequests, error: incomingError } = await supabase
          .from("friend_requests")
          .select(`
            id,
            sender_id,
            receiver_id,
            status,
            profiles (full_name, profile_picture_url)
          `)
          .eq("receiver_id", authUser.id)
          .eq("status", "pending");

        if (incomingError) console.error("Error fetching incoming requests:", incomingError);
        setIncomingFriendRequests(incomingRequests as FriendRequest[] || []);
      }
    }
    setLoading(false);
  }, [userId, navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileUpdate = async (values: { full_name: string; education_level?: string | null; profile_picture_url?: string | null; }) => {
    setIsSaving(true);
    if (!currentAuthUserId) {
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
      .eq("id", currentAuthUserId);

    if (error) {
      showError("Failed to update profile: " + error.message);
      console.error("Error updating profile:", error);
    } else {
      showSuccess("Profile updated successfully!");
      setEditMode(false);
      fetchProfile(); // Re-fetch to update displayed data
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
    if (!currentAuthUserId || !userProfile?.email) {
      showError("You must be logged in and have an email to change your password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(userProfile.email, {
      redirectTo: `${window.location.origin}/login?reset=true`,
    });
    if (error) {
      showError("Failed to send password reset email: " + error.message);
    } else {
      showSuccess("Password reset email sent! Check your inbox.");
    }
  };

  const handleEmailChangeSubmit = async () => {
    setIsEmailChanging(true);
    if (!currentAuthUserId || !newEmail) {
      showError("Invalid request. Please log in and provide a new email.");
      setIsEmailChanging(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) {
        showError("Failed to update email: " + error.message);
        console.error("Error updating email:", error);
      } else {
        showSuccess("Email change request sent! Please check your NEW email to confirm the change.");
        setIsEmailChangeDialogOpen(false);
        setNewEmail(""); // Clear the input
        // User will be signed out by Supabase until new email is confirmed
        await supabase.auth.signOut();
        navigate("/login");
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    } finally {
      setIsEmailChanging(false);
    }
  };

  const handleDeleteAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in to delete your account.");
      return;
    }

    try {
      const response = await fetch('https://uiojlzfcxxtmrubnrkbv.supabase.co/functions/v1/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token)}`,
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        showError("Account deletion failed: " + (result.error || "Unknown error"));
        console.error("Account deletion error:", result);
      } else {
        showSuccess("Your account has been successfully deleted.");
        await supabase.auth.signOut(); // Sign out locally after successful deletion
        navigate("/login");
      }
    } catch (error: any) {
      showError("An unexpected error occurred during account deletion: " + error.message);
      console.error("Unexpected error during deletion:", error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentAuthUserId || !userProfile?.id) {
      showError("Cannot send request. User not logged in or target profile missing.");
      return;
    }
    if (currentAuthUserId === userProfile.id) {
      showError("You cannot send a friend request to yourself.");
      return;
    }

    try {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          sender_id: currentAuthUserId,
          receiver_id: userProfile.id,
          status: "pending",
        });

      if (error) {
        if (error.code === '23505') { // Unique violation code
          showError("Friend request already sent or pending.");
        } else {
          showError("Failed to send friend request: " + error.message);
          console.error("Error sending friend request:", error);
        }
      } else {
        showSuccess("Friend request sent!");
        setHasPendingRequestSent(true);
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) {
        showError("Failed to accept friend request: " + error.message);
        console.error("Error accepting request:", error);
      } else {
        showSuccess("Friend request accepted!");
        fetchProfile(); // Re-fetch profile to update friend status and remove from incoming requests
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleDeclineFriendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .delete()
        .eq("id", requestId);

      if (error) {
        showError("Failed to decline friend request: " + error.message);
        console.error("Error declining request:", error);
      } else {
        showSuccess("Friend request declined.");
        fetchProfile(); // Re-fetch profile to remove from incoming requests
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleFollow = async () => {
    if (!currentAuthUserId || !userProfile?.id) {
      showError("Cannot follow. User not logged in or target profile missing.");
      return;
    }
    if (currentAuthUserId === userProfile.id) {
      showError("You cannot follow yourself.");
      return;
    }

    try {
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: currentAuthUserId,
          following_id: userProfile.id,
        });

      if (error) {
        if (error.code === '23505') { // Unique violation code
          showError("You are already following this user.");
        } else {
          showError("Failed to follow user: " + error.message);
          console.error("Error following:", error);
        }
      } else {
        showSuccess("You are now following " + userProfile.full_name + "!");
        setIsFollowing(true);
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleUnfollow = async () => {
    if (!currentAuthUserId || !userProfile?.id) {
      showError("Cannot unfollow. User not logged in or target profile missing.");
      return;
    }

    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentAuthUserId)
        .eq("following_id", userProfile.id);

      if (error) {
        showError("Failed to unfollow user: " + error.message);
        console.error("Error unfollowing:", error);
      } else {
        showSuccess("You have unfollowed " + userProfile.full_name + ".");
        setIsFollowing(false);
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
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

  const isOwnProfile = currentAuthUserId === userProfile.id;

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
          {isOwnProfile ? (
            <>
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
                      <p>Current Streak: {userProfile.current_streak} days 🔥</p>
                      <p>Achievements: None yet</p>
                    </div>
                  )}
                  <Button onClick={() => setEditMode(true)} className="w-full">
                    Edit Profile
                  </Button>
                  <AccountActions
                    onLogout={handleLogout}
                    onChangePassword={handleChangePassword}
                    onChangeEmail={() => setIsEmailChangeDialogOpen(true)} // Open dialog for email change
                    onDeleteAccount={handleDeleteAccount}
                  />
                </>
              )}
              {incomingFriendRequests.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Incoming Friend Requests ({incomingFriendRequests.length})</h3>
                  <ul className="space-y-2">
                    {incomingFriendRequests.map(request => (
                      <li key={request.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                        <div className="flex items-center space-x-2">
                          <img
                            src={request.profiles?.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${request.profiles?.full_name || 'User'}`}
                            alt={request.profiles?.full_name || "User"}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <Link to={`/profile/${request.sender_id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:underline">
                            {request.profiles?.full_name || "Unknown User"}
                          </Link>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleAcceptFriendRequest(request.id)}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeclineFriendRequest(request.id)}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            // Display for other users' profiles
            <div className="space-y-3">
              {isFriend ? (
                <Button className="w-full" variant="outline" disabled>
                  <UserCheck className="h-4 w-4 mr-2" /> Friends
                </Button>
              ) : hasPendingRequestSent ? (
                <Button className="w-full" variant="outline" disabled>
                  <UserPlus className="h-4 w-4 mr-2" /> Request Sent
                </Button>
              ) : (
                <Button className="w-full" onClick={handleSendFriendRequest}>
                  <UserPlus className="h-4 w-4 mr-2" /> Add Friend
                </Button>
              )}

              {isFollowing ? (
                <Button className="w-full" variant="secondary" onClick={handleUnfollow}>
                  <UserMinus className="h-4 w-4 mr-2" /> Unfollow
                </Button>
              ) : (
                <Button className="w-full" variant="secondary" onClick={handleFollow}>
                  <Users className="h-4 w-4 mr-2" /> Follow
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Change Dialog */}
      <Dialog open={isEmailChangeDialogOpen} onOpenChange={setIsEmailChangeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              Enter your new email address. A confirmation email will be sent to the new address.
              You will be logged out and need to confirm the change via the link in the email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newEmail" className="text-right">
                New Email
              </Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="col-span-3"
                disabled={isEmailChanging}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isEmailChanging}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" onClick={handleEmailChangeSubmit} disabled={isEmailChanging || !newEmail}>
              {isEmailChanging ? "Sending..." : "Change Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;