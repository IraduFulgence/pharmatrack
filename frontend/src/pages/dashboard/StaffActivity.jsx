import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Loader2, AlertCircle, ChevronLeft, ChevronRight, RotateCcw,
  UserPlus, UserCheck, UserX, UserCog, KeyRound, Building2, ShieldCheck,
} from 'lucide-react';
import { staffService } from '../../services/staffService';

const PAGE_SIZE = 20;

// Every action the backend records today, with how to show it.
const ACTIONS = {
  STAFF_REGISTERED: { label: 'Staff registered', icon: UserPlus, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  STAFF_ACTIVATED: { label: 'Account activated', icon: ShieldCheck, tone: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  STAFF_UPDATED: { label: 'Staff details updated', icon: UserCog, tone: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  STAFF_SUSPENDED: { label: 'Staff suspended', icon: UserX, tone: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  STAFF_REACTIVATED: { label: 'Staff reactivated', icon: UserCheck, tone: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  STAFF_CODE_REISSUED: { label: 'Activation code reissued', icon: KeyRound, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  PHARMACY_PROFILE_UPDATED: { label: 'Pharmacy profile updated', icon: Building2, tone: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

const ROLE_LABELS = { SALES_OFFICER: 'Sales Officer', PHARMACIST: 'Pharmacist', PHARMACY_ADMIN: 'Admin' };

const FIELD_LABELS = {
  fullName: 'name', phoneNumber: 'phone', email: 'email', role: 'role',
  pharmacyName: 'pharmacy name', locationAddress: 'address', latitude: 'latitude', longitude: 'longitude',
};

const parseDetails = (details) => {
  if (!details) return {};
  if (typeof details === 'object') return details;
  try { return JSON.parse(details); } catch { return {}; }
};

// One readable line about what the action touched.
const describe = (log) => {
  const d = parseDetails(log.details);
  const name = d.fullName || d.staffName;
  const role = ROLE_LABELS[d.role] || d.role;
  if (d.changes && typeof d.changes === 'object') {
    const fields = Object.keys(d.changes).map((k) => FIELD_LABELS[k] || k);
    return fields.length ? `Changed ${fields.join(', ')}` : '';
  }
  return [name, role].filter(Boolean).join(' · ');
};

const inputClass =
  'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#007a55] focus:outline-none';

const StaffActivity = () => {
  const [staff, setStaff] = useState([]);
  const [filters, setFilters] = useState({ staffId: '', action: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Staff list for the "who" filter.
  useEffect(() => {
    staffService.listStaff({ limit: 100 })
      .then((res) => setStaff(res.data?.staff || []))
      .catch(() => setStaff([]));
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await staffService.getActivities({ ...filters, page, limit: PAGE_SIZE });
      setLogs(res.data?.logs || []);
      setPagination(res.data?.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load activity.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6 max-w-8xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Activity</h1>
        {/* <p className="text-gray-500 dark:text-gray-400">Who registered, changed, suspended or activated staff accounts, and pharmacy profile changes.</p> */}
      </div>

      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          Done by
          <select className={inputClass} value={filters.staffId} onChange={(e) => setFilter('staffId', e.target.value)}>
            <option value="">Everyone</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          Action
          <select className={inputClass} value={filters.action} onChange={(e) => setFilter('action', e.target.value)}>
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([value, a]) => (
              <option key={value} value={value}>{a.label}</option>
            ))}
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
        {hasFilters && (
          <button
            onClick={() => { setPage(1); setFilters({ staffId: '', action: '', startDate: '', endDate: '' }); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <RotateCcw size={14} /> Clear
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400">
            <Activity className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="text-sm">{hasFilters ? 'No activity matches these filters.' : 'No activity recorded yet.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => {
              const meta = ACTIONS[log.action] || { label: log.action, icon: Activity, tone: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' };
              const Icon = meta.icon;
              const detail = describe(log);
              return (
                <li key={log.log_id} className="flex items-start gap-4 px-4 py-3">
                  <div className={`p-2 rounded-lg shrink-0 ${meta.tone}`}><Icon size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{meta.label}</p>
                    {detail && <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{detail}</p>}
                    <p className="text-xs text-gray-500 mt-0.5">
                      by {log.employee_name || 'Pharmacy admin'}
                      {log.employee_role ? ` (${ROLE_LABELS[log.employee_role] || log.employee_role})` : ''}
                    </p>
                  </div>
                  <time className="text-xs text-gray-500 whitespace-nowrap">{log.created_at}</time>
                </li>
              );
            })}
          </ul>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400">
            <span>{pagination.total} entries · page {page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40" aria-label="Previous page">
                <ChevronLeft size={16} />
              </button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40" aria-label="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffActivity;
