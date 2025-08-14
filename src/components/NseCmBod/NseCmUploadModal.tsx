import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileSpreadsheet,
  Upload,
  X
} from 'lucide-react';

interface NseCmUploadModalProps {
  showUploadModal: boolean;
  setShowUploadModal: (show: boolean) => void;
  riskFile: File | null;
  nseFile: File | null;
  nriFile: File | null;
  setRiskFile: (file: File | null) => void;
  setNseFile: (file: File | null) => void;
  setNriFile: (file: File | null) => void;
  handleFileSelect: (type: 'risk' | 'nse' | 'nri', file: File) => void;
  handleConfirm: () => void;
  handleCancel: () => void;
}

const NseCmUploadModal: React.FC<NseCmUploadModalProps> = ({
  showUploadModal,
  setShowUploadModal,
  riskFile,
  nseFile,
  nriFile,
  setRiskFile,
  setNseFile,
  setNriFile,
  handleFileSelect,
  handleConfirm,
  handleCancel
}) => {
  return (
    <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>Upload Files for NSE CM Analysis</span>
          </DialogTitle>
          <DialogDescription>
            Upload Risk Excel file, NSE Globe file, and NRI Excel file to process NSE CM data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span>Ledger</span>
              </CardTitle>
              <CardDescription>Ledger DDMMYYYY (.xlsx)</CardDescription>
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
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
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

          <Card className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span>NSE Globe File</span>
              </CardTitle>
              <CardDescription>Upload the NSE Globe CSV file (.csv)</CardDescription>
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
                      onClick={() => setNseFile(null)}
                      className="text-green-600 hover:text-green-700"
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
                      if (file) handleFileSelect('nse', file);
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
                <span>NRI File</span>
              </CardTitle>
              <CardDescription>Upload the NRI Excel file (.xlsx)</CardDescription>
            </CardHeader>
            <CardContent>
              {nriFile ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">{nriFile.name}</p>
                      <p className="text-xs text-green-600">File uploaded successfully</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNriFile(null)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <label htmlFor="nri-upload-modal" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Click to upload
                    </span>
                  </label>
                  <input
                    id="nri-upload-modal"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect('nri', file);
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
            disabled={!riskFile || !nseFile || !nriFile}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Process Files
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NseCmUploadModal;