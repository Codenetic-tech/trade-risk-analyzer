import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { 
  FileSpreadsheet,
  Upload as UploadIcon,
  X,
} from 'lucide-react';

interface McxUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (files: {
    risk: File | null;
    globe: File | null;
    mrg: File | null;
  }) => void;
}

const McxUploadModal: React.FC<McxUploadProps> = ({
  open,
  onOpenChange,
  onFilesSelected,
}) => {
  const [riskFile, setRiskFile] = useState<File | null>(null);
  const [globeFile, setGlobeFile] = useState<File | null>(null);
  const [mrgFile, setMrgFile] = useState<File | null>(null);

  const handleFileSelect = (type: 'risk' | 'globe' | 'mrg', file: File) => {
    if (type === 'risk') {
      setRiskFile(file);
    } else if (type === 'globe') {
      setGlobeFile(file);
    } else {
      setMrgFile(file);
    }
  };

  const handleConfirm = () => {
    onFilesSelected({ risk: riskFile, globe: globeFile, mrg: mrgFile });
    onOpenChange(false);
    setRiskFile(null);
    setGlobeFile(null);
    setMrgFile(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setRiskFile(null);
    setGlobeFile(null);
    setMrgFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UploadIcon className="h-5 w-5 text-blue-600" />
            <span>Upload Files for MCX Analysis</span>
          </DialogTitle>
          <DialogDescription>
            Upload Risk Excel file, MCX Globe file, and MCX MRG file to process MCX data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
          {/* Risk File Card */}
          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span>Risk File</span>
              </CardTitle>
              <CardDescription>Upload the Risk Excel file (.xlsx)</CardDescription>
            </CardHeader>
            <CardContent>
              {riskFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{riskFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRiskFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="risk-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="risk-upload-modal"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('risk', file);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Globe File Card */}
          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span>MCX Globe File</span>
              </CardTitle>
              <CardDescription>Upload the MCX Globe CSV file (.csv)</CardDescription>
            </CardHeader>
            <CardContent>
              {globeFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{globeFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGlobeFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="globe-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="globe-upload-modal"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('globe', file);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* MRG File Card */}
          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                <span>MCX MRG File</span>
              </CardTitle>
              <CardDescription>Upload the MCX MRG file (.csv)</CardDescription>
            </CardHeader>
            <CardContent>
              {mrgFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{mrgFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMrgFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="mrg-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="mrg-upload-modal"
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('mrg', file);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!riskFile || !globeFile || !mrgFile}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Process Files
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default McxUploadModal;