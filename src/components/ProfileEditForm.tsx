import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFileUpload } from "@/hooks/useFileUpload"; // Import the new hook
import { useState } from "react";
import { showError } from "@/utils/toast";

const profileFormSchema = z.object({
  full_name: z.string().min(2, { message: "Full name must be at least 2 characters." }).max(50, { message: "Full name cannot exceed 50 characters." }),
  education_level: z.string().optional(),
  // profile_picture_url is now handled by file input, not directly in schema
});

interface ProfileEditFormProps {
  initialProfile: {
    full_name: string;
    education_level?: string | null;
    profile_picture_url?: string | null;
  };
  onSave: (values: { full_name: string; education_level?: string | null; profile_picture_url?: string | null; }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const ProfileEditForm = ({ initialProfile, onSave, onCancel, isSaving }: ProfileEditFormProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadFile, loading: uploadingFile, error: uploadError } = useFileUpload("public_files");

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: initialProfile.full_name,
      education_level: initialProfile.education_level || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    let newProfilePictureUrl = initialProfile.profile_picture_url;

    if (selectedFile) {
      const uploadedUrl = await uploadFile(selectedFile, "profile_pictures");
      if (uploadedUrl) {
        newProfilePictureUrl = uploadedUrl;
      } else {
        // If upload failed, stop submission
        showError(uploadError || "Failed to upload profile picture.");
        return;
      }
    }

    onSave({
      ...values,
      profile_picture_url: newProfilePictureUrl,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="education_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Education Level (Student Only)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your education level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="year_11_prelim">Year 11 Prelim</SelectItem>
                  <SelectItem value="year_12_hsc">Year 12 HSC</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                  <SelectItem value="post_graduate">Post Graduate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Profile Picture</FormLabel>
          <FormControl>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              disabled={uploadingFile || isSaving}
            />
          </FormControl>
          <FormMessage />
          {uploadingFile && <p className="text-sm text-gray-500">Uploading image...</p>}
          {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
        </FormItem>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving || uploadingFile}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || uploadingFile}>
            {isSaving || uploadingFile ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProfileEditForm;