import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, X, Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Pencil, Ban, CheckCircle2, KeyRound, Eye, Copy, Check, Users, UserCheck, UserX,
  Phone, Mail, Calendar, Activity, TrendingUp, UserPlus
} from 'lucide-react';
import { staffService } from '../../services/staffService';

const ROLE = 'SALES_OFFICER';
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
const EMPTY_FORM = { fullName: '', phoneNumber: '+250', email: '' };

const inputClass =
  'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#007a55]/30 focus:border-[#007a55] focus:outline-none dark:text-white transition-all placeholder:text-gray-400';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value.replace(' ', 'T'));
  return isNaN(d) ? value : d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const formatAction = (action = '') =>
  action.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

const StatusBadge = ({ isActive }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      isActive
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
    {isActive ? 'Active' : 'Suspended'}
  </span>
);


const Modal = ({ title, icon, onClose, children, footer, width = 'max-w-md' }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800`}
    >
      <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#007a55]/10 text-[#007a55] flex items-center justify-center">
            {icon}
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      {footer && (
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          {footer}
        </div>
      )}
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
    } catch { /* ignore */ }
  };
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm break-all text-gray-900 dark:text-white font-mono">
          {value}
        </code>
        <button
          onClick={copy}
          className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, tone }) => (
  <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-3 rounded-xl ${tone}`}>{icon}</div>
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value ?? '—'}</p>
    </div>
  </div>
);

