import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Globe, Loader2, AlertCircle, Search, Check, X, Pencil, Lock, ImagePlus, Pill } from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Product photo with a placeholder when there is none (or it fails to load).
const Thumb = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className="w-12 h-12 rounded-lg bg-[#e6f4ef] dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
      {src && !failed
        ? <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setFailed(true)} />
        : <Pill size={20} className="text-[#7FBFA9]" />}
    </div>
  );
};

const money = (n) => (n === null || n === undefined ? '—' : `${Number(n).toLocaleString()} RWF`);

const OnlineCatalogue = () => {
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // { id, value }
  const [rowError, setRowError] = useState({});
  const [uploadingId, setUploadingId] = useState(null);
  const [imageVersion, setImageVersion] = useState({}); // medicine_id -> timestamp of last upload
  const fileInput = useRef(null);
  const uploadTarget = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await marketplaceService.getMedicines();
      setMedicines(res.data?.medicines || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load your online catalogue.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter((m) =>
      [m.medicine_name, m.generic_name, m.brand_name].some((v) => v && v.toLowerCase().includes(q)),
    );
  }, [medicines, query]);

  const onlineCount = medicines.filter((m) => m.available).length;

  const setRowErr = (id, msg) => setRowError((e) => ({ ...e, [id]: msg }));

  const toggle = async (m) => {
    setBusyId(m.medicine_id);
    setRowErr(m.medicine_id, null);
    try {
      await marketplaceService.setAvailability(m.medicine_id, !m.available);
      setMedicines((list) => list.map((x) => (x.medicine_id === m.medicine_id ? { ...x, available: !m.available } : x)));
    } catch (err) {
      setRowErr(m.medicine_id, err.message || 'Could not update.');
    } finally {
      setBusyId(null);
    }
  };

  const chooseImage = (medicineId) => {
    uploadTarget.current = medicineId;
    fileInput.current?.click();
  };

  const onImagePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    const id = uploadTarget.current;
    if (!file || !id) return;
    setRowErr(id, null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setRowErr(id, 'Use a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setRowErr(id, 'The photo must be 5 MB or smaller.');
      return;
    }
    setUploadingId(id);
    try {
      await marketplaceService.uploadMedicineImage(id, file);
      const url = `/medicines/${id}/image`;
      setMedicines((list) => list.map((x) => (x.medicine_id === id ? { ...x, image_url: url } : x)));
      setImageVersion((v) => ({ ...v, [id]: Date.now() }));
    } catch (err) {
      setRowErr(id, err.message || 'Could not upload the photo.');
    } finally {
      setUploadingId(null);
    }
  };

  const savePrice = async () => {
    const { id, value } = editing;
    const price = Number(value);
    if (!Number.isFinite(price) || price <= 0) {
      setRowErr(id, 'Enter a price above 0.');
      return;
    }
    setBusyId(id);
    setRowErr(id, null);
    try {
      await marketplaceService.setPrice(id, price);
      setMedicines((list) => list.map((x) => (x.medicine_id === id ? { ...x, lowest_price: price, highest_price: price } : x)));
      setEditing(null);
    } catch (err) {
      setRowErr(id, err.message || 'Could not update the price.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-8xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Online Catalogue</h1>
        {/* <p className="text-gray-500 dark:text-gray-400">
          Medicines patients can order from you in the mobile app. {medicines.length > 0 && `${onlineCount} of ${medicines.length} are online.`}
        </p> */}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onImagePicked}
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search medicines…"
          className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#007a55] focus:outline-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400">
            <Globe className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="text-sm">{medicines.length === 0 ? 'No medicines in stock yet. Stock you receive shows up here.' : 'No medicines match your search.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Photo</th>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3 text-right">In stock</th>
                  <th className="px-4 py-3 text-right">Online price</th>
                  <th className="px-4 py-3">Shown online</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {visible.map((m) => {
                  const isEditing = editing?.id === m.medicine_id;
                  const priceText = Number(m.lowest_price) === Number(m.highest_price)
                    ? money(m.lowest_price)
                    : `${money(m.lowest_price)} – ${money(m.highest_price)}`;
                  return (
                    <tr key={m.medicine_id} className={m.available ? '' : 'opacity-60'}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Thumb src={marketplaceService.imageSrc(m.image_url, imageVersion[m.medicine_id])} alt={m.medicine_name} />
                          <button
                            onClick={() => chooseImage(m.medicine_id)}
                            disabled={uploadingId === m.medicine_id}
                            className="flex items-center gap-1 text-xs font-semibold text-[#007a55] hover:underline disabled:opacity-50"
                            title={m.image_url ? 'Replace photo' : 'Add photo'}
                          >
                            {uploadingId === m.medicine_id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <ImagePlus size={14} />}
                            {m.image_url ? 'Change' : 'Add'}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {m.medicine_name} {m.strength}
                          {m.requires_prescription && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded"><Lock size={10} /> Rx</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{[m.generic_name, m.dosage_form].filter(Boolean).join(' · ')}</p>
                        {rowError[m.medicine_id] && <p className="text-xs text-red-600 mt-1">{rowError[m.medicine_id]}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">{Number(m.available_quantity).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number" min="1" step="1" autoFocus
                              value={editing.value}
                              onChange={(e) => setEditing({ id: m.medicine_id, value: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') savePrice(); if (e.key === 'Escape') setEditing(null); }}
                              className="w-28 text-right bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
                            />
                            <button onClick={savePrice} disabled={busyId === m.medicine_id} className="p-1 text-[#007a55]" aria-label="Save price">
                              {busyId === m.medicine_id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            </button>
                            <button onClick={() => setEditing(null)} className="p-1 text-gray-400" aria-label="Cancel"><X size={16} /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditing({ id: m.medicine_id, value: String(Number(m.lowest_price) || '') })}
                            className="inline-flex items-center gap-1 hover:text-[#007a55]"
                            title="Change price"
                          >
                            {priceText} <Pencil size={12} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggle(m)}
                          disabled={busyId === m.medicine_id}
                          role="switch"
                          aria-checked={!!m.available}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${m.available ? 'bg-[#007a55]' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${m.available ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* <p className="text-xs text-gray-500 dark:text-gray-400">
        Changing the online price updates the selling price of all current batches, so it also applies at your sales point. Hiding a medicine online doesn't affect in-store sales.
        Photos (JPEG, PNG or WebP, up to 5 MB) are shared: every pharmacy selling that medicine and every patient sees the same photo.
      </p> */}
    </div>
  );
};

export default OnlineCatalogue;
