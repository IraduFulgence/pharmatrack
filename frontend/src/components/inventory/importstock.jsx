import React, { useState } from 'react';
import { 
  UploadCloud, FileSpreadsheet, Loader2, 
  CheckCircle2, AlertCircle, Download, X 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { inventoryService } from '../../services/inventoryService';

const BulkStockImport = ({ pharmacyId, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [isValid, setIsValid] = useState(false);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setPreviewErrors([]);
    setIsValid(false);
    
    // Automatically trigger preview when file is selected
    handlePreview(selectedFile);
  };

  const handlePreview = async (fileToPreview) => {
    try {
      setIsPreviewing(true);
      setError(null);
      setPreviewErrors([]);

      
      const formData = new FormData();
      formData.append('file', fileToPreview);

      const response = await inventoryService.previewImport(pharmacyId, formData);
      
      // Check if backend returned validation errors
      if (response.data?.errors && response.data.errors.length > 0) {
        setPreviewErrors(response.data.errors);
        setIsValid(false);
      } else {
        setIsValid(true);
      }
    } catch (err) {
      setError(err.message || "Failed to validate the file.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !isValid) return;
    try {
      setIsImporting(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      await inventoryService.importStock(pharmacyId, formData);
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to import records.");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Medicine Name': 'Paracetamol 500mg',
        'Batch Number': 'BATCH-2026-001',
        'Quantity': 100,
        'Unit Price': 15.5,
        'Expiry Date': '2027-12-31',
        'Reorder Level': 10,
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');
    XLSX.writeFile(wb, 'Pharmatrack_Inventory_Template.xlsx');
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="text-[#007a55]" size={22} /> Bulk Import
          </h3>
          <p className="text-sm text-gray-500 mt-1">Upload an Excel or CSV file to add multiple stock items at once.</p>
        </div>
        <button 
          onClick={downloadTemplate}
          className="text-sm font-semibold text-[#007a55] hover:underline flex items-center gap-1"
        >
          <Download size={16} /> Download Template
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Upload Zone */}
      {!file && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative">
          <input 
            type="file" 
            onChange={handleFileUpload}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          />
          <UploadCloud size={32} className="mx-auto text-gray-400 mb-3" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500 mt-1">CSV, XLS, or XLSX (max. 5MB)</p>
        </div>
      )}

      {/* File Preview & Validation */}
      {file && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button onClick={() => { setFile(null); setIsValid(false); setPreviewErrors([]); setError(null); }} className="text-gray-400 hover:text-red-500">
              <X size={20} />
            </button>
          </div>

          {isPreviewing && (
            <div className="flex items-center justify-center py-4 text-[#007a55]">
              <Loader2 className="animate-spin mr-2" size={20} /> Validating file with server...
            </div>
          )}

          {previewErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> Found {previewErrors.length} errors:
              </h4>
              <ul className="text-xs text-red-600 space-y-1 list-disc list-inside max-h-32 overflow-y-auto">
                {previewErrors.map((err, idx) => (
                  <li key={idx}>{err.message || err.reason || `Row ${err.row}: Invalid data`}</li>
                ))}
              </ul>
            </div>
          )}

          {isValid && !isPreviewing && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
              <CheckCircle2 size={24} />
              <div>
                <p className="text-sm font-bold">File is valid!</p>
                <p className="text-xs">Ready to import.</p>
              </div>
            </div>
          )}

          <button 
            onClick={handleImport}
            disabled={isImporting || !isValid || isPreviewing}
            className="w-full flex justify-center items-center py-3 bg-[#007a55] text-white rounded-lg font-bold hover:bg-[#006645] transition-colors disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
            {isImporting ? 'Importing...' : 'Confirm & Import'}
          </button>
        </div>
      )}

    </div>
  );
};

export default BulkStockImport;