
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
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface BrokerageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesSelected: (dataFile: File | null, basketFile: File | null) => void;
}

export const BrokerageUploadModal: React.FC<BrokerageUploadModalProps> = ({
  open,
  onOpenChange,
  onFilesSelected,
}) => {
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [basketFile, setBasketFile] = useState<File | null>(null);

  const handleFileSelect = (type: 'data' | 'basket', file: File) => {
    if (type === 'data') {
      setDataFile(file);
    } else {
      setBasketFile(file);
    }
  };

  const handleConfirm = () => {
    onFilesSelected(dataFile, basketFile);
    onOpenChange(false);
    // Reset files
    setDataFile(null);
    setBasketFile(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset files
    setDataFile(null);
    setBasketFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>Upload Brokerage Files</span>
          </DialogTitle>
          <DialogDescription>
            Upload the Excel data file (.xlsx) and optionally the order basket file to process brokerage data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span>Data File (Required)</span>
              </CardTitle>
              <CardDescription>Upload the main Excel file (.xlsx) with "Data" sheet</CardDescription>
            </CardHeader>
            <CardContent>
              {dataFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{dataFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDataFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="data-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="data-upload-modal"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('data', file);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                <span>Order Basket File (Optional)</span>
              </CardTitle>
              <CardDescription>Upload the order basket Excel file (.xlsx)</CardDescription>
            </CardHeader>
            <CardContent>
              {basketFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{basketFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBasketFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="basket-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="basket-upload-modal"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('basket', file);
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
            disabled={!dataFile}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Process Files
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
