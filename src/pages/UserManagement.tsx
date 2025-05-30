import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserX, UserCheck, Trash2, ShieldAlert, ShieldCheck } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  profile_picture_url: string | null;
  is_blocked: boolean;
  created_at: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      setCurrentAuthUserId(user?.id || null);

      if (userError || !user) {
        showError("You must be logged in to access this page.");
        navigate("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        showError("Failed to fetch user role.");
        console.error("Error fetching profile:", profileError);
        navigate("/");
        return;
      }

      if (profile.role !== "admin") {
        showError("Access Denied: Only administrators can manage users.");
        navigate("/");
        return;
      }
      setUserRole(profile.role);
      setLoadingRole(false);
    };

    checkUserRole();
  }, [navigate]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, profile_picture_url, is_blocked, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to fetch users: " + error.message);
      console.error("Error fetching users:", error);
    } else {
      setUsers(data as UserProfile[]);
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    if (userRole === "admin") {
      fetchUsers();
    }
  }, [userRole, fetchUsers]);

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (userId === currentAuthUserId) {
      showError("You cannot change your own role.");
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) {
        showError("Failed to change role: " + error.message);
        console.error("Error changing role:", error);
      } else {
        showSuccess("User role updated successfully!");
        fetchUsers(); // Refresh the list
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleToggleBlock = async (userId: string, currentBlockedStatus: boolean) => {
    if (userId === currentAuthUserId) {
      showError("You cannot block/unblock your own account.");
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_blocked: !currentBlockedStatus })
        .eq("id", userId);

      if (error) {
        showError(`Failed to ${currentBlockedStatus ? 'unblock' : 'block'} user: ` + error.message);
        console.error(`Error ${currentBlockedStatus ? 'unblocking' : 'blocking'} user:`, error);
      } else {
        showSuccess(`User ${currentBlockedStatus ? 'unblocked' : 'blocked'} successfully!`);
        fetchUsers(); // Refresh the list
      }
    } catch (error: any) {
      showError("An unexpected error occurred: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  const handleDeleteUser = async (userIdToDelete: string) => {
    if (userIdToDelete === currentAuthUserId) {
      showError("You cannot delete your own account from here.");
      return;
    }

    try {
      // Call the delete-user edge function
      const response = await fetch('https://uiojlzfcxxtmrubnrkbv.supabase.co/functions/v1/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(res => res.data.session?.access_token)}`,
        },
        body: JSON.stringify({ user_id: userIdToDelete }),
      });

      const result = await response.json();

      if (!response.ok) {
        showError("Failed to delete user: " + (result.error || "Unknown error"));
        console.error("Account deletion error:", result);
      } else {
        showSuccess("User deleted successfully!");
        fetchUsers(); // Refresh the list
      }
    } catch (error: any) {
      showError("An unexpected error occurred during user deletion: " + error.message);
      console.error("Unexpected error:", error);
    }
  };

  if (loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-600 dark:text-gray-400">Checking user role...</p>
      </div>
    );
  }

  if (userRole !== "admin") {
    return null; // Should have been redirected by now
  }

  const groupedUsers: { [key: string]: UserProfile[] } = {
    admin: [],
    teacher: [],
    student: [],
    personal: [],
    other: [], // For any unexpected roles
  };

  users.forEach(user => {
    if (groupedUsers[user.role]) {
      groupedUsers[user.role].push(user);
    } else {
      groupedUsers.other.push(user);
    }
  });

  const roleOrder = ["admin", "teacher", "student", "personal", "other"];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Admin: User Management</h1>

        {loadingUsers ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading users...</p>
        ) : (
          <div className="space-y-8">
            {roleOrder.map(role => {
              const usersInRole = groupedUsers[role];
              if (usersInRole.length === 0) return null;

              return (
                <div key={role}>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 capitalize">
                    {role === "admin" ? "Administrators" : role === "teacher" ? "Teachers" : role === "student" ? "Students" : role === "personal" ? "Personal Users" : "Other Users"} ({usersInRole.length})
                  </h2>
                  <div className="space-y-4">
                    {usersInRole.map((user) => (
                      <Card key={user.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <div className="flex items-center space-x-3">
                            <img
                              src={user.profile_picture_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`}
                              alt={user.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{user.full_name}</CardTitle>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                            {user.is_blocked ? (
                              <Badge className="bg-red-500 text-white flex items-center">
                                <ShieldAlert className="h-4 w-4 mr-1" /> Blocked
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500 text-white flex items-center">
                                <ShieldCheck className="h-4 w-4 mr-1" /> Active
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <Select onValueChange={(value) => handleChangeRole(user.id, value)} value={user.role} disabled={user.id === currentAuthUserId}>
                              <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Change Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="personal">Personal User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant={user.is_blocked ? "outline" : "destructive"}
                              onClick={() => handleToggleBlock(user.id, user.is_blocked)}
                              className="w-full sm:w-auto"
                              disabled={user.id === currentAuthUserId}
                            >
                              {user.is_blocked ? (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" /> Unblock
                                </>
                              ) : (
                                <>
                                  <UserX className="h-4 w-4 mr-2" /> Block
                                </>
                              )}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full sm:w-auto" disabled={user.id === currentAuthUserId}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user account
                                    and all associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600 hover:bg-red-700">
                                    Yes, delete user
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
            {users.length === 0 && (
              <p className="text-center text-gray-600 dark:text-gray-400">No users found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;