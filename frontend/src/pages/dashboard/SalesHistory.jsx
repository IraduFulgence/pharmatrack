import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, Loader2, Calendar, 
  ChevronLeft, ChevronRight, FileText, CreditCard
} from 'lucide-react';
import { salesService } from '../../services/salesService';

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    paymentCategory: 'ALL',
    paymentStatus: 'ALL',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });

  //Fetch Data on Mount and Filter Changes
  useEffect(() => {
    fetchSales();
  }, [page, filters]);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build the clean payload (only send what's actually set)
      const apiFilters = {
        page,
        limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

    
      if (filters.search.trim()) apiFilters.search = filters.search.trim();
      if (filters.startDate) apiFilters.startDate = filters.startDate;
      if (filters.endDate) apiFilters.endDate = filters.endDate;
      
      
      if (filters.paymentCategory !== 'ALL') apiFilters.paymentCategory = filters.paymentCategory;
      if (filters.paymentStatus !== 'ALL') apiFilters.paymentStatus = filters.paymentStatus;

      const response = await salesService.getSalesHistory(apiFilters);
      
      const data = response.data;
      console.log(data);
      setSales(data.sales || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.total || 0);

    } catch (err) {
      setError(err.message || "Failed to load sales history.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
     // Reset to first page on filter change
    setPage(1);
  };

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-700 border-green-200';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'PENDING': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'REFUNDED': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales History</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage all sales transactions.</p>
        </div>
        <Link 
          to="/pharmacy/dashboard/sales/pos"
          className="flex items-center gap-2 px-4 py-2 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] transition-colors text-sm font-semibold"
        >
          <CreditCard size={16} /> Go to POS
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              name="search"
              placeholder="Receipt #, Customer, or Phone..." 
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg pl-9 py-2 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
            />
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
          <input 
            type="date" 
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
          <input 
            type="date" 
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#007a55]"
          />
        </div>

        {/* Payment Category */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select 
            name="paymentCategory" 
            value={filters.paymentCategory} 
            onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-2 py-2 focus:ring-2 focus:ring-[#007a55]"
          >
            <option value="ALL">All Types</option>
            <option value="PRIVATE">Private</option>
            <option value="INSURANCE">Insurance</option>
          </select>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select 
            name="paymentStatus" 
            value={filters.paymentStatus} 
            onChange={handleFilterChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white rounded-lg px-2 py-2 focus:ring-2 focus:ring-[#007a55]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
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
                <th className="px-6 py-4">Date & Receipt</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    Loading sales...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No sales found. Try adjusting the filters.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.sales_id || sale.saleId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-gray-900 dark:text-white">{sale.receipt_number || `SALE-${sale.sale_id}`}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12}/> {new Date(sale.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{sale.customer_name || 'Walk-in'}</p>
                      <p className="text-xs text-gray-500">{sale.customer_phone || 'No phone'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        sale.payment_category === 'INSURANCE' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {sale.payment_category}
                      </span>
                      {sale.insurance_provider && (
                        <p className="text-[10px] text-gray-500 mt-1">{sale.insurance_provider}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {Number(sale.net_total_amount).toLocaleString()} RWF
                      </p>
                      {sale.payment_category === 'INSURANCE' && (
                        <p className="text-[10px] text-blue-500 mt-1">
                         Insurance Covered: {Number(sale.amountPaid || sale.insurance_contribution).toLocaleString()} RWF
                        </p>
                        
                        
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge( sale.sale_status)}`}>
                        {sale.sale_status || 'PAID'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/pharmacy/dashboard/sales/${sale.sale_id}/receipt`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#007a55] bg-[#e6f4ef] hover:bg-[#d1eae1] rounded-lg transition-colors"
                      >
                        <FileText size={16} /> Receipt
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && totalItems > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, totalItems)}</span> of <span className="font-medium">{totalItems}</span> sales
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

export default SalesHistory;