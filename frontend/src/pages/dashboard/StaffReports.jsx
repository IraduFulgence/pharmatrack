import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Boxes, Loader2, AlertCircle, Receipt, Wallet, Pill, Users,
} from 'lucide-react';
import { staffService } from '../../services/staffService';

const ROLE_LABELS = { SALES_OFFICER: 'Sales Officer', PHARMACIST: 'Pharmacist', PHARMACY_ADMIN: 'Admin' };

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

// Inventory transaction types grouped into the columns admins care about.
const OP_COLUMNS = [
  { key: 'in', label: 'Stock in', match: (t) => t === 'STOCK_IN' },
  { key: 'out', label: 'Sold / stock out', match: (t) => t === 'STOCK_OUT' },
  { key: 'damaged', label: 'Damaged', match: (t) => t === 'ADJUSTMENT_DAMAGED' || t === 'DAMAGED' },
  { key: 'expired', label: 'Expired', match: (t) => t === 'ADJUSTMENT_EXPIRED' || t === 'EXPIRED' },
  { key: 'other', label: 'Other adjustments', match: () => true },
];

const OP_TYPES = [
  { value: 'STOCK_IN', label: 'Stock in' },
  { value: 'STOCK_OUT', label: 'Stock out (sales)' },
  { value: 'ADJUSTMENT_INCREASE', label: 'Adjustment: increase' },
  { value: 'ADJUSTMENT_DECREASE', label: 'Adjustment: decrease' },
  { value: 'ADJUSTMENT_DAMAGED', label: 'Adjustment: damaged' },
  { value: 'ADJUSTMENT_EXPIRED', label: 'Adjustment: expired' },
  { value: 'ADJUSTMENT_LOST', label: 'Adjustment: lost' },
  { value: 'ADJUSTMENT_PHYSICAL_COUNT', label: 'Adjustment: physical count' },
];

const money = (n) => `${Number(n || 0).toLocaleString()} RWF`;
const num = (n) => Number(n || 0).toLocaleString();

const inputClass =
  'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#007a55] focus:outline-none';

const StatCard = ({ icon, label, value, tone }) => (
  <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-lg ${tone}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
    </div>
  </div>
);

const ErrorBox = ({ message }) => (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-sm">
    <AlertCircle size={16} /> {message}
  </div>
);

const Spinner = () => (
  <div className="py-16 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
);

// ───────────────────────── Sales per staff ─────────────────────────

