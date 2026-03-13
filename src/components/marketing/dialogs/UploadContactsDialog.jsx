import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Zap } from "lucide-react";

export default function UploadContactsDialog({
  open,
  onOpenChange,
  onFileUpload,
  uploading
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Contacts to Master Database</DialogTitle>
          <DialogDescription>
            Upload CSV/Excel with auto-funnel contacts for newsletters, emails,
            and campaigns
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-slate-900 mb-2">
              Required Columns:
            </h4>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>
                • <strong>email</strong> (required)
              </li>
              <li>• phone, full_name, company (optional)</li>
              <li>• tags (comma-separated, e.g., "vip,newsletter")</li>
              <li>• funnel_stage (lead/prospect/customer/churned)</li>
            </ul>
          </div>
          <label className="block cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-slate-50 transition-all">
              {uploading ? (
                <>
                  <Zap className="w-8 h-8 mx-auto mb-2 text-indigo-500 animate-pulse" />
                  <p className="text-sm text-indigo-600">
                    Processing bulk upload...
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Extracting and validating contacts
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    Upload CSV or Excel
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Master contacts for marketing automation
                  </p>
                </>
              )}
            </div>
          </label>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}