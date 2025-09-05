import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, X, RefreshCw } from 'lucide-react';

interface FileUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (nseFile: File | null, mcxFile: File | null) => void;
  isUploading?: boolean; // Add isUploading prop
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  open,
  onOpenChange,
  onFilesSelected,
  isUploading = false, // Default to false
}) => {
  const [nseFile, setNseFile] = useState<File | null>(null);
  const [mcxFile, setMcxFile] = useState<File | null>(null);

  const handleFileSelect = (type: 'nse' | 'mcx', file: File) => {
    if (type === 'nse') {
      setNseFile(file);
    } else {
      setMcxFile(file);
    }
  };

  const handleConfirm = () => {
    onFilesSelected(nseFile, mcxFile);
    onOpenChange(false);
    // Reset files
    setNseFile(null);
    setMcxFile(null);
  };

  const handleCancel = () => {
    // Only allow cancel if not currently uploading
    if (!isUploading) {
      onOpenChange(false);
      // Reset files
      setNseFile(null);
      setMcxFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isUploading ? (
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
            ) : (
              <Upload className="h-5 w-5 text-blue-600" />
            )}
            <span>
              {isUploading ? 'Uploading Files...' : 'Upload Globe Files'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isUploading 
              ? 'Please wait while we process your files...' 
              : 'Upload NSE and MCX Globe CSV files to update the Google Sheet.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          <Card className={`border-2 border-dashed ${isUploading ? 'opacity-60' : 'border-slate-300 hover:border-blue-400'} transition-colors`}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span>NSE Globe File</span>
              </CardTitle>
              <CardDescription>Upload the NSE Globe CSV file</CardDescription>
            </CardHeader>
            <CardContent>
              {nseFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{nseFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => !isUploading && setNseFile(null)}
                      className="text-green-600 hover:text-green-700"
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="nse-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="nse-upload-modal"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && !isUploading) handleFileSelect('nse', file);
                    }}
                    disabled={isUploading}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`border-2 border-dashed ${isUploading ? 'opacity-60' : 'border-slate-300 hover:border-blue-400'} transition-colors`}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                <span>MCX Globe File</span>
              </CardTitle>
              <CardDescription>Upload the MCX Globe CSV file</CardDescription>
            </CardHeader>
            <CardContent>
              {mcxFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{mcxFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => !isUploading && setMcxFile(null)}
                      className="text-green-600 hover:text-green-700"
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="mcx-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="mcx-upload-modal"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && !isUploading) handleFileSelect('mcx', file);
                    }}
                    disabled={isUploading}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!nseFile || !mcxFile || isUploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Files'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};