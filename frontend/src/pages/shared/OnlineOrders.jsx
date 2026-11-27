import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Loader2, AlertCircle, X, CheckCircle2, XCircle, PackageCheck,
  Store, RefreshCw, User, Phone, Lock, AlertTriangle, FileText, Users, Crown,
} from 'lucide-react';
// import { marketplaceService, ORDER_STATUS, PAYMENT_LABELS } from '../../services/marketplaceService';
import { marketplaceService, ORDER_STATUS, PAYMENT_LABELS } from '../../services/marketplaceService';
import { useDashboardBase } from '../../utils/dashboardBase';

const POLL_MS = 30000;

const TABS = [
  { value: 'PENDING', label: 'New' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'READY_FOR_COLLECTION', label: 'Ready for pickup' },
  { value: 'COMPLETED', label: 'Collected' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const money = (n) => `${Number(n || 0).toLocaleString()} RWF`;
const when = (v) => (v ? new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

const RELATIONSHIP = {
  HEAD: 'Head of family', SPOUSE: 'Spouse', CHILD: 'Child', PARENT: 'Parent', SIBLING: 'Sibling', OTHER: 'Relative',
};
const ageLabel = (age) => (age === null || age === undefined ? null : `${age} yr${Number(age) === 1 ? '' : 's'}`);
/**
 * Who is involved in an order, the same way for every kind of order:
 * - placed by a patient for themself,
 * - placed for a family member from the checkout picker (ordered_for_*),
 * - placed by a family manager acting for the patient (placed_by_*).
 */
const orderPeople = (o) => {
  const acting = o?.placed_by_patient_id != null && Number(o.placed_by_patient_id) !== Number(o.patient_id);
  const picked = o?.ordered_for_patient_id != null && Number(o.ordered_for_patient_id) !== Number(o.patient_id);
  const buyer = acting
    ? { id: o.placed_by_patient_id, name: o.placed_by_name, phone: o.placed_by_phone, age: null }
    : { id: o.patient_id, name: o.patient_name || `Patient #${o.patient_id}`, phone: o.patient_phone, age: o.patient_age };
  const member = acting
    ? { name: o.patient_name, relationship: o.patient_relationship, age: o.patient_age, gender: null }
    : picked
      ? { name: o.ordered_for_name, relationship: o.ordered_for_relationship, age: o.ordered_for_age, gender: o.ordered_for_gender }
      : null;
  const headId = o?.family_head_patient_id != null ? Number(o.family_head_patient_id) : null;
  return {
    buyer,
    member,
    acting,
    buyerIsHead: headId !== null && headId === Number(buyer.id),
    headName: o?.family_head_name || null,
  };
};

/** Who placed the order, who the medicine is for (with age), and their family head. */
function OrderPeople({ order, compact = false }) {
  const { buyer, member, acting, buyerIsHead, headName } = orderPeople(order);
  const relationship = (r) => (r ? RELATIONSHIP[r] || r : null);
  if (compact) {
    return (
      <>
        <p className="font-medium text-gray-900 dark:text-white">
          {buyer.name}
          {!member && ageLabel(buyer.age) && <span className="ml-1 text-xs font-normal text-gray-500">· {ageLabel(buyer.age)}</span>}
          {buyerIsHead && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded"><Crown size={10} /> Family head</span>
          )}
        </p>
        {buyer.phone && <p className="text-xs text-gray-500">{buyer.phone}</p>}
        {member && (
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mt-0.5">
            For {member.name}
            {relationship(member.relationship) ? ` (${relationship(member.relationship)})` : ''}
            {ageLabel(member.age) ? ` · ${ageLabel(member.age)}` : ''}
          </p>
        )}
        {headName && !buyerIsHead && <p className="text-xs text-gray-500">Family head: {headName}</p>}
      </>
    );
  }
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{member ? 'Ordered by' : 'Patient'}</p>
        <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
          <User size={14} /> {buyer.name}
          {!member && ageLabel(buyer.age) && <span className="font-normal text-gray-500">· {ageLabel(buyer.age)}</span>}
        </p>
        {buyer.phone && <p className="flex items-center gap-2 text-gray-500 mt-1"><Phone size={14} /> {buyer.phone}</p>}
        {acting && <p className="text-xs text-gray-500 mt-1">Placed from the family member's account, managed by this person.</p>}
      </div>
      {member && (
        <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">For family member</p>
          <p className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
            <Users size={14} /> {member.name}
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200 mt-0.5">
            {[
              relationship(member.relationship),
              ageLabel(member.age) ? `Age ${ageLabel(member.age)}` : 'Age unknown',
              member.gender || null,
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
      )}
      {headName && (
        <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Crown size={14} className="text-amber-600" />
          <span className="text-gray-500">Family head:</span> {buyerIsHead ? `${headName} (placed this order)` : headName}
        </p>
      )}
    </div>
  );
}

const StatusBadge = ({ status }) => {
  const s = ORDER_STATUS[status] || { label: status, tone: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.tone}`}>{s.label}</span>;
};

const OnlineOrders = () => {
  const navigate = useNavigate();
  const base = useDashboardBase();

  const [tab, setTab] = useState('PENDING');
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Detail modal
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [busy, setBusy] = useState(null); // 'accept' | 'reject' | 'ready'
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [rxPhotoUrl, setRxPhotoUrl] = useState(null);
  const [rxPhotoError, setRxPhotoError] = useState(null);
  const [showRxPhoto, setShowRxPhoto] = useState(false);

  const load = useCallback(async () => {
    try {
      // One call for everything: counts per tab and the current tab's list.
      const res = await marketplaceService.getOrders();
      const all = res.data || [];
      const c = {};
      all.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
      setCounts(c);
      setOrders(all);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load online orders.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const clearRxPhoto = () => {
    setRxPhotoUrl((url) => { if (url) URL.revokeObjectURL(url); return null; });
    setRxPhotoError(null);
    setShowRxPhoto(false);
  };

  const viewRxPhoto = async () => {
    setShowRxPhoto(true);
    if (rxPhotoUrl) return;
    setRxPhotoError(null);
    try {
      setRxPhotoUrl(await marketplaceService.getPrescriptionImageUrl(selectedId));
    } catch (err) {
      setRxPhotoError(err.message || 'Could not load the prescription photo.');
    }
  };

  const openOrder = async (orderId) => {
    if (orderId !== selectedId) clearRxPhoto();
    setSelectedId(orderId);
    setDetail(null);
    setDetailError(null);
    setRejecting(false);
    setReason('');
    setIsLoadingDetail(true);
    try {
      const res = await marketplaceService.getOrder(orderId);
      setDetail(res.data);
    } catch (err) {
      setDetailError(err.message || 'Failed to load the order.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeOrder = () => {
    clearRxPhoto();
    setSelectedId(null);
    setDetail(null);
  };

  const act = async (kind) => {
    const id = selectedId;
    setBusy(kind);
    setDetailError(null);
    try {
      if (kind === 'accept') await marketplaceService.acceptOrder(id);
      if (kind === 'ready') await marketplaceService.markReady(id);
      if (kind === 'reject') {
        if (reason.trim().length < 3) {
          setDetailError('Give the patient a short reason (at least 3 characters).');
          return;
        }
        await marketplaceService.rejectOrder(id, reason.trim());
      }
      const labels = { accept: 'accepted', ready: 'marked ready for pickup', reject: 'rejected' };
      setNotice(`Order #${id} ${labels[kind]}.`);
      setTimeout(() => setNotice(null), 3000);
      await load();
      if (kind === 'reject') closeOrder();
      else await openOrder(id);
    } catch (err) {
      setDetailError(err.message || 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const sellAtPos = () => navigate(`${base}/sales/pos`, { state: { marketplaceOrderId: selectedId } });

  const visible = orders.filter((o) => o.status === tab);
  const order = detail?.order;

  return (
    <div className="space-y-6 max-w-8xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Online Orders</h1>
          {/* <p className="text-gray-500 dark:text-gray-400">Orders patients placed from the mobile app for pickup at your pharmacy.</p> */}
        </div>
        <button
          onClick={() => { setIsLoading(true); load(); }}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
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

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === t.value ? 'border-[#007a55] text-[#007a55]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
            {counts[t.value] > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${t.value === 'PENDING' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                {counts[t.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {isLoading && orders.length === 0 ? (
          <div className="py-16 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400">
            <ShoppingBag className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="text-sm">No {TABS.find((t) => t.value === tab)?.label.toLowerCase()} orders.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {visible.map((o) => (
                  <tr key={o.order_id} onClick={() => openOrder(o.order_id)} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-[#007a55]">
                      #{o.order_id}
                      {o.requires_prescription && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded"><Lock size={10} /> Rx</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <OrderPeople order={o} compact />
                    </td>
                    <td className="px-4 py-3 text-right">{o.item_count}</td>
                    <td className="px-4 py-3 text-right font-medium">{money(o.total)}</td>
                    <td className="px-4 py-3 text-xs">{PAYMENT_LABELS[o.payment_method] || o.payment_method}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{when(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-gray-900 dark:text-white">Order #{selectedId}</h2>
                {order && <StatusBadge status={order.status} />}
              </div>
              <button onClick={closeOrder} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close"><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {isLoadingDetail ? (
                <div className="py-10 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
              ) : order ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <OrderPeople order={order} />
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
                      <p><span className="text-gray-500">Payment:</span> {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                        {order.mobile_money_provider ? ` (${order.mobile_money_provider.replace('_', ' ')})` : ''}</p>
                      <p><span className="text-gray-500">Placed:</span> {when(order.created_at)}</p>
                    </div>
                  </div>

                  {(order.prescription_reference || order.has_prescription_image) && (
                    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm space-y-2">
                      <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><FileText size={14} /> Prescription from the patient</p>
                      {order.prescription_reference && (
                        <p className="text-gray-700 dark:text-gray-300">Number / SMS code: <span className="font-mono font-semibold">{order.prescription_reference}</span></p>
                      )}
                      {order.has_prescription_image && (
                        showRxPhoto ? (
                          rxPhotoError ? (
                            <p className="text-red-600">{rxPhotoError}</p>
                          ) : rxPhotoUrl ? (
                            <a href={rxPhotoUrl} target="_blank" rel="noreferrer">
                              <img src={rxPhotoUrl} alt="Prescription sent by the patient" className="max-h-80 rounded-lg border border-gray-200 dark:border-gray-700" />
                            </a>
                          ) : (
                            <Loader2 className="animate-spin text-[#007a55]" size={18} />
                          )
                        ) : (
                          <button onClick={viewRxPhoto} className="text-[#007a55] font-semibold hover:underline">View prescription photo</button>
                        )
                      )}
                      <p className="text-xs text-gray-500">Check it before accepting. At pickup, the sales point checks the number again and asks for the original.</p>
                    </div>
                  )}

                  {order.status === 'REJECTED' && order.rejection_reason && (
                    <p className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">Rejected: {order.rejection_reason}</p>
                  )}

                  {!detail.all_items_in_stock && ['PENDING', 'ACCEPTED', 'READY_FOR_COLLECTION'].includes(order.status) && (
                    <p className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-300">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" /> Some medicines are short in stock. Check the quantities below before accepting.
                    </p>
                  )}

                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-gray-500">
                      <tr>
                        <th className="text-left py-2">Medicine</th>
                        <th className="text-right py-2">Qty</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                      {detail.items.map((it) => (
                        <tr key={it.order_item_id}>
                          <td className="py-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {it.medicine_name} {it.strength}
                              {it.requires_prescription && <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Rx</span>}
                            </p>
                            {it.short_by > 0 ? (
                              <p className="text-xs text-red-600">Short by {it.short_by} in stock</p>
                            ) : (
                              <p className="text-xs text-gray-500">In stock</p>
                            )}
                          </td>
                          <td className="py-2 text-right">{it.quantity}</td>
                          <td className="py-2 text-right">{money(it.unit_price)}</td>
                          <td className="py-2 text-right font-medium">{money(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="pt-3 text-right font-semibold text-gray-900 dark:text-white">Total</td>
                        <td className="pt-3 text-right font-bold text-[#007a55]">{money(order.total)}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {detail.items.some((it) => it.requires_prescription) && !order.prescription_reference && !order.has_prescription_image && ['PENDING', 'ACCEPTED', 'READY_FOR_COLLECTION'].includes(order.status) && (
                    <p className="text-xs text-gray-500">This order has prescription-only medicine. You'll need the patient's prescription number at pickup.</p>
                  )}

                  {rejecting && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reason (the patient sees this)
                      <textarea
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={500}
                        placeholder="e.g. Amoxicillin is out of stock until Friday"
                        className="mt-1 w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#007a55] focus:outline-none"
                      />
                    </label>
                  )}
                </>
              ) : null}

              {detailError && (
                <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16} /> {detailError}</p>
              )}
            </div>

            {order && (
              <div className="flex flex-wrap justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
                {order.status === 'PENDING' && !rejecting && (
                  <>
                    <button onClick={() => setRejecting(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                      <XCircle size={16} /> Reject
                    </button>
                    <button onClick={() => act('accept')} disabled={!!busy} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#007a55] text-white hover:bg-[#006645] disabled:opacity-60">
                      {busy === 'accept' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Accept
                    </button>
                  </>
                )}
                {order.status === 'PENDING' && rejecting && (
                  <>
                    <button onClick={() => setRejecting(false)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Back</button>
                    <button onClick={() => act('reject')} disabled={!!busy} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                      {busy === 'reject' && <Loader2 size={16} className="animate-spin" />} Reject order
                    </button>
                  </>
                )}
                {order.status === 'ACCEPTED' && (
                  <button onClick={() => act('ready')} disabled={!!busy} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60">
                    {busy === 'ready' ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />} Mark ready for pickup
                  </button>
                )}
                {(order.status === 'ACCEPTED' || order.status === 'READY_FOR_COLLECTION') && (
                  <button onClick={sellAtPos} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#007a55] text-white hover:bg-[#006645]">
                    <Store size={16} /> Patient is here: sell at POS
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineOrders;
