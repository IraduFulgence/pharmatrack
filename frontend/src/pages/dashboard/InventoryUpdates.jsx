import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PackagePlus, PackageMinus, AlertTriangle, PackageX, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { staffService } from '../../services/staffService';

const REFRESH_MS = 60000;

const Section = ({ icon, title, tone, count, emptyText, children }) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
      <div className={`p-2 rounded-lg ${tone}`}>{icon}</div>
      <h2 className="font-semibold text-gray-900 dark:text-white flex-1">{title}</h2>
      <span className="text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{count}</span>
    </div>
    {count === 0 ? (
      <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">{emptyText}</p>
    ) : (
      <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[420px] overflow-y-auto">{children}</ul>
    )}
  </div>
);

const Row = ({ title, subtitle, right, rightSub }) => (
  <li className="flex items-start justify-between gap-3 px-4 py-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
    </div>
    <div className="text-right shrink-0">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{right}</p>
      {rightSub && <p className="text-xs text-gray-500">{rightSub}</p>}
    </div>
  </li>
);

const medName = (r) => [r.medicine_name, r.strength].filter(Boolean).join(' ');
const by = (name) => (name ? `by ${name}` : 'by pharmacy admin');

const InventoryUpdates = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await staffService.getInventoryUpdates();
      setData(res.data || {});
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load inventory updates.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const newStock = data?.newStock || [];
  const stockOut = data?.stockOut || [];
  const lowStock = data?.lowStock || [];
  const damaged = data?.damagedStock || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Updates</h1>
          <p className="text-gray-500 dark:text-gray-400">Latest stock received, sold, running low and reported damaged, and who handled it.</p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-gray-500">
              Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => { setIsRefreshing(true); load(); }}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium disabled:opacity-60"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center"><Loader2 className="animate-spin inline text-[#007a55]" /></div>
      ) : data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section
            icon={<AlertTriangle size={18} />}
            title="Low & out of stock"
            tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            count={lowStock.length}
            emptyText="Every batch is above its reorder level."
          >
            {lowStock.map((r) => (
              <Row
                key={r.inventory_id}
                title={medName(r)}
                subtitle={`Batch ${r.batch_number}${r.expiry_date ? ` · expires ${r.expiry_date}` : ''}`}
                right={
                  r.stock_status === 'OUT_OF_STOCK'
                    ? <span className="text-red-600 dark:text-red-400">Out of stock</span>
                    : `${Number(r.current_stock).toLocaleString()} left`
                }
                rightSub={`Reorder at ${Number(r.reorder_level).toLocaleString()}`}
              />
            ))}
          </Section>

          <Section
            icon={<PackageX size={18} />}
            title="Damaged stock"
            tone="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            count={damaged.length}
            emptyText="No damaged stock reported."
          >
            {damaged.map((r) => (
              <Row
                key={r.transaction_id}
                title={r.medicine_name}
                subtitle={`Batch ${r.batch_number} · ${by(r.reported_by_staff)}${r.damage_reason ? ` · ${r.damage_reason}` : ''}`}
                right={`${Number(r.damaged_quantity).toLocaleString()} units`}
                rightSub={r.reported_at}
              />
            ))}
          </Section>

          <Section
            icon={<PackagePlus size={18} />}
            title="New stock received"
            tone="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            count={newStock.length}
            emptyText="No stock received yet."
          >
            {newStock.map((r, i) => (
              <Row
                key={`${r.inventory_id}-${i}`}
                title={medName(r)}
                subtitle={`Batch ${r.batch_number} · ${by(r.received_by_staff)}`}
                right={`+${Number(r.quantity_received).toLocaleString()}`}
                rightSub={r.received_at}
              />
            ))}
          </Section>

          <Section
            icon={<PackageMinus size={18} />}
            title="Stock out (sales)"
            tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            count={stockOut.length}
            emptyText="No stock sold yet."
          >
            {stockOut.map((r) => (
              <Row
                key={r.transaction_id}
                title={medName(r)}
                subtitle={`Batch ${r.batch_number} · ${by(r.staff_name)}`}
                right={`−${Number(r.quantity_deducted).toLocaleString()}`}
                rightSub={`${Number(r.remaining_quantity).toLocaleString()} left · ${r.transaction_date}`}
              />
            ))}
          </Section>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing the most recent 15 entries per list (25 for low stock). Refreshes every minute.{' '}
        <Link to="/pharmacy/dashboard/inventory/transactions" className="text-[#007a55] hover:underline">Full transaction history</Link>
      </p>
    </div>
  );
};

export default InventoryUpdates;
