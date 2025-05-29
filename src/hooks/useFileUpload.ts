import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

interface FileUploadResult {
  fileUrl: string | null;
  loading: boolean;
  error: string | null;
  progress: number;
  uploadFile: (file: File, folder?: string) => Promise<string | null>;
}

export const useFileUpload = (bucketName: string = "public_files"): FileUploadResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const uploadFile = async (file: File, folder: string = ""): Promise<string | null> => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setFileUrl(null);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("User not authenticated for file upload.");
      showError("You must be logged in to upload files.");
      setLoading(false);
      return null;
    }

    const fileExtension = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const filePath = folder ? `${user.id}/${folder}/${fileName}` : `${user.id}/${fileName}`;

    try {
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          // You can add onUploadProgress here if needed for a progress bar
        });

      if (uploadError) {
        setError("Failed to upload file: " + uploadError.message);
        showError("File upload failed: " + uploadError.message);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        setError("Failed to get public URL for the uploaded file.");
        showError("Failed to get file URL.");
        return null;
      }

      setFileUrl(publicUrlData.publicUrl);
      showError("File uploaded successfully!"); // Using showError for success as well, consider a dedicated showInfo or showSuccess
      return publicUrlData.publicUrl;
    } catch (err: any) {
      setError("An unexpected error occurred during upload: " + err.message);
      showError("An unexpected error occurred during upload: " + err.message);
      return null;
    } finally {
      setLoading(false);
      setProgress(100); // Set to 100% on completion (success or failure)
    }
  };

  return { fileUrl, loading, error, progress, uploadFile };
};