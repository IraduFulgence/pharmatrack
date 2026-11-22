import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, X, Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Pencil, Ban, CheckCircle2, KeyRound, Eye, Copy, Check, Users, UserCheck, UserX,
  Phone, Mail, Calendar, Activity, TrendingUp
} from 'lucide-react';
import { staffService } from '../../services/staffService';

const ROLE = 'SALES_OFFICER';
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
const EMPTY_FORM = { fullName: '', phoneNumber: '+250', email: '' };

const inputClass =
  'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#007a55] focus:outline-none dark:text-white';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value.replace(' ', 'T'));
  return isNaN(d) ? value : d.toLocaleString();
};

const formatAction = (action = '') =>
  action.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const StatusBadge = ({ isActive }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
      isActive
        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
        : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
    }`}
  >
    {isActive ? 'Active' : 'Suspended'}
  </span>
);

const Modal = ({ title, icon, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] flex flex-col`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white">{icon}{title}</h3>
        <button onClick={onClose} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <div className="p-4 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const CopyField = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm break-all text-gray-900 dark:text-white">{value}</code>
        <button onClick={copy} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300" aria-label={`Copy ${label}`}>
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, tone }) => (
  <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-lg ${tone}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
    </div>
  </div>
);

const SalesOfficers = () => {
  const [officers, setOfficers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [counts, setCounts] = useState({ total: null, active: null, inactive: null });

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', status: 'ALL' });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Create / edit
  const [formMode, setFormMode] = useState(null); // 'create' | 'edit' | null
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Activation credentials shown after create / reissue
  const [credentials, setCredentials] = useState(null);

  // Suspend / reactivate confirmation
  const [statusTarget, setStatusTarget] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Detail panel
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [activity, setActivity] = useState({ logs: [], error: null });
  const [monthlySales, setMonthlySales] = useState(null);

  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const fetchCounts = useCallback(async () => {
    try {
      const [all, active, inactive] = await Promise.all([
        staffService.listStaff({ role: ROLE, limit: 1 }),
        staffService.listStaff({ role: ROLE, status: 'ACTIVE', limit: 1 }),
        staffService.listStaff({ role: ROLE, status: 'INACTIVE', limit: 1 }),
      ]);
      setCounts({
        total: all.data?.pagination?.total ?? 0,
        active: active.data?.pagination?.total ?? 0,
        inactive: inactive.data?.pagination?.total ?? 0,
      });
    } catch {
      setCounts({ total: null, active: null, inactive: null });
    }
  }, []);

  const fetchOfficers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await staffService.listStaff({
        role: ROLE,
        search: debouncedSearch,
        status: filters.status,
        page,
        limit,
      });
      setOfficers(response.data?.staff || []);
      setTotalPages(response.data?.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load sales officers.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filters.status, page, limit]);

  useEffect(() => { fetchOfficers(); }, [fetchOfficers]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const refresh = () => Promise.all([fetchOfficers(), fetchCounts()]);

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  // ── Create / edit ──
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingOfficer(null);
    setFormError(null);
    setFormMode('create');
  };

  const openEdit = (officer) => {
    setForm({
      fullName: officer.full_name || '',
      phoneNumber: officer.phone_number || '+250',
      email: officer.email || '',
    });
    setEditingOfficer(officer);
    setFormError(null);
    setFormMode('edit');
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormMode(null);
    setEditingOfficer(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullName = form.fullName.trim();
    const phoneNumber = form.phoneNumber.replace(/\s+/g, '');
    const email = form.email.trim();

    if (!fullName) return setFormError('Full name is required.');
    if (!PHONE_REGEX.test(phoneNumber)) {
      return setFormError('Phone number must be in international format, e.g. +250788123456.');
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (formMode === 'create') {
        const payload = { fullName, phoneNumber, role: ROLE };
        if (email) payload.email = email;
        const response = await staffService.createStaff(payload);
        setFormMode(null);
        setCredentials({
          name: fullName,
          message: response.message,
          ...response.data?.activation,
        });
        setPage(1);
      } else {
        const payload = { fullName, phoneNumber };
        if (email) payload.email = email;
        await staffService.updateStaff(editingOfficer.id, payload);
        setFormMode(null);
        showNotice(`${fullName}'s details were updated.`);
      }
      await refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to save sales officer.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Suspend / reactivate ──
  const confirmToggleStatus = async () => {
    if (!statusTarget) return;
    setIsTogglingStatus(true);
    try {
      const response = await staffService.toggleStatus(statusTarget.id);
      setStatusTarget(null);
      showNotice(response.message);
      await refresh();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
      setStatusTarget(null);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // ── Reissue activation code ──
  const handleReissue = async (officer) => {
    setBusyId(officer.id);
    try {
      const response = await staffService.reissueCode(officer.id);
      setCredentials({
        name: officer.full_name,
        message: officer.email
          ? `A new activation code was emailed to ${officer.email}.`
          : 'Share these credentials with the sales officer.',
        ...response.data,
      });
    } catch (err) {
      setError(err.message || 'Failed to reissue activation code.');
    } finally {
      setBusyId(null);
    }
  };

  // ── Detail panel ──
  const loadDetail = async (id) => {
    setDetailLoading(true);
    setDetailError(null);
    setActivity({ logs: [], error: null });
    setMonthlySales(null);
    try {
      const response = await staffService.getStaff(id);
      setDetail(response.data);
    } catch (err) {
      setDetailError(err.message || 'Failed to load details.');
    } finally {
      setDetailLoading(false);
    }

    // Load secondary panels independently so one failure doesn't hide the rest.
    staffService.getStaffActivity(id, { limit: 10 })
      .then((res) => setActivity({ logs: res.data?.logs || [], error: null }))
      .catch((err) => setActivity({ logs: [], error: err.message || 'Activity log unavailable.' }));

    staffService.getStaffSalesReport({ staffId: id, period: 'month' })
      .then((res) => setMonthlySales((res.data || [])[0] || { totalSalesCount: 0, totalRevenue: 0 }))
      .catch(() => setMonthlySales(null));
  };

  const openDetail = (officer) => {
    setDetail({ id: officer.id, full_name: officer.full_name });
    loadDetail(officer.id);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Officers</h1>
          <p className="text-gray-500 dark:text-gray-400">Register, manage and monitor your pharmacy's sales officers.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] transition-colors text-sm font-semibold"
        >
          <Plus size={16} /> Add Sales Officer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users size={20} />} label="Total officers" value={counts.total} tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={<UserCheck size={20} />} label="Active" value={counts.active} tone="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
        <StatCard icon={<UserX size={20} />} label="Suspended" value={counts.inactive} tone="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
      </div>

      {notice && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-sm">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-sm">
          <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text" name="search" placeholder="Name, email or phone..."
              value={filters.search} onChange={handleFilterChange}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} className={inputClass}>
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></td></tr>
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    {debouncedSearch || filters.status !== 'ALL'
                      ? 'No sales officers match your filters.'
                      : 'No sales officers yet. Click "Add Sales Officer" to register one.'}
                  </td>
                </tr>
              ) : (
                officers.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(o)} className="font-semibold text-gray-900 dark:text-white hover:text-[#007a55] text-left">
                        {o.full_name}
                      </button>
                      {o.created_by_name && <p className="text-xs text-gray-400">Added by {o.created_by_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p>{o.phone_number || '—'}</p>
                      <p className="text-xs text-gray-400">{o.email || 'No email'}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge isActive={o.is_active} /></td>
                    <td className="px-4 py-3 text-xs">{o.last_login_at ? formatDate(o.last_login_at) : 'Never'}</td>
                    <td className="px-4 py-3 text-xs">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openDetail(o)} title="View details" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><Eye size={16} /></button>
                        <button onClick={() => openEdit(o)} title="Edit" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><Pencil size={16} /></button>
                        <button
                          onClick={() => handleReissue(o)} disabled={busyId === o.id}
                          title="Reissue activation code"
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-50"
                        >
                          {busyId === o.id ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                        </button>
                        <button
                          onClick={() => setStatusTarget(o)}
                          title={o.is_active ? 'Suspend' : 'Reactivate'}
                          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${o.is_active ? 'text-red-500' : 'text-green-600'}`}
                        >
                          {o.is_active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      {formMode && (
        <Modal
          title={formMode === 'create' ? 'Add Sales Officer' : 'Edit Sales Officer'}
          icon={formMode === 'create' ? <Plus size={20} className="text-[#007a55]" /> : <Pencil size={20} className="text-[#007a55]" />}
          onClose={closeForm}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-sm">
                <AlertCircle size={16} /> {formError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Full name *</label>
              <input
                type="text" value={form.fullName} autoFocus
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className={inputClass} placeholder="e.g. Jean Damascene"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone number *</label>
              <input
                type="tel" value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                className={inputClass} placeholder="+250788123456"
              />
              <p className="text-xs text-gray-400 mt-1">Used to sign in if no email is given.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email (optional)</label>
              <input
                type="email" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass} placeholder="officer@pharmacy.rw"
              />
              {formMode === 'create' && (
                <p className="text-xs text-gray-400 mt-1">If provided, an invitation with the activation code is emailed.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] text-sm font-semibold disabled:opacity-60">
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {formMode === 'create' ? 'Register officer' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Activation credentials modal */}
      {credentials && (
        <Modal title="Activation credentials" icon={<KeyRound size={20} className="text-[#007a55]" />} onClose={() => setCredentials(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{credentials.name}</span> — {credentials.message}
            </p>
            {credentials.activationCode && <CopyField label="Activation code" value={credentials.activationCode} />}
            {credentials.activationLink && <CopyField label="Activation link" value={credentials.activationLink} />}
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              This code expires in {credentials.expiresIn || '48 hours'} and is shown only now. Share it privately with the officer.
            </p>
            <div className="flex justify-end">
              <button onClick={() => setCredentials(null)} className="px-4 py-2 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] text-sm font-semibold">Done</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend / reactivate confirmation */}
      {statusTarget && (
        <Modal
          title={statusTarget.is_active ? 'Suspend sales officer' : 'Reactivate sales officer'}
          icon={<AlertCircle size={20} className={statusTarget.is_active ? 'text-red-500' : 'text-green-600'} />}
          onClose={() => !isTogglingStatus && setStatusTarget(null)}
        >
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            {statusTarget.is_active
              ? <>Suspending <strong>{statusTarget.full_name}</strong> blocks them from signing in until you reactivate them.</>
              : <>Reactivating <strong>{statusTarget.full_name}</strong> lets them sign in again.</>}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setStatusTarget(null)} disabled={isTogglingStatus} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">Cancel</button>
            <button
              onClick={confirmToggleStatus} disabled={isTogglingStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 ${statusTarget.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-[#007a55] hover:bg-[#006645]'}`}
            >
              {isTogglingStatus && <Loader2 size={16} className="animate-spin" />}
              {statusTarget.is_active ? 'Suspend' : 'Reactivate'}
            </button>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {detail && (
        <Modal title={detail.full_name || 'Sales officer'} icon={<Eye size={20} className="text-[#007a55]" />} onClose={() => setDetail(null)} wide>
          {detailLoading ? (
            <div className="py-12 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
          ) : detailError ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm"><AlertCircle size={16} /> {detailError}</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {detail.phone_number || '—'}</p>
                <p className="flex items-center gap-2"><Mail size={14} className="text-gray-400" /> {detail.email || 'No email'}</p>
                <p className="flex items-center gap-2"><Calendar size={14} className="text-gray-400" /> Added {formatDate(detail.created_at)}</p>
                <p className="flex items-center gap-2"><StatusBadge isActive={detail.is_active} /> Last login: {detail.last_login_at ? formatDate(detail.last_login_at) : 'Never'}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Sales (this month)', value: monthlySales ? monthlySales.totalSalesCount : '—' },
                  { label: 'Revenue (this month)', value: monthlySales ? `${Number(monthlySales.totalRevenue).toLocaleString()} RWF` : '—' },
                  { label: 'Sales (all time)', value: Number(detail.total_sales_count || 0).toLocaleString() },
                  { label: 'Revenue (all time)', value: `${Number(detail.total_sales_revenue || 0).toLocaleString()} RWF` },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><TrendingUp size={12} /> {s.label}</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2"><Activity size={16} /> Recent activity</h4>
                {activity.error ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{activity.error}</p>
                ) : activity.logs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recorded activity yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                    {activity.logs.map((log) => (
                      <li key={log.log_id} className="py-2 flex justify-between gap-4">
                        <span className="text-gray-700 dark:text-gray-300">{formatAction(log.action)}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                <button onClick={() => { setDetail(null); openEdit(detail); }} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300"><Pencil size={14} /> Edit</button>
                <button onClick={() => { const d = detail; setDetail(null); handleReissue(d); }} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300"><KeyRound size={14} /> Reissue code</button>
                <button
                  onClick={() => { setStatusTarget(detail); setDetail(null); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${detail.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-[#007a55] hover:bg-[#006645]'}`}
                >
                  {detail.is_active ? <><Ban size={14} /> Suspend</> : <><CheckCircle2 size={14} /> Reactivate</>}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default SalesOfficers;
