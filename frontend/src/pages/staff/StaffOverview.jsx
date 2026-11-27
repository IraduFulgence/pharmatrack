import React, { useState, useEffect, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ShoppingBag, MessageSquare, Receipt, Wallet, Pill, ShieldCheck, Loader2, AlertCircle, ArrowRight
} from 'lucide-react';
import { ApiRequest } from '../../services/auth';
import { STAFF_DASHBOARD } from '../../utils/dashboardBase';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

const money = (n) => `${Number(n || 0).toLocaleString()} RWF`;

const StatCard = ({ icon, label, value, tone }) => (
  <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-lg ${tone}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
    </div>
  </div>
);

const StaffOverview = () => {
  const { awaitingReply = 0 } = useOutletContext() || {};
  const [period, setPeriod] = useState('today');
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const firstName = useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem('user'))?.fullName || '').split(' ')[0];
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    ApiRequest(`/staff/my-reports?period=${period}`, { method: 'GET' })
      .then((res) => { if (!cancelled) setReport(res.data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load your sales summary.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const summary = report?.summary || {};
  const recentSales = report?.recentSales || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {firstName ? `Hello, ${firstName}` : 'Overview'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Your sales and patient messages at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`${STAFF_DASHBOARD}/sales/pos`}
            className="flex items-center gap-2 px-4 py-2 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] transition-colors text-sm font-semibold"
          >
            <ShoppingBag size={16} /> New sale
          </Link>
          <Link
            to={`${STAFF_DASHBOARD}/messages`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold"
          >
            <MessageSquare size={16} /> Messages
            {awaitingReply > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{awaitingReply}</span>
            )}
          </Link>
        </div>
      </div>

      {awaitingReply > 0 && (
        <Link
          to={`${STAFF_DASHBOARD}/messages`}
          className="flex items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare size={18} />
            {awaitingReply === 1 ? '1 patient is waiting for a reply.' : `${awaitingReply} patients are waiting for a reply.`}
          </span>
          <ArrowRight size={18} />
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              period === p.value
                ? 'bg-[#007a55] text-white border-[#007a55]'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      ) : isLoading ? (
        <div className="py-12 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Receipt size={20} />} label="Sales made" value={summary.totalSales ?? 0} tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatCard icon={<Wallet size={20} />} label="Revenue" value={money(summary.totalRevenue)} tone="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
            <StatCard icon={<Pill size={20} />} label="Medicines sold" value={summary.totalMedicinesSold ?? 0} tone="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
            <StatCard
              icon={<ShieldCheck size={20} />}
              label="Insurance / private sales"
              value={`${summary.insuranceSalesCount ?? 0} / ${summary.privateSalesCount ?? 0}`}
              tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white">My recent sales</h2>
              <Link to={`${STAFF_DASHBOARD}/sales/history`} className="text-sm text-[#007a55] hover:underline">View all</Link>
            </div>
            {recentSales.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                You haven't made any sales yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Receipt</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                    {recentSales.map((s) => (
                      <tr key={s.sale_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <Link to={`${STAFF_DASHBOARD}/sales/${s.sale_id}/receipt`} className="font-medium text-[#007a55] hover:underline">
                            {s.receipt_number || `#${s.sale_id}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{s.customer_name || 'Walk-in'}</td>
                        <td className="px-4 py-3 text-xs">{s.payment_category} · {s.payment_status}</td>
                        <td className="px-4 py-3 text-right font-medium">{money(s.net_total_amount)}</td>
                        <td className="px-4 py-3 text-xs">{s.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StaffOverview;
