import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pill, Search, Plus, Upload, X, Loader2, AlertCircle, CheckCircle2, Pencil, Download,
  FileSpreadsheet, Tag, Baby, ShieldCheck,
} from 'lucide-react';
import { catalogueService } from '../../services/catalogueService';

// The shared medicine catalogue: what each medicine treats, its category,
// who may take it (age limits) and how (dosage notes). Pharmacies stock these;
// patients see them in the app.

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Powder', 'Sachet', 'Gel', 'Suppository'];

const EMPTY = {
  medicineName: '', genericName: '', brandName: '', strength: '', dosageForm: '', categoryId: '',
  indications: [], minAgeYears: '', maxAgeYears: '', dosageNotes: '', requiresPrescription: false, description: '',
};

const inputCls = 'block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#007a55]';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1';

const ageText = (m) => m.age_limit || 'All ages';

/** Type a condition and press Enter (or comma) to add it. */
const TagInput = ({ value, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const parts = raw.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next.slice(0, 20));
    setDraft('');
  };
  return (
    <div className={`${inputCls} flex flex-wrap gap-1.5 items-center`}>
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e6f4ef] text-[#007a55] text-xs font-semibold">
          {t}
          <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`}><X size={12} /></button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => (/[;,]/.test(e.target.value) ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) add(draft); }
          if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length ? '' : placeholder}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
      />
    </div>
  );
};

const ManageMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [scope, setScope] = useState('CATALOGUE');

  // Add / edit
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Bulk import
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [toast, setToast] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await catalogueService.categories();
      setCategories(res.data || []);
    } catch { /* the form still works without the list */ }
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await catalogueService.list({ q, categoryId, scope, limit: 200 });
      setMedicines(res.data?.medicines || []);
      setTotal(res.data?.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not load medicines.');
    } finally {
      setIsLoading(false);
    }
  }, [q, categoryId, scope]);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const flash = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // ----- Add / edit -----

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (m) => {
    setEditingId(m.medicine_id);
    setForm({
      medicineName: m.medicine_name || '', genericName: m.generic_name || '', brandName: m.brand_name || '',
      strength: m.strength || '', dosageForm: m.dosage_form || '', categoryId: m.category_id ? String(m.category_id) : '',
      indications: m.indications || [], minAgeYears: m.min_age_years ?? '', maxAgeYears: m.max_age_years ?? '',
      dosageNotes: m.dosage_notes || '', requiresPrescription: !!m.requires_prescription, description: m.description || '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e?.target ? e.target.value : e }));

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    setAddingCategory(true);
    try {
      const res = await catalogueService.createCategory(newCategory.trim());
      await loadCategories();
      setForm((f) => ({ ...f, categoryId: String(res.data.category_id) }));
      setNewCategory('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setAddingCategory(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const min = form.minAgeYears === '' ? null : Number(form.minAgeYears);
    const max = form.maxAgeYears === '' ? null : Number(form.maxAgeYears);
    if (!form.medicineName.trim()) return setFormError('Medicine name is required.');
    if ([min, max].some((v) => v !== null && (!Number.isInteger(v) || v < 0 || v > 130))) {
      return setFormError('Ages must be whole numbers of years between 0 and 130.');
    }
    if (min !== null && max !== null && min > max) return setFormError('Minimum age cannot be above the maximum age.');

    const payload = {
      medicineName: form.medicineName.trim(),
      genericName: form.genericName.trim() || null,
      brandName: form.brandName.trim() || null,
      strength: form.strength.trim() || null,
      dosageForm: form.dosageForm.trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      indications: form.indications,
      minAgeYears: min,
      maxAgeYears: max,
      dosageNotes: form.dosageNotes.trim() || null,
      requiresPrescription: form.requiresPrescription,
      description: form.description.trim() || null,
    };
    setSaving(true);
    setFormError(null);
    try {
      const res = editingId ? await catalogueService.update(editingId, payload) : await catalogueService.create(payload);
      setFormOpen(false);
      flash(res.message || 'Saved.');
      load();
      loadCategories();
    } catch (err) {
      setFormError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  // ----- Bulk import -----

  const openImport = () => {
    setImportOpen(true);
    setImportFile(null);
    setPreview(null);
    setImportError(null);
    setImportResult(null);
  };

  const pickImportFile = async (file) => {
    if (!file) return;
    setImportFile(file);
    setPreview(null);
    setImportResult(null);
    setImportError(null);
    if (file.size > 5 * 1024 * 1024) return setImportError('The file must be 5 MB or smaller.');
    setImportBusy(true);
    try {
      const res = await catalogueService.previewImport(file);
      setPreview(res.data);
    } catch (err) {
      setImportError(err.message || 'Could not read the file.');
    } finally {
      setImportBusy(false);
    }
  };

  const runImport = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportError(null);
    try {
      const res = await catalogueService.importCatalogue(importFile);
      setImportResult(res);
      setPreview(null);
      load();
      loadCategories();
    } catch (err) {
      setImportError(err.message || 'Import failed.');
    } finally {
      setImportBusy(false);
    }
  };

  const downloadTemplate = async (format) => {
    try {
      await catalogueService.downloadTemplate(format);
    } catch (err) {
      setImportError(err.message);
    }
  };

  const invalidPreviewRows = useMemo(() => (preview?.rows || []).filter((r) => !r.isValid), [preview]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Pill className="text-[#007a55]" /> Medicines</h1>
          <p className="text-sm text-gray-500 mt-1">
            The shared catalogue pharmacies stock and patients order from. Set what each medicine treats, its category, who may take it and how.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={openImport} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#007a55] text-[#007a55] font-semibold text-sm hover:bg-[#e6f4ef]">
            <Upload size={16} /> Bulk import
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#007a55] text-white font-semibold text-sm hover:bg-[#006646]">
            <Plus size={16} /> Add medicine
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, brand, what it treats or category (typos are fine)"
            className={`${inputCls} pl-9`}
          />
        </div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${inputCls} lg:w-56`}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name} ({c.medicine_count})</option>)}
          <option value="none">No category yet</option>
        </select>
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden text-sm shrink-0">
          {[['CATALOGUE', 'Catalogue'], ['PHARMACY', 'Added by pharmacies'], ['ALL', 'All']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setScope(v)}
              className={`px-3 py-2 font-semibold ${scope === v ? 'bg-[#007a55] text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#007a55]" /></div>
        ) : error ? (
          <div className="p-6 text-red-600 flex items-center gap-2"><AlertCircle size={18} /> {error}</div>
        ) : medicines.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">No medicines found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Treats</th>
                  <th className="px-4 py-3">Ages</th>
                  <th className="px-4 py-3">Rx</th>
                  <th className="px-4 py-3">Stocked by</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {medicines.map((m) => (
                  <tr key={m.medicine_id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{m.medicine_name}</p>
                      <p className="text-xs text-gray-500">
                        {[m.strength, m.dosage_form, m.brand_name].filter(Boolean).join(' · ') || '—'}
                      </p>
                      {m.scope === 'PHARMACY' && (
                        <p className="text-xs text-amber-700 mt-0.5">Added by {m.pharmacy_name || 'a pharmacy'}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.category_name
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300"><Tag size={12} /> {m.category_name}</span>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {(m.indications || []).slice(0, 4).map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-[#e6f4ef] text-[#007a55] text-xs font-semibold">{t}</span>
                        ))}
                        {(m.indications || []).length > 4 && <span className="text-xs text-gray-500">+{m.indications.length - 4}</span>}
                        {!(m.indications || []).length && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${m.age_limit ? 'text-amber-700' : 'text-gray-500'}`}>
                        {m.age_limit && <Baby size={12} />} {ageText(m)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.requires_prescription
                        ? <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-bold">Rx</span>
                        : <span className="text-xs text-gray-400">OTC</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {m.pharmacies_stocking} {m.pharmacies_stocking === 1 ? 'pharmacy' : 'pharmacies'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(m)} className="inline-flex items-center gap-1 text-[#007a55] font-semibold text-xs hover:underline">
                        <Pencil size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > medicines.length && (
              <p className="px-4 py-3 text-xs text-gray-500">Showing {medicines.length} of {total}. Search or filter to narrow down.</p>
            )}
          </div>
        )}
      </div>

      {/* Add / edit */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editingId ? 'Edit medicine' : 'Add medicine to the catalogue'}</h2>
              <button type="button" onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              {formError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {formError}</div>}

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Medicine name *</label>
                  <input className={inputCls} value={form.medicineName} onChange={set('medicineName')} placeholder="e.g. Paracetamol 500mg Tablets" required />
                </div>
                <div>
                  <label className={labelCls}>Generic name</label>
                  <input className={inputCls} value={form.genericName} onChange={set('genericName')} placeholder="e.g. Paracetamol" />
                </div>
                <div>
                  <label className={labelCls}>Brand name</label>
                  <input className={inputCls} value={form.brandName} onChange={set('brandName')} placeholder="e.g. Panadol" />
                </div>
                <div>
                  <label className={labelCls}>Strength</label>
                  <input className={inputCls} value={form.strength} onChange={set('strength')} placeholder="e.g. 500mg" />
                </div>
                <div>
                  <label className={labelCls}>Dosage form</label>
                  <input className={inputCls} value={form.dosageForm} onChange={set('dosageForm')} list="dosage-forms" placeholder="e.g. Tablet" />
                  <datalist id="dosage-forms">{DOSAGE_FORMS.map((f) => <option key={f} value={f} />)}</datalist>
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <div className="flex gap-2">
                    <select className={inputCls} value={form.categoryId} onChange={set('categoryId')}>
                      <option value="">No category</option>
                      {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      className={inputCls}
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Or add a new category…"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                    />
                    <button type="button" onClick={addCategory} disabled={!newCategory.trim() || addingCategory} className="px-3 rounded-lg border border-[#007a55] text-[#007a55] text-sm font-semibold disabled:opacity-40">
                      {addingCategory ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>What it treats</label>
                  <TagInput value={form.indications} onChange={set('indications')} placeholder="Type a condition and press Enter, e.g. Fever, Headache" />
                  <p className="text-xs text-gray-500 mt-1">Patients can find the medicine by searching these.</p>
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Minimum age (years)</label>
                  <input className={inputCls} type="number" min="0" max="130" step="1" value={form.minAgeYears} onChange={set('minAgeYears')} placeholder="No minimum" />
                </div>
                <div>
                  <label className={labelCls}>Maximum age (years)</label>
                  <input className={inputCls} type="number" min="0" max="130" step="1" value={form.maxAgeYears} onChange={set('maxAgeYears')} placeholder="No maximum" />
                </div>
                <p className="sm:col-span-2 text-xs text-gray-500 -mt-2">
                  Patients outside these ages can't order it online, and the sales point won't sell it to them.
                </p>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Dosage notes</label>
                  <textarea className={inputCls} rows={3} value={form.dosageNotes} onChange={set('dosageNotes')} placeholder="e.g. Adults and children over 12: 1-2 tablets every 4-6 hours. No more than 8 tablets in 24 hours." />
                </div>
              </section>

              <section className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.requiresPrescription} onChange={(e) => setForm((f) => ({ ...f, requiresPrescription: e.target.checked }))} className="w-4 h-4 accent-[#007a55]" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1"><ShieldCheck size={16} /> Requires a prescription</span>
                </label>
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea className={inputCls} rows={2} value={form.description} onChange={set('description')} />
                </div>
              </section>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg bg-[#007a55] text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} {editingId ? 'Save changes' : 'Add medicine'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk import */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileSpreadsheet className="text-[#007a55]" size={20} /> Import medicines</h2>
              <button onClick={() => setImportOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <p>Upload a CSV or Excel file with one medicine per row. Only <b>Medicine name</b> is required.</p>
                <p className="text-xs text-gray-500">
                  Columns: Medicine name, Generic name, Brand name, Strength, Dosage form, Category, Treats (separate with ;), Min age, Max age, Dosage notes, Requires prescription (Yes/No), Description.
                  A medicine already in the catalogue (same name, strength, form and brand) is updated with the cells you fill in.
                </p>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => downloadTemplate('xlsx')} className="text-[#007a55] font-semibold text-sm flex items-center gap-1 hover:underline"><Download size={14} /> Excel template</button>
                  <button onClick={() => downloadTemplate('csv')} className="text-[#007a55] font-semibold text-sm flex items-center gap-1 hover:underline"><Download size={14} /> CSV template</button>
                </div>
              </div>

              <label className="block border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { pickImportFile(e.target.files?.[0]); e.target.value = ''; }}
                />
                <Upload className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{importFile ? importFile.name : 'Choose a file'}</p>
                <p className="text-xs text-gray-500">CSV, XLS or XLSX, up to 5 MB and 2,000 rows</p>
              </label>

              {importBusy && <div className="flex items-center gap-2 text-[#007a55] text-sm"><Loader2 size={16} className="animate-spin" /> Working…</div>}
              {importError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {importError}</div>}

              {preview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    {[['Rows', preview.totalRows, 'text-gray-900'], ['New', preview.toCreate, 'text-[#007a55]'], ['Updates', preview.toUpdate, 'text-blue-700'], ['With errors', preview.invalidRows, 'text-red-600']].map(([label, n, cls]) => (
                      <div key={label} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <p className={`text-xl font-bold ${cls}`}>{n}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    ))}
                  </div>

                  {invalidPreviewRows.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 max-h-48 overflow-y-auto">
                      <p className="text-sm font-bold text-red-700 mb-1">These rows will be skipped:</p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {invalidPreviewRows.map((r) => (
                          <li key={r.rowNumber}><b>Row {r.rowNumber}{r.medicineName ? ` (${r.medicineName})` : ''}:</b> {r.errors.join(' ')}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preview.validRows > 0 && (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-left text-gray-500 sticky top-0">
                          <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Medicine</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Treats</th><th className="px-3 py-2">Ages</th><th className="px-3 py-2" /></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {preview.rows.filter((r) => r.isValid).map((r) => (
                            <tr key={r.rowNumber}>
                              <td className="px-3 py-1.5 text-gray-500">{r.rowNumber}</td>
                              <td className="px-3 py-1.5 font-semibold">{r.medicineName} <span className="text-gray-500 font-normal">{[r.strength, r.dosageForm].filter(Boolean).join(' ')}</span></td>
                              <td className="px-3 py-1.5">{r.categoryName || '—'}</td>
                              <td className="px-3 py-1.5">{r.indications.join(', ') || '—'}</td>
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                {r.minAgeYears === null && r.maxAgeYears === null ? '—' : `${r.minAgeYears ?? 0}–${r.maxAgeYears ?? '∞'}`}
                              </td>
                              <td className="px-3 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded font-bold ${r.action === 'CREATE' ? 'bg-[#e6f4ef] text-[#007a55]' : 'bg-blue-50 text-blue-700'}`}>
                                  {r.action === 'CREATE' ? 'New' : 'Update'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {importResult && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  <p className="font-semibold flex items-center gap-2"><CheckCircle2 size={16} /> {importResult.message}</p>
                  {importResult.data?.errors?.length > 0 && (
                    <ul className="text-xs text-red-700 mt-2 space-y-1">
                      {importResult.data.errors.map((r) => <li key={r.row}><b>Row {r.row}:</b> {r.errors.join(' ')}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setImportOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold">
                {importResult ? 'Done' : 'Cancel'}
              </button>
              {!importResult && (
                <button
                  onClick={runImport}
                  disabled={!preview || preview.validRows === 0 || importBusy}
                  className="px-5 py-2 rounded-lg bg-[#007a55] text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {importBusy && <Loader2 size={14} className="animate-spin" />}
                  {preview ? `Import ${preview.validRows} medicine${preview.validRows === 1 ? '' : 's'}` : 'Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageMedicines;