const Avatar = ({ name, isActive }) => (
  <div className="relative">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007a55] to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
      {getInitials(name)}
    </div>
    <span
      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
        isActive ? 'bg-emerald-500' : 'bg-rose-500'
      }`}
    />
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

  const [formMode, setFormMode] = useState(null);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [credentials, setCredentials] = useState(null);

  const [statusTarget, setStatusTarget] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

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
    <div className="space-y-6 max-w-8xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Sales Officers</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#007a55] text-white rounded-xl hover:bg-[#006645] transition-all text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          <Plus size={16} /> Add Sales Officer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users size={20} />} label="Total officers" value={counts.total} tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard icon={<UserCheck size={20} />} label="Active" value={counts.active} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
        <StatCard icon={<UserX size={20} />} label="Suspended" value={counts.inactive} tone="bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />
      </div>

      {notice && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-sm">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800 text-sm">
          <span className="flex items-center gap-2"><AlertCircle size={16} /> {error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss" className="hover:opacity-70"><X size={16} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Search</label>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text" name="search" placeholder="Search by name, email or phone..."
              value={filters.search} onChange={handleFilterChange}
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange} className={inputClass}>
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Officer</th>
                <th className="px-5 py-3.5 font-semibold">Contact</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Last login</th>
                <th className="px-5 py-3.5 font-semibold">Added</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Loader2 className="animate-spin inline text-[#007a55]" size={28} />
                  </td>
                </tr>
              ) : officers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <UserPlus size={24} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-medium">
                        {debouncedSearch || filters.status !== 'ALL'
                          ? 'No sales officers match your filters.'
                          : 'No sales officers yet.'}
                      </p>
                      {!debouncedSearch && filters.status === 'ALL' && (
                        <button onClick={openCreate} className="text-sm font-semibold text-[#007a55] hover:underline">
                          Register your first officer 
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                officers.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={o.full_name} isActive={o.is_active} />
                        <div>
                          <button onClick={() => openDetail(o)} className="font-semibold text-gray-900 dark:text-white hover:text-[#007a55] text-left transition-colors">
                            {o.full_name}
                          </button>
                          {/* {o.created_by_name && (
                            <p className="text-xs text-gray-400">Added by {o.created_by_name}</p>
                          )} */}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{o.phone_number || '—'}</p>
                      <p className="text-xs text-gray-400">{o.email || 'No email'}</p>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge isActive={o.is_active} /></td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                      {o.last_login_at ? formatDate(o.last_login_at) : <span className="italic">Never</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">{formatDate(o.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-0.5">
                        <button onClick={() => openDetail(o)} title="View details" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"><Eye size={16} /></button>
                        <button onClick={() => openEdit(o)} title="Edit" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"><Pencil size={16} /></button>
                        <button
                          onClick={() => handleReissue(o)} disabled={busyId === o.id}
                          title="Reissue activation code"
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-50 transition-colors"
                        >
                          {busyId === o.id ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                        </button>
                        <button
                          onClick={() => setStatusTarget(o)}
                          title={o.is_active ? 'Suspend' : 'Reactivate'}
                          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${o.is_active ? 'text-rose-500' : 'text-emerald-600'}`}
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
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      {formMode && (
        <Modal
          width="max-w-6xl"
          title={formMode === 'create' ? 'Add Sales Officer' : 'Edit Sales Officer'}
          icon={formMode === 'create' ? <UserPlus size={18} /> : <Pencil size={18} />}
          onClose={closeForm}
          footer={
            <>
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="officer-form"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#007a55] text-white rounded-xl hover:bg-[#006645] text-sm font-semibold disabled:opacity-60 transition-colors shadow-sm"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {formMode === 'create' ? 'Register officer' : 'Save changes'}
              </button>
            </>
          }
        >
          <form id="officer-form" onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800 text-sm">
                <AlertCircle size={16} /> {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Full name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.fullName}
                autoFocus
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Jean Damascene"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Phone number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                className={inputClass}
                placeholder="+250788123456"
              />
              <p className="text-xs text-gray-400 mt-1.5">Used to sign in if no email is given.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
                placeholder="officer@pharmacy.rw"
              />
              {formMode === 'create' && (
                <p className="text-xs text-gray-400 mt-1.5">
                  An invitation with the activation code will be emailed.
                </p>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* Activation credentials modal */}
      {credentials && (
        <Modal
          width="max-w-md"
          title="Activation credentials"
          icon={<KeyRound size={18} />}
          onClose={() => setCredentials(null)}
          footer={
            <button
              onClick={() => setCredentials(null)}
              className="px-4 py-2.5 bg-[#007a55] text-white rounded-xl hover:bg-[#006645] text-sm font-semibold transition-colors shadow-sm"
            >
              Done
            </button>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-white">{credentials.name}</span> — {credentials.message}
            </p>
            {credentials.activationCode && <CopyField label="Activation code" value={credentials.activationCode} />}
            {credentials.activationLink && <CopyField label="Activation link" value={credentials.activationLink} />}
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              This code expires in {credentials.expiresIn || '48 hours'} and is shown only now. Share it privately with the officer.
            </p>
          </div>
        </Modal>
      )}

      {/* Suspend / reactivate confirmation */}
      {statusTarget && (
        <Modal
          width="max-w-sm"
          title={statusTarget.is_active ? 'Suspend sales officer' : 'Reactivate sales officer'}
          icon={statusTarget.is_active ? <Ban size={18} className="text-rose-500" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
          onClose={() => !isTogglingStatus && setStatusTarget(null)}
          footer={
            <>
              <button
                onClick={() => setStatusTarget(null)}
                disabled={isTogglingStatus}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleStatus}
                disabled={isTogglingStatus}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-colors shadow-sm ${statusTarget.is_active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#007a55] hover:bg-[#006645]'}`}
              >
                {isTogglingStatus && <Loader2 size={16} className="animate-spin" />}
                {statusTarget.is_active ? 'Suspend' : 'Reactivate'}
              </button>
            </>
          }
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {statusTarget.is_active
              ? <>Suspending <strong className="text-gray-900 dark:text-white">{statusTarget.full_name}</strong> blocks them from signing in until you reactivate them.</>
              : <>Reactivating <strong className="text-gray-900 dark:text-white">{statusTarget.full_name}</strong> lets them sign in again.</>}
          </p>
        </Modal>
      )}

      {/* Detail modal */}
      {detail && (
        <Modal
          width="max-w-2xl"
          title={detail.full_name || 'Sales officer'}
          icon={<Eye size={18} />}
          onClose={() => setDetail(null)}
          footer={
            !detailLoading && !detailError && (
              <>
                <button onClick={() => { setDetail(null); openEdit(detail); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => { const d = detail; setDetail(null); handleReissue(d); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <KeyRound size={14} /> Reissue code
                </button>
                <button
                  onClick={() => { setStatusTarget(detail); setDetail(null); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors shadow-sm ${detail.is_active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#007a55] hover:bg-[#006645]'}`}
                >
                  {detail.is_active ? <><Ban size={14} /> Suspend</> : <><CheckCircle2 size={14} /> Reactivate</>}
                </button>
              </>
            )
          }
        >
          {detailLoading ? (
            <div className="py-16 text-center"><Loader2 className="animate-spin inline text-[#007a55]" size={28} /></div>
          ) : detailError ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-sm"><AlertCircle size={16} /> {detailError}</div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                <Avatar name={detail.full_name} isActive={detail.is_active} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{detail.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sales Officer</p>
                </div>
                <StatusBadge isActive={detail.is_active} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {detail.phone_number || '—'}</p>
                <p className="flex items-center gap-2"><Mail size={14} className="text-gray-400" /> {detail.email || 'No email'}</p>
                <p className="flex items-center gap-2"><Calendar size={14} className="text-gray-400" /> Added {formatDate(detail.created_at)}</p>
                <p className="flex items-center gap-2"><Activity size={14} className="text-gray-400" /> Last login: {detail.last_login_at ? formatDate(detail.last_login_at) : 'Never'}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Sales (this month)', value: monthlySales ? monthlySales.totalSalesCount : '—' },
                  { label: 'Revenue (this month)', value: monthlySales ? `${Number(monthlySales.totalRevenue).toLocaleString()} RWF` : '—' },
                  { label: 'Sales (all time)', value: Number(detail.total_sales_count || 0).toLocaleString() },
                  { label: 'Revenue (all time)', value: `${Number(detail.total_sales_revenue || 0).toLocaleString()} RWF` },
                ].map((s) => (
                  <div key={s.label} className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><TrendingUp size={12} /> {s.label}</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3"><Activity size={16} /> Recent activity</h4>
                {activity.error ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{activity.error}</p>
                ) : activity.logs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recorded activity yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800 text-sm rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {activity.logs.map((log) => (
                      <li key={log.log_id} className="py-2.5 px-3.5 flex justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <span className="text-gray-700 dark:text-gray-300">{formatAction(log.action)}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default SalesOfficers;