import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface FileUploadProps {
  onFilesUploaded: (files: { risk: File | null; nse: File | null; mcx: File | null }) => void;
  onCancel?: () => void;
}

interface UploadedFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesUploaded, onCancel }) => {
  const [files, setFiles] = useState<{
    risk: UploadedFile | null;
    nse: UploadedFile | null;
    mcx: UploadedFile | null;
  }>({
    risk: null,
    nse: null,
    mcx: null,
  });

  const handleFileSelect = useCallback((type: 'risk' | 'nse' | 'mcx', file: File) => {
    const expectedExt = type === 'risk' ? '.xlsx' : '.csv';
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (fileExt !== expectedExt) {
      toast({
        title: "Invalid File Type",
        description: `${type.toUpperCase()} files must be ${expectedExt} format`,
        variant: "destructive",
      });
      return;
    }

    // Simulate upload progress
    const newFile: UploadedFile = {
      file,
      progress: 0,
      status: 'uploading',
    };

    setFiles(prev => ({ ...prev, [type]: newFile }));

    // Simulate upload progress
    const interval = setInterval(() => {
      setFiles(prev => {
        if (!prev[type] || prev[type]!.progress >= 100) {
          clearInterval(interval);
          return prev;
        }

        const updated = { ...prev };
        updated[type]!.progress += 20;
        
        if (updated[type]!.progress >= 100) {
          updated[type]!.status = 'completed';
          toast({
            title: "File Uploaded",
            description: `${type.toUpperCase()} file uploaded successfully`,
          });
        }

        return updated;
      });
    }, 300);
  }, []);

  const removeFile = (type: 'risk' | 'nse' | 'mcx') => {
    setFiles(prev => ({ ...prev, [type]: null }));
  };

  const handleProcess = () => {
    const uploadedFiles = {
      risk: files.risk?.file || null,
      nse: files.nse?.file || null,
      mcx: files.mcx?.file || null,
    };

    if (!uploadedFiles.risk) {
      toast({
        title: "Missing File",
        description: "Risk Excel file is required",
        variant: "destructive",
      });
      return;
    }

    onFilesUploaded(uploadedFiles);
  };

  const handleCancel = () => {
    // Clear files when canceling
    setFiles({
      risk: null,
      nse: null,
      mcx: null,
    });
    
    if (onCancel) {
      onCancel();
    }
  };

  const FileDropZone: React.FC<{
    type: 'risk' | 'nse' | 'mcx';
    title: string;
    description: string;
    accept: string;
    iconColor: string;
  }> = ({ type, title, description, accept, iconColor }) => {
    const currentFile = files[type];

    return (
      <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <FileSpreadsheet className={`h-5 w-5 ${iconColor}`} />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentFile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800">{currentFile.file.name}</p>
                  <p className="text-xs text-green-600">
                    {currentFile.status === 'completed' 
                      ? 'File uploaded successfully' 
                      : `Uploading... ${currentFile.progress}%`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(type)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {currentFile.status === 'uploading' && (
                <Progress value={currentFile.progress} className="w-full" />
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <label htmlFor={`${type}-upload`} className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Click to upload
                </span>
              </label>
              <input
                id={`${type}-upload`}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(type, file);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FileDropZone
          type="risk"
          title="Risk Excel File"
          description="Upload the main risk file (.xlsx)"
          accept=".xlsx,.xls"
          iconColor="text-blue-600"
        />
        <FileDropZone
          type="nse"
          title="NSE Allocation"
          description="Upload NSE allocation file (.csv)"
          accept=".csv"
          iconColor="text-green-600"
        />
        <FileDropZone
          type="mcx"
          title="MCX Allocation"
          description="Upload MCX allocation file (.csv)"
          accept=".csv"
          iconColor="text-purple-600"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleProcess}
          disabled={!files.risk}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Process Files
        </Button>
      </div>

      {!files.risk && (
        <Alert>
          <AlertDescription>
            Risk Excel file is required to proceed. NSE and MCX allocation files are optional.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FileUpload;