import { Button } from "@/components/ui/button";
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

interface AccountActionsProps {
  onLogout: () => void;
  onChangePassword: () => void;
  onChangeEmail: () => void;
  onDeleteAccount: () => void;
}

const AccountActions = ({ onLogout, onChangePassword, onChangeEmail, onDeleteAccount }: AccountActionsProps) => {
  return (
    <div className="space-y-3">
      <Button onClick={onChangePassword} className="w-full" variant="secondary">
        Change Password
      </Button>
      <Button onClick={onChangeEmail} className="w-full" variant="secondary">
        Change Email
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
            Delete Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteAccount} className="bg-red-600 hover:bg-red-700">
              Yes, delete my account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button onClick={onLogout} className="w-full" variant="outline">
        Log Out
      </Button>
    </div>
  );
};

export default AccountActions;