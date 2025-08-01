import { useState, useCallback } from 'react';
import { FileAttachment } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

interface UseFileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  maxFiles?: number;
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['*/*'], // Accept all file types
    maxFiles = 10
  } = options;

  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback((file: File): boolean => {
    // Check file size
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
        variant: "destructive"
      });
      return false;
    }

    // Accept all file types when allowedTypes includes '*/*'
    const acceptsAllTypes = allowedTypes.includes('*/*');
    
    if (!acceptsAllTypes) {
      const isAllowed = allowedTypes.some(type => {
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return file.type.startsWith(baseType);
        }
        return file.type === type || file.name.toLowerCase().endsWith(type);
      });

      if (!isAllowed) {
        toast({
          title: "Invalid file type",
          description: `Allowed types: ${allowedTypes.join(', ')}`,
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  }, [maxSize, allowedTypes]);

  const createFilePreview = useCallback((file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  }, []);

  const processFile = useCallback(async (file: File): Promise<FileAttachment | null> => {
    if (!validateFile(file)) return null;

    try {
      const preview = await createFilePreview(file);
      const url = URL.createObjectURL(file);

      const attachment: FileAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        url,
        preview
      };

      return attachment;
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Upload failed",
        description: "Failed to process the file",
        variant: "destructive"
      });
      return null;
    }
  }, [validateFile, createFilePreview]);

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList);
    
    if (files.length + fileArray.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive"
      });
      return [];
    }

    setIsUploading(true);

    try {
      const processedFiles: FileAttachment[] = [];
      
      for (const file of fileArray) {
        const processed = await processFile(file);
        if (processed) {
          processedFiles.push(processed);
        }
      }

      setFiles(prev => [...prev, ...processedFiles]);
      
      if (processedFiles.length > 0) {
        toast({
          title: "Upload successful",
          description: `${processedFiles.length} file(s) uploaded successfully`
        });
      }

      return processedFiles;
    } finally {
      setIsUploading(false);
    }
  }, [files.length, maxFiles, processFile]);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      const removed = prev.find(f => f.id === fileId);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return updated;
    });
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach(file => URL.revokeObjectURL(file.url));
    setFiles([]);
  }, [files]);

  return {
    files,
    isUploading,
    uploadFiles,
    removeFile,
    clearFiles,
    hasFiles: files.length > 0
  };
};