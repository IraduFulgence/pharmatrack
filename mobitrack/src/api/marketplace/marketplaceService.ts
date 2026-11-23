import { ApiRequest } from "../config";

// Patient side of the marketplace: browse, one-pharmacy cart, orders for pickup.

export interface CatalogueMedicine {
  medicine_id: number;
  medicine_name: string;
  generic_name?: string | null;
  brand_name?: string | null;
  strength?: string | null;
  dosage_form?: string | null;
  description?: string | null;
  requires_prescription: boolean;
}

export interface PharmacyOffer {
  pharmacy_id: number;
  pharmacy_name?: string | null;
  phone_number?: string | null;
  location_address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  available_quantity: number;
  lowest_price: number | string;
  highest_price: number | string;
}

export interface CartItem {
  item_id: number;
  medicine_id: number;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
  medicine_name: string;
  strength?: string | null;
  dosage_form?: string | null;
  requires_prescription: boolean;
}

export interface Cart {
  cart: {
    cart_id: number;
    pharmacy_id: number | null;
    pharmacy_phone?: string | null;
    pharmacy_address?: string | null;
  } | null;
  items: CartItem[];
  item_count: number;
  total: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'READY_FOR_COLLECTION'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH_ON_COLLECTION' | 'MOBILE_MONEY';
export type MobileMoneyProvider = 'MTN_MOMO' | 'AIRTEL_MONEY';

export interface OrderSummary {
  order_id: number;
  pharmacy_id: number;
  pharmacy_name?: string | null;
  pharmacy_phone?: string | null;
  pharmacy_address?: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: string;
  mobile_money_provider?: MobileMoneyProvider | null;
  total: number | string;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export interface OrderItem {
  order_item_id: number;
  medicine_id: number;
  medicine_name: string;
  strength?: string | null;
  dosage_form?: string | null;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
}

export const marketplaceService = {
  getMedicines: async (q?: string, limit = 30, offset = 0): Promise<{ data: CatalogueMedicine[]; total?: number }> => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (q?.trim()) params.set('q', q.trim());
    return ApiRequest(`/marketplace/medicines?${params.toString()}`, { method: 'GET' });
  },

  // Pharmacies that have this medicine in stock, cheapest first.
  getMedicinePharmacies: async (
    medicineId: number,
  ): Promise<{ data: { medicine: CatalogueMedicine; pharmacies: PharmacyOffer[] } }> => {
    return ApiRequest(`/marketplace/medicines/${medicineId}/pharmacies`, { method: 'GET' });
  },

  getCart: async (): Promise<{ data: Cart }> => ApiRequest('/marketplace/cart', { method: 'GET' }),

  addToCart: async (pharmacyId: number, medicineId: number, quantity: number) =>
    ApiRequest('/marketplace/cart/items', {
      method: 'POST',
      body: JSON.stringify({ pharmacyId, medicineId, quantity }),
    }),

  updateCartItem: async (itemId: number, quantity: number) =>
    ApiRequest(`/marketplace/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),

  removeCartItem: async (itemId: number) =>
    ApiRequest(`/marketplace/cart/items/${itemId}`, { method: 'DELETE' }),

  placeOrder: async (input: {
    paymentMethod: PaymentMethod;
    mobileMoneyProvider?: MobileMoneyProvider;
    paymentPhoneNumber?: string;
  }): Promise<{ data: { order: OrderSummary; total: number; payment_message: string } }> =>
    ApiRequest('/marketplace/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getOrders: async (): Promise<{ data: OrderSummary[] }> => ApiRequest('/marketplace/orders', { method: 'GET' }),

  getOrder: async (orderId: number | string): Promise<{ data: { order: OrderSummary; items: OrderItem[] } }> =>
    ApiRequest(`/marketplace/orders/${orderId}`, { method: 'GET' }),

  cancelOrder: async (orderId: number | string) =>
    ApiRequest(`/marketplace/orders/${orderId}/cancel`, { method: 'PATCH' }),
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Waiting for pharmacy', color: '#B54708', bg: '#FFFAEB' },
  ACCEPTED: { label: 'Being prepared', color: '#175CD3', bg: '#EFF8FF' },
  READY_FOR_COLLECTION: { label: 'Ready for pickup', color: '#6941C6', bg: '#F4F3FF' },
  COMPLETED: { label: 'Collected', color: '#027A48', bg: '#ECFDF3' },
  REJECTED: { label: 'Rejected', color: '#B42318', bg: '#FEF3F2' },
  CANCELLED: { label: 'Cancelled', color: '#475467', bg: '#F2F4F7' },
};

export const formatRwf = (n: number | string | null | undefined) => `${Number(n || 0).toLocaleString()} RWF`;
