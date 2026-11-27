import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ORDER_STATUS_LABEL, OrderSummary, formatRwf, marketplaceService,
} from '@/src/api/marketplace/marketplaceService';

const POLL_MS = 30000;

export default function OrdersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await marketplaceService.getOrders();
      setOrders(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('orders.loadError', 'Could not load your orders.'));
    } finally {
      loaded.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  // Refresh on focus and keep checking while open, so status changes show up.
  useFocusEffect(
    useCallback(() => {
      if (!loaded.current) setIsLoading(true);
      load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const renderOrder = ({ item }: { item: OrderSummary }) => {
    const status = ORDER_STATUS_LABEL[item.status] || { label: item.status, color: '#475467', bg: '#F2F4F7' };
    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/orders/[id]', params: { id: String(item.order_id) } })}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pharmacyName} numberOfLines={1}>{item.pharmacy_name || t('orders.pharmacy', 'Pharmacy')}</Text>
            <Text style={styles.meta}>
              #{item.order_id} · {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            {item.ordered_for_name ? (
              <Text style={styles.forText} numberOfLines={1}>
                {t('orders.forMember', { defaultValue: 'For {{name}}', name: item.ordered_for_name })}
              </Text>
            ) : null}
          </View>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.meta}>
            {item.item_count} {item.item_count === 1 ? t('orders.item', 'item') : t('orders.items', 'items')}
          </Text>
          <Text style={styles.total}>{formatRwf(item.total)}</Text>
        </View>
        {item.status === 'READY_FOR_COLLECTION' && (
          <Text style={styles.readyNote}>{t('orders.readyNote', 'Your order is ready. Go pick it up!')}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007a55" /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.order_id)}
          renderItem={renderOrder}
          contentContainerStyle={[{ padding: 16, gap: 12 }, orders.length === 0 && { flexGrow: 1 }]}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); load(); }} colors={['#007a55']} tintColor="#007a55" />
          }
          ListHeaderComponent={error ? <Text style={styles.errorText}>{error}</Text> : null}
          ListEmptyComponent={
            error ? null : (
              <View style={styles.center}>
                <Ionicons name="receipt-outline" size={48} color="#D0D5DD" />
                <Text style={styles.emptyTitle}>{t('orders.emptyTitle', 'No orders yet')}</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => router.navigate('/marketplace')}>
                  <Text style={styles.primaryButtonText}>{t('orders.browse', 'Order medicines')}</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926' },
  errorText: { color: '#B42318', marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0F2926' },

  orderCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EAECF0' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pharmacyName: { fontSize: 16, fontWeight: '700', color: '#0F2926' },
  meta: { fontSize: 12, color: '#667085', marginTop: 2 },
  forText: { fontSize: 12, color: '#175CD3', fontWeight: '600', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  total: { fontSize: 16, fontWeight: '800', color: '#007a55' },
  readyNote: { marginTop: 10, fontSize: 13, fontWeight: '600', color: '#6941C6' },

  primaryButton: { backgroundColor: '#007a55', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  primaryButtonText: { color: 'white', fontWeight: '700' },
});
