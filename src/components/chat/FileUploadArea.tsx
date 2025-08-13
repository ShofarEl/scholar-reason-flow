import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileAttachment } from '@/types/chat';
import { useFileUpload } from '@/hooks/useFileUpload';

interface FileUploadAreaProps {
  onFilesChange: (files: FileAttachment[]) => void;
  disabled?: boolean;
  className?: string;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFilesChange,
  disabled = false,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { files, isUploading, uploadFiles, removeFile, clearFiles } = useFileUpload({
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: ['*/*'], // Accept all file types
    maxFiles: 10
  });

  // Update parent when files change
  React.useEffect(() => {
    onFilesChange(files);
  }, [files, onFilesChange]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    await uploadFiles(droppedFiles);
  }, [disabled, uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      await uploadFiles(selectedFiles);
    }
    // Reset input value to allow re-selecting the same file
    e.target.value = '';
  }, [uploadFiles]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    if (fileType === 'application/pdf' || fileType.includes('document')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all duration-300",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragOver ? "border-primary bg-primary/10" : "border-muted",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          "p-6 text-center"
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          disabled={disabled || isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          accept="*/*"
        />
        
        <div className="flex flex-col items-center space-y-2">
          <Upload className={cn(
            "h-8 w-8 transition-colors",
            isDragOver ? "text-primary" : "text-muted-foreground"
          )} />
          <div className="text-sm">
            <span className="font-medium">
              {isUploading ? "Uploading..." : "Drop files here or click to browse"}
            </span>
            <p className="text-muted-foreground mt-1">
              Supports all file types (max 25MB each, up to 10 files)
            </p>
          </div>
        </div>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-primary">Processing files...</span>
            </div>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Attached Files ({files.length})</span>
            <button
              onClick={clearFiles}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear all
            </button>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-card rounded-md border"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="h-8 w-8 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};