const SalesReport = ({ staff }) => {
  const [period, setPeriod] = useState('month');
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const [staffId, setStaffId] = useState('');
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const customReady = period !== 'custom' || (range.startDate && range.endDate);

  useEffect(() => {
    if (!customReady) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const filters = period === 'custom' ? { ...range, staffId } : { period, staffId };
    staffService.getStaffSalesReport(filters)
      .then((res) => { if (!cancelled) setRows(res.data || []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load the sales report.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [period, range, staffId, customReady]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    sales: acc.sales + r.totalSalesCount,
    revenue: acc.revenue + r.totalRevenue,
    medicines: acc.medicines + r.totalMedicinesSold,
    active: acc.active + (r.totalSalesCount > 0 ? 1 : 0),
  }), { sales: 0, revenue: 0, medicines: 0, active: 0 }), [rows]);

  const topRevenue = Math.max(...rows.map((r) => r.totalRevenue), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                period === p.value
                  ? 'bg-[#007a55] text-white border-[#007a55]'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
              From
              <input type="date" className={inputClass} value={range.startDate} max={range.endDate || undefined}
                onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
              To
              <input type="date" className={inputClass} value={range.endDate} min={range.startDate || undefined}
                onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500 ml-auto">
          Staff member
          <select className={inputClass} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">All staff</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </label>
      </div>

      {!customReady ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Pick a start and end date to see the report.</p>
      ) : error ? (
        <ErrorBox message={error} />
      ) : isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Receipt size={20} />} label="Sales" value={num(totals.sales)} tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatCard icon={<Wallet size={20} />} label="Revenue" value={money(totals.revenue)} tone="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
            <StatCard icon={<Pill size={20} />} label="Medicines sold" value={num(totals.medicines)} tone="bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
            <StatCard icon={<Users size={20} />} label="Staff who sold" value={`${totals.active} / ${rows.length}`} tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {rows.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                No staff yet. <Link to="/pharmacy/dashboard/staffs" className="text-[#007a55] hover:underline">Add staff</Link> to see their sales here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3 text-right">Sales</th>
                      <th className="px-4 py-3 min-w-[220px]">Revenue</th>
                      <th className="px-4 py-3 text-right">Patient paid</th>
                      <th className="px-4 py-3 text-right">Insurance</th>
                      <th className="px-4 py-3 text-right">Private / insured</th>
                      <th className="px-4 py-3 text-right">Medicines</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                    {rows.map((r) => (
                      <tr key={r.staffId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">{r.staffName}</p>
                          <p className="text-xs text-gray-500">
                            {ROLE_LABELS[r.staffRole] || r.staffRole}{r.isActive === false ? ' · suspended' : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">{num(r.totalSalesCount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                              <div className="h-full bg-[#007a55] rounded-full"
                                style={{ width: topRevenue ? `${(r.totalRevenue / topRevenue) * 100}%` : '0%' }} />
                            </div>
                            <span className="font-medium whitespace-nowrap">{money(r.totalRevenue)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{money(r.patientRevenue)}</td>
                        <td className="px-4 py-3 text-right">{money(r.insuranceRevenue)}</td>
                        <td className="px-4 py-3 text-right">{r.privateSalesCount} / {r.insuranceSalesCount}</td>
                        <td className="px-4 py-3 text-right">{num(r.totalMedicinesSold)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cancelled sales are excluded. Sales made from the main pharmacy account aren't tied to a staff member, so they don't appear here.
          </p>
        </>
      )}
    </div>
  );
};

// ───────────────────── Inventory operations per staff ─────────────────────

const InventoryOpsReport = ({ staff }) => {
  const [filters, setFilters] = useState({ staffId: '', type: '', startDate: '', endDate: '' });
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    staffService.getInventoryOperationsReport(filters)
      .then((res) => { if (!cancelled) setRows(res.data || []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load the inventory report.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);

  // Backend returns one row per (type, staff); pivot to one row per staff.
  const byStaff = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = r.pharmacy_user_id ?? 'admin';
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: r.staff_name || 'Pharmacy admin',
          role: r.staff_role,
          cells: Object.fromEntries(OP_COLUMNS.map((c) => [c.key, { count: 0, qty: 0 }])),
          total: 0,
        });
      }
      const entry = map.get(key);
      const col = OP_COLUMNS.find((c) => c.match(r.transaction_type));
      entry.cells[col.key].count += Number(r.operation_count || 0);
      entry.cells[col.key].qty += Number(r.total_quantity || 0);
      entry.total += Number(r.operation_count || 0);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          Staff member
          <select className={inputClass} value={filters.staffId} onChange={(e) => setFilter('staffId', e.target.value)}>
            <option value="">All staff</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          Operation
          <select className={inputClass} value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">All operations</option>
            {OP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          From
          <input type="date" className={inputClass} value={filters.startDate} max={filters.endDate || undefined}
            onChange={(e) => setFilter('startDate', e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          To
          <input type="date" className={inputClass} value={filters.endDate} min={filters.startDate || undefined}
            onChange={(e) => setFilter('endDate', e.target.value)} />
        </label>
      </div>

      {error ? (
        <ErrorBox message={error} />
      ) : isLoading ? (
        <Spinner />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {byStaff.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <Boxes className="mx-auto mb-3 text-gray-300" size={36} />
              <p className="text-sm">No inventory operations in this range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Staff</th>
                    {OP_COLUMNS.map((c) => <th key={c.key} className="px-4 py-3 text-right">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                  {byStaff.map((s) => (
                    <tr key={s.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                        {s.role && <p className="text-xs text-gray-500">{ROLE_LABELS[s.role] || s.role}</p>}
                      </td>
                      {OP_COLUMNS.map((c) => {
                        const cell = s.cells[c.key];
                        return (
                          <td key={c.key} className="px-4 py-3 text-right">
                            {cell.count === 0 ? (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            ) : (
                              <>
                                <p className="font-medium">{num(cell.qty)} units</p>
                                <p className="text-xs text-gray-500">{num(cell.count)} {cell.count === 1 ? 'entry' : 'entries'}</p>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ───────────────────────── Page ─────────────────────────

const TABS = [
  { value: 'sales', label: 'Sales by staff', icon: BarChart3 },
  { value: 'inventory', label: 'Inventory operations', icon: Boxes },
];

const StaffReports = () => {
  const [tab, setTab] = useState('sales');
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    staffService.listStaff({ limit: 100 })
      .then((res) => setStaff(res.data?.staff || []))
      .catch(() => setStaff([]));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Reports</h1>
        <p className="text-gray-500 dark:text-gray-400">Sales performance and stock handling for each employee.</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? 'border-[#007a55] text-[#007a55]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'sales' ? <SalesReport staff={staff} /> : <InventoryOpsReport staff={staff} />}
    </div>
  );
};

export default StaffReports;
