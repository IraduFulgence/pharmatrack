import { API_BASE_URL, ApiRequest } from "../config";

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
  image_url?: string | null;          // e.g. /medicines/12/image (null until a photo is uploaded)
  lowest_price?: number | string | null;
  pharmacy_count?: number;
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
  image_url?: string | null;
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
  prescription_reference?: string | null;
  has_prescription_image?: boolean;
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
  requires_prescription?: boolean;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
}

/** A photo picked on the phone, ready to upload. */
export interface PickedImage {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export interface PlaceOrderInput {
  paymentMethod: PaymentMethod;
  mobileMoneyProvider?: MobileMoneyProvider;
  paymentPhoneNumber?: string;
  prescriptionReference?: string;
  prescriptionImage?: PickedImage | null;
}

/** Full URL for an image path returned by the API (null when there is no photo). */
export const imageUri = (path?: string | null) => (path ? `${API_BASE_URL}${path}` : null);

export const marketplaceService = {
  // Only medicines that at least one approved pharmacy has in stock.
  getMedicines: async (q?: string, limit = 40, offset = 0): Promise<{ data: CatalogueMedicine[]; total?: number }> => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (q?.trim()) params.set('q', q.trim());
    return ApiRequest(`/marketplace/medicines?${params.toString()}`, { method: 'GET' });
  },

  // Medicine details plus the pharmacies that have it in stock, cheapest first.
  getMedicinePharmacies: async (
    medicineId: number | string,
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

  // Sends JSON, or multipart when a prescription photo is attached.
  placeOrder: async (
    input: PlaceOrderInput,
  ): Promise<{ data: { order: OrderSummary; total: number; payment_message: string } }> => {
    const { prescriptionImage, ...fields } = input;
    if (!prescriptionImage) {
      return ApiRequest('/marketplace/orders', { method: 'POST', body: JSON.stringify(fields) });
    }
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
    });
    const type = prescriptionImage.mimeType || 'image/jpeg';
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    // React Native's FormData takes { uri, name, type } for files.
    form.append('prescription', {
      uri: prescriptionImage.uri,
      name: prescriptionImage.fileName || `prescription.${ext}`,
      type,
    } as any);
    return ApiRequest('/marketplace/orders', { method: 'POST', body: form });
  },

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

/** Straight-line distance in km between two coordinates (haversine). */
export const distanceKm = (
  from: { latitude: number; longitude: number } | null | undefined,
  to: { latitude?: number | string | null; longitude?: number | string | null },
): number | null => {
  const lat2 = Number(to.latitude);
  const lon2 = Number(to.longitude);
  if (!from || !Number.isFinite(lat2) || !Number.isFinite(lon2)) return null;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - from.latitude);
  const dLon = rad(lon2 - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.latitude)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const formatDistance = (km: number | null) =>
  km === null ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
