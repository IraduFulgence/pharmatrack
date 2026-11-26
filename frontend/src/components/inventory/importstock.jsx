import React, { useState } from 'react';
import { 
  UploadCloud, FileSpreadsheet, Loader2, 
  CheckCircle2, AlertCircle, Download, X 
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

const BulkStockImport = ({ pharmacyId, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState(null);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [isValid, setIsValid] = useState(false);
  const [summary, setSummary] = useState(null); // { totalRows, validRows, invalidRows }
  const [result, setResult] = useState(null);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setPreviewErrors([]);
    setIsValid(false);
    setSummary(null);
    setResult(null);
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('The file must be 5 MB or smaller.');
      return;
    }
    
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
      const data = response.data || {};
      // The server checks every row and returns them in `preview`, each with its own errors.
      const invalid = (data.preview || []).filter((r) => !r.isValid);
      setSummary({ totalRows: data.totalRows || 0, validRows: data.validRows || 0, invalidRows: data.invalidRows || 0 });
      setPreviewErrors(invalid.map((r) => ({
        row: r.rowNumber,
        message: `Row ${r.rowNumber}${r.medicineName ? ` (${r.medicineName})` : ''}: ${r.errors.join(' ')}`,
      })));
      if ((data.totalRows || 0) === 0) setError('The file has no rows, or could not be read. Use the template.');
      // Valid rows can be imported; invalid ones are skipped and listed.
      setIsValid((data.validRows || 0) > 0);
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

      const res = await inventoryService.importStock(pharmacyId, formData);
      setResult(res.message || 'Import complete.');
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to import records.");
    } finally {
      setIsImporting(false);
    }
  };

  // Use the server's template so the columns always match what the import reads.
  const downloadTemplate = async () => {
    try {
      await inventoryService.downloadImportTemplate('xlsx');
    } catch (err) {
      setError(err.message || 'Could not download the template.');
    }
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
            <button onClick={() => { setFile(null); setIsValid(false); setPreviewErrors([]); setError(null); setSummary(null); setResult(null); }} className="text-gray-400 hover:text-red-500">
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
                <AlertCircle size={16} /> {previewErrors.length} row{previewErrors.length === 1 ? '' : 's'} will be skipped:
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
                <p className="text-sm font-bold">{result || `${summary?.validRows} of ${summary?.totalRows} rows ready to import`}</p>
                {!result && <p className="text-xs">{summary?.invalidRows ? 'Rows with errors will be skipped.' : 'Every row is valid.'}</p>}
              </div>
            </div>
          )}

          <button 
            onClick={handleImport}
            disabled={isImporting || !isValid || isPreviewing || !!result}
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