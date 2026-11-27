import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Plus, Loader2, AlertCircle, X, Pencil, CheckCircle2, Info,
} from 'lucide-react';
import { insuranceService } from '../../services/insuranceService';

const inputClass =
  'w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#007a55] focus:outline-none';

const validCoverage = (v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100;

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="font-bold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close"><X size={20} /></button>
      </div>
      {children}
    </div>
  </div>
);

const InsuranceSettings = () => {
  const [configs, setConfigs] = useState([]);
  const [available, setAvailable] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Add or  edit modal
  const [modal, setModal] = useState(null); 
  const [form, setForm] = useState({ insuranceId: '', coveragePercentage: '' });
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [mine, all] = await Promise.all([insuranceService.list(), insuranceService.available()]);
      setConfigs(mine.data || []);
      setAvailable(all.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load insurance settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3000);
  };

  const addable = available.filter((p) => !p.already_added);

  const openAdd = () => {
    setForm({ insuranceId: '', coveragePercentage: '' });
    setFormError(null);
    setModal({ mode: 'add' });
  };

  const openEdit = (config) => {
    setForm({ insuranceId: String(config.insurance_id), coveragePercentage: String(config.coverage_percentage) });
    setFormError(null);
    setModal({ mode: 'edit', config });
  };

  const pickInsurer = (id) => {
    const provider = available.find((p) => String(p.provider_id) === id);
    setForm({
      insuranceId: id,
      coveragePercentage: provider?.default_coverage_percentage != null ? String(provider.default_coverage_percentage) : '',
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (modal.mode === 'add' && !form.insuranceId) {
      setFormError('Choose an insurer.');
      return;
    }
    if (!validCoverage(form.coveragePercentage)) {
      setFormError('Coverage must be a number from 0 to 100.');
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const coveragePercentage = Number(form.coveragePercentage);
      const res = modal.mode === 'add'
        ? await insuranceService.add({ insuranceId: Number(form.insuranceId), coveragePercentage })
        : await insuranceService.update(modal.config.pharmacy_insurance_id, { coveragePercentage });
      setModal(null);
      flash(res.message || 'Saved.');
      load();
    } catch (err) {
      setFormError(err.message || 'Could not save.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = async (config) => {
    setBusyId(config.pharmacy_insurance_id);
    setError(null);
    try {
      await insuranceService.update(config.pharmacy_insurance_id, { isActive: !config.is_active });
      flash(`${config.provider_name} ${config.is_active ? 'switched off' : 'accepted again'}.`);
      load();
    } catch (err) {
      setError(err.message || 'Could not update.');
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = configs.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6 max-w-8xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accepted Insurance</h1>
          {/* <p className="text-gray-500 dark:text-gray-400">Choose which insurers your pharmacy accepts and how much of each bill they cover.</p> */}
        </div>
        <button
          onClick={openAdd}
          disabled={isLoading || addable.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#007a55] text-white rounded-lg hover:bg-[#006645] text-sm font-semibold disabled:opacity-50"
        >
          <Plus size={16} /> Add insurer
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-sm">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!isLoading && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 text-sm">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>
            {configs.length === 0
              ? 'You haven\'t set up any insurers yet, so the sales point offers every insurer in PharmaTrack at its default coverage. Add the ones you accept to limit the list.'
              : `The sales point offers only the ${activeCount} insurer${activeCount === 1 ? '' : 's'} switched on below, at the coverage you set.`}
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
        ) : configs.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400">
            <ShieldCheck className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="text-sm">No insurers set up yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Insurer</th>
                  <th className="px-4 py-3 text-right">Your coverage</th>
                  <th className="px-4 py-3 text-right">Default</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {configs.map((c) => (
                  <tr key={c.pharmacy_insurance_id} className={c.is_active ? '' : 'opacity-60'}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{c.provider_name}</p>
                      {c.provider_code && <p className="text-xs text-gray-500">{c.provider_code}</p>}
                      {c.provider_is_active === false && (
                        <p className="text-xs text-amber-600">No longer active in PharmaTrack</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{c.coverage_percentage}%</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {c.default_coverage_percentage != null ? `${c.default_coverage_percentage}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        c.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {c.is_active ? 'Accepted' : 'Switched off'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <Pencil size={12} /> Coverage
                        </button>
                        <button
                          onClick={() => toggle(c)}
                          disabled={busyId === c.pharmacy_insurance_id}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 ${
                            c.is_active
                              ? 'text-red-600 border border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20'
                              : 'text-white bg-[#007a55] hover:bg-[#006645]'
                          }`}
                        >
                          {busyId === c.pharmacy_insurance_id ? <Loader2 size={12} className="animate-spin" /> : c.is_active ? 'Switch off' : 'Accept'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

  

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add insurer' : `Coverage for ${modal.config.provider_name}`} onClose={() => setModal(null)}>
          <form onSubmit={save} className="p-5 space-y-4">
            {modal.mode === 'add' && (
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Insurer
                <select className={`${inputClass} mt-1`} value={form.insuranceId} onChange={(e) => pickInsurer(e.target.value)}>
                  <option value="">Choose an insurer…</option>
                  {addable.map((p) => (
                    <option key={p.provider_id} value={p.provider_id}>{p.provider_name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Coverage (%)
              <input
                type="number" min="0" max="100" step="0.01"
                className={`${inputClass} mt-1`}
                value={form.coveragePercentage}
                onChange={(e) => setForm((f) => ({ ...f, coveragePercentage: e.target.value }))}
              />
              <span className="block mt-1 text-xs font-normal text-gray-500">Share of each bill the insurer pays. The patient pays the rest.</span>
            </label>
            {formError && (
              <p className="flex items-center gap-1 text-sm text-red-600"><AlertCircle size={14} /> {formError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Cancel</button>
              <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#007a55] text-white hover:bg-[#006645] disabled:opacity-60">
                {isSaving && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default InsuranceSettings;
