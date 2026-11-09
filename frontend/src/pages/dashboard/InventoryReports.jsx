import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Download, FileText, Loader2, 
  Filter, AlertCircle, RefreshCw, BarChart2
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

const InventoryReports = () => {
  // Form State
  const [filters, setFilters] = useState({
    reportType: 'CURRENT_STOCK',
    startDate: '',
    endDate: '',
    exportFormat: 'json',
  });

  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      const response = await inventoryService.generateReport(filters);

      if (filters.exportFormat === 'csv') {
        // Handle CSV Download
        const url = window.URL.createObjectURL(new Blob([response]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filters.reportType.toLowerCase()}_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // Handle JSON Display
        setReportData(response.data);
      }
    } catch (err) {
      setError(err.message || "Failed to generate report.");
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamically generate table headers based on the report type
  const getTableHeaders = () => {
    if (!reportData?.items || reportData.items.length === 0) return [];
    // Just grab keys from the first item
    return Object.keys(reportData.items[0]);
  };

  const formatColumnHeader = (key) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div>
        <Link to="/pharmacy/dashboard/inventory" className="text-sm text-[#007a55] hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Back to Overview
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Reports</h1>
        <p className="text-gray-500 dark:text-gray-400">Generate detailed reports for auditing, valuation, and compliance.</p>
      </div>

      {/* Configuration Form */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Report Type */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Type</label>
              <select 
                name="reportType" 
                value={filters.reportType} 
                onChange={handleInputChange}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007a55]"
              >
                <option value="CURRENT_STOCK">Current Stock</option>
                <option value="STOCK_IN">Stock In (Received)</option>
                <option value="STOCK_OUT">Stock Out</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="EXPIRED">Expired Items</option>
                <option value="NEAR_EXPIRY">Near Expiry</option>
                <option value="ADJUSTMENT">Adjustments</option>
                <option value="VALUATION">Inventory Valuation</option>
              </select>
            </div>

            {/* Date Range  */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date (Optional)</label>
              <input 
                type="date" name="startDate" value={filters.startDate} onChange={handleInputChange}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007a55]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date (Optional)</label>
              <input 
                type="date" name="endDate" value={filters.endDate} onChange={handleInputChange}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007a55]"
              />
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
              <select 
                name="exportFormat" 
                value={filters.exportFormat} 
                onChange={handleInputChange}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007a55]"
              >
                <option value="json">View on Screen (JSON)</option>
                <option value="csv">Download as CSV</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#007a55] text-white rounded-lg font-semibold hover:bg-[#006645] transition-colors disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : (filters.exportFormat === 'csv' ? <Download size={18}/> : <BarChart2 size={18}/>)}
              {isLoading ? 'Generating...' : (filters.exportFormat === 'csv' ? 'Download CSV' : 'Generate Report')}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Display Results */}
      {reportData && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Summary Card */}
          <div className="bg-[#e6f4ef] dark:bg-[#007a55]/10 border border-[#007a55]/20 rounded-xl p-6">
            <h3 className="text-lg font-bold text-[#007a55] dark:text-[#34d399] mb-4 flex items-center gap-2">
              <Filter size={18} /> Report Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reportData.summary || {}).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-gray-500 uppercase">{formatColumnHeader(key)}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    {getTableHeaders().map(header => (
                      <th key={header} className="px-4 py-3 whitespace-nowrap">{formatColumnHeader(header)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {reportData.items.length === 0 ? (
                    <tr>
                      <td colSpan="100%" className="px-6 py-8 text-center text-gray-500">
                        No data found for this report.
                      </td>
                    </tr>
                  ) : (
                    reportData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        {Object.values(item).map((val, i) => (
                          <td key={i} className="px-4 py-3 whitespace-nowrap">
                            {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : 
                             typeof val === 'number' ? val.toLocaleString() : 
                             String(val || '-')}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryReports;