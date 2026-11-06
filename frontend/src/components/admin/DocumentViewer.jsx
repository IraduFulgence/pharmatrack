import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, FileText, Download } from 'lucide-react';
import { adminService } from '../../services/AdminServices';
const DocumentViewer = ({ pharmacyId, docType, title, onClose }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mimeType, setMimeType] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setIsLoading(true);
        // Call the service to get the file as a Blob
        const blob = await adminService.getPharmacyDocument(pharmacyId, docType);
        
        // Save the mime type (e.g., 'application/pdf' or 'image/jpeg')
        setMimeType(blob.type);
        
        // Create a temporary URL for the browser to read the blob
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        setError(err.message || "Failed to load document.");
      } finally {
        setIsLoading(false);
      }
    };

    if (pharmacyId && docType) {
      fetchDocument();
    }

    // Revoke the object URL to free memory when the component unmounts
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [pharmacyId, docType]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-blue-500" /> {title}
          </h3>
          <div className="flex items-center gap-2">
            {blobUrl && (
              <a 
                href={blobUrl} 
                download={`${title.replace(/\s+/g, '_')}.pdf`}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Download File"
              >
                <Download size={20} />
              </a>
            )}
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow bg-gray-200 dark:bg-gray-900 relative flex items-center justify-center p-4">
          
          {isLoading && (
            <div className="flex flex-col items-center text-gray-500">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Loading document...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center text-red-500 max-w-md text-center">
              <AlertCircle size={32} className="mb-2" />
              <p className="font-semibold">Error Loading Document</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!isLoading && !error && blobUrl && (
            <>
              {/* If it's an image, show an image tag */}
              {mimeType?.startsWith('image/') ? (
                <img 
                  src={blobUrl} 
                  alt={title} 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md bg-white" 
                />
              ) : mimeType === 'application/pdf' ? (
                /* If it's a PDF, use an iframe. The #toolbar=0 hides the default PDF viewer toolbar */
                <iframe 
                  src={`${blobUrl}#toolbar=0`} 
                  title={title}
                  className="w-full h-full rounded-lg shadow-md bg-white"
                />
              ) : (
                /* Fallback for unknown file types (e.g. Word docs) */
                <div className="text-gray-500 text-center">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Preview not available for this file type.</p>
                  <a 
                    href={blobUrl} 
                    download 
                    className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Download File
                  </a>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default DocumentViewer;