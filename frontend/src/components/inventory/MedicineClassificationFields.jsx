import React, { useEffect, useState } from 'react';
import { X, Tag, Baby } from 'lucide-react';
import { ApiRequest } from '../../services/auth';

const inputCls = 'w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-white';
const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

/** "Ages 12+", "Up to 65", "Ages 2–12", or null when anyone may take it. */
export const ageLimitText = (min, max) => {
  const lo = min === null || min === undefined || min === '' ? null : Number(min);
  const hi = max === null || max === undefined || max === '' ? null : Number(max);
  if (lo !== null && hi !== null) return `Ages ${lo}–${hi}`;
  if (lo !== null) return `Ages ${lo}+`;
  if (hi !== null) return `Up to age ${hi}`;
  return null;
};

/** Category chip, tags and age limit for a medicine row (fields as the API returns them). */
export function MedicineClassificationBadges({ medicine, maxTags = 3 }) {
  const tags = medicine?.indications || [];
  const ages = ageLimitText(medicine?.min_age_years, medicine?.max_age_years);
  if (!medicine?.category_name && tags.length === 0 && !ages) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {medicine.category_name && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          <Tag size={10} /> {medicine.category_name}
        </span>
      )}
      {tags.slice(0, maxTags).map((t) => (
        <span key={t} className="text-[11px] font-semibold text-[#007a55] bg-[#e6f4ef] dark:bg-[#007a55]/20 px-1.5 py-0.5 rounded-full">{t}</span>
      ))}
      {tags.length > maxTags && <span className="text-[11px] text-gray-500">+{tags.length - maxTags}</span>}
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${ages ? 'text-amber-700 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-500'}`}>
        {ages && <Baby size={10} />} {ages || 'All ages'}
      </span>
    </div>
  );
}

function TagInput({ value, onChange, placeholder, id }) {
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
        id={id}
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
}

/**
 * Category, tags (what it treats), age limits and dosage notes for a medicine form.
 * `value` uses: categoryId, indications (array), minAgeYears, maxAgeYears, dosageNotes.
 * `onChange` receives the changed fields only.
 */
export default function MedicineClassificationFields({ value, onChange, idPrefix = 'med' }) {
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    ApiRequest('/medicine-categories', { method: 'GET' })
      .then((res) => { if (!cancelled) setCategories(res?.data || []); })
      .catch(() => { if (!cancelled) setLoadError('Could not load categories.'); });
    return () => { cancelled = true; };
  }, []);

  const min = value.minAgeYears === '' || value.minAgeYears === null || value.minAgeYears === undefined ? null : Number(value.minAgeYears);
  const max = value.maxAgeYears === '' || value.maxAgeYears === null || value.maxAgeYears === undefined ? null : Number(value.maxAgeYears);
  const ageError = min !== null && max !== null && min > max ? 'Minimum age cannot be above the maximum age.' : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idPrefix}-category`} className={labelCls}>Category</label>
          <select
            id={`${idPrefix}-category`}
            value={value.categoryId ?? ''}
            onChange={(e) => onChange({ categoryId: e.target.value })}
            className={inputCls}
          >
            <option value="">No category</option>
            {categories.map((c) => <option key={c.category_id} value={String(c.category_id)}>{c.category_name}</option>)}
          </select>
          {loadError && <p className="text-xs text-red-600 mt-1">{loadError}</p>}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-tags`} className={labelCls}>Tags: what it treats</label>
          <TagInput
            id={`${idPrefix}-tags`}
            value={value.indications || []}
            onChange={(indications) => onChange({ indications })}
            placeholder="e.g. Fever, Headache (press Enter)"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 -mt-2">Patients find medicines by searching the category or any tag.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${idPrefix}-min-age`} className={labelCls}>Minimum age (years)</label>
          <input
            id={`${idPrefix}-min-age`}
            type="number" min="0" max="130" step="1"
            value={value.minAgeYears ?? ''}
            onChange={(e) => onChange({ minAgeYears: e.target.value })}
            placeholder="No minimum"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-max-age`} className={labelCls}>Maximum age (years)</label>
          <input
            id={`${idPrefix}-max-age`}
            type="number" min="0" max="130" step="1"
            value={value.maxAgeYears ?? ''}
            onChange={(e) => onChange({ maxAgeYears: e.target.value })}
            placeholder="No maximum"
            className={inputCls}
          />
        </div>
      </div>
      {ageError
        ? <p className="text-xs text-red-600 -mt-2" role="alert">{ageError}</p>
        : <p className="text-xs text-gray-500 -mt-2">Leave empty for no limit. Patients outside these ages can't order it online or buy it at the counter.</p>}

      <div>
        <label htmlFor={`${idPrefix}-dosage-notes`} className={labelCls}>Dosage notes</label>
        <textarea
          id={`${idPrefix}-dosage-notes`}
          rows="2"
          value={value.dosageNotes ?? ''}
          onChange={(e) => onChange({ dosageNotes: e.target.value })}
          placeholder="e.g. Adults: 1-2 tablets every 4-6 hours, at most 8 a day."
          className={`${inputCls} resize-none`}
        />
      </div>
    </div>
  );
}

/** True when the age range in a form value is valid (or empty). */
export const agesAreValid = (v) => {
  const n = (x) => (x === '' || x === null || x === undefined ? null : Number(x));
  const min = n(v.minAgeYears);
  const max = n(v.maxAgeYears);
  return min === null || max === null || min <= max;
};

/** Form value -> request fields (empty age/category become null). */
export const classificationPayload = (v) => {
  const n = (x) => (x === '' || x === null || x === undefined ? null : Number(x));
  return {
    categoryId: n(v.categoryId),
    indications: v.indications || [],
    minAgeYears: n(v.minAgeYears),
    maxAgeYears: n(v.maxAgeYears),
    dosageNotes: v.dosageNotes?.trim() || null,
  };
};
