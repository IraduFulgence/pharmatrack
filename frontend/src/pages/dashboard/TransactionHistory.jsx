import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Search, Filter, Loader2, FileText, 
  ArrowDownLeft, ArrowUpRight, AlertTriangle, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter State
  const [filters, setFilters] = useState({
    transactionType: '',
    startDate: '',
    endDate: '',
  });

  
  useEffect(() => {
    fetchTransactions();
  }, [page, filters]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await inventoryService.getTransactions({
        ...filters,
        page,
        limit: 15,
      });

      const data = response.data;
      setTransactions(data.transactions || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.total || 0);

    } catch (err) {
      console.error("Failed to load transactions:", err);
      setError(err.message || "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); 
  };

  const getTypeBadge = (type) => {
    if (type === 'STOCK_IN') return { color: 'bg-green-100 text-green-700', icon: <ArrowDownLeft size={14} />, label: 'Stock In' };
    if (type.includes('DAMAGED')) return { color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={14} />, label: 'Damaged' };
    if (type.includes('EXPIRED')) return { color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={14} />, label: 'Expired' };
    if (type.includes('LOST')) return { color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle size={14} />, label: 'Lost' };
    if (type.includes('INCREASE')) return { color: 'bg-blue-100 text-blue-700', icon: <ArrowUpRight size={14} />, label: 'Increase' };
    if (type.includes('DECREASE')) return { color: 'bg-gray-100 text-gray-700', icon: <ArrowDownLeft size={14} />, label: 'Decrease' };
    if (type === 'PHYSICAL_COUNT') return { color: 'bg-purple-100 text-purple-700', icon: <Settings size={14} />, label: 'Physical Count' };
    return { color: 'bg-gray-100 text-gray-700', icon: <FileText size={14} />, label: type };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div>
        <Link to="/pharmacy/dashboard/inventory" className="text-sm text-[#007a55] hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Back to Overview
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction History</h1>
        <p className="text-gray-500 dark:text-gray-400">Audit log of all inventory movements and adjustments.</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Type</label>
          <select 
            name="transactionType" 
            value={filters.transactionType} 
            onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
          >
            <option value="">All Types</option>
            <option value="STOCK_IN">Stock In</option>
            <option value="ADJUSTMENT_DAMAGED">Damaged</option>
            <option value="ADJUSTMENT_EXPIRED">Expired</option>
            <option value="ADJUSTMENT_LOST">Lost</option>
            <option value="ADJUSTMENT_INCREASE">Manual Increase</option>
            <option value="ADJUSTMENT_DECREASE">Manual Decrease</option>
            <option value="ADJUSTMENT_PHYSICAL_COUNT">Physical Count</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
          <input 
            type="date" 
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
          <input 
            type="date" 
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
          />
        </div>

        <div className="flex items-end">
          <button 
            onClick={() => { setFilters({ transactionType: '', startDate: '', endDate: '' }); setPage(1); }}
            className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Filter size={16} /> Clear Filters
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Medicine</th>
                <th className="px-6 py-4">Batch</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-center">Qty Change</th>
                <th className="px-6 py-4">Staff / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const badge = getTypeBadge(tx.transaction_type);
                  const isPositive = tx.new_quantity > tx.previous_quantity;
                  
                  return (
                    <tr key={tx.transaction_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {tx.medicine_name}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {tx.batch_number}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${badge.color}`}>
                          {badge.icon} {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                          isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {isPositive ? '+' : '-'}{Math.abs(tx.new_quantity - tx.previous_quantity)}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {tx.previous_quantity} → {tx.new_quantity}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">
                          {tx.performed_by_name || 'System'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1" title={tx.reason}>
                          {tx.reason}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && totalItems > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{(page - 1) * 15 + 1}</span> to <span className="font-medium">{Math.min(page * 15, totalItems)}</span> of <span className="font-medium">{totalItems}</span> transactions
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;