import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ORDER_STATUS_LABEL, OrderItem, OrderStatus, OrderSummary, formatRwf, marketplaceService,
} from '@/src/api/marketplace/marketplaceService';
import { chatService } from '@/src/api/chat/chatService';

const POLL_MS = 20000;
const STEPS: OrderStatus[] = ['PENDING', 'ACCEPTED', 'READY_FOR_COLLECTION', 'COMPLETED'];
const STEP_LABEL: Record<string, string> = {
  PENDING: 'Placed',
  ACCEPTED: 'Accepted',
  READY_FOR_COLLECTION: 'Ready',
  COMPLETED: 'Collected',
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await marketplaceService.getOrder(orderId);
      setOrder(res.data.order);
      setItems(res.data.items || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('orders.loadOneError', 'Could not load this order.'));
    } finally {
      setIsLoading(false);
    }
  }, [orderId, t]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const cancel = () => {
    Alert.alert(
      t('orders.cancelTitle', 'Cancel this order?'),
      t('orders.cancelBody', 'The pharmacy will not prepare it.'),
      [
        { text: t('common.no', 'No'), style: 'cancel' },
        {
          text: t('orders.cancelConfirm', 'Cancel order'),
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await marketplaceService.cancelOrder(orderId!);
              await load();
            } catch (err: any) {
              Alert.alert(t('orders.cancelFailed', 'Could not cancel'), err?.message || '');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  };

  const messagePharmacy = async () => {
    if (!order) return;
    setIsOpeningChat(true);
    try {
      const res = await chatService.startChat(Number(order.pharmacy_id));
      router.push({
        pathname: '/chat/[id]',
        params: { id: String(res.data.chat_id), name: res.data.pharmacy_name || order.pharmacy_name || '' },
      });
    } catch (err: any) {
      Alert.alert(t('chat.openFailedTitle', 'Could not open chat'), err?.message || '');
    } finally {
      setIsOpeningChat(false);
    }
  };

  const statusStyle = order ? ORDER_STATUS_LABEL[order.status] : null;
  const status = statusStyle && order
    ? { ...statusStyle, label: t(`orders.status.${order.status}`, statusStyle.label) }
    : null;
  const stepIndex = order ? STEPS.indexOf(order.status) : -1;
  const ended = order?.status === 'REJECTED' || order?.status === 'CANCELLED';

  return (
    <SafeAreaView style={styles.container}>

      {isLoading && !order ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#007a55" /></View>
      ) : error && !order ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : order ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <View style={styles.card}>
            <View style={[styles.statusPill, { backgroundColor: status?.bg }]}>
              <Text style={[styles.statusText, { color: status?.color }]}>{status?.label || order.status}</Text>
            </View>

            {!ended && (
              <View style={styles.progress}>
                {STEPS.map((step, i) => {
                  const done = i <= stepIndex;
                  return (
                    <React.Fragment key={step}>
                      <View style={styles.step}>
                        <View style={[styles.dot, done && styles.dotDone]}>
                          {done && <Ionicons name="checkmark" size={12} color="white" />}
                        </View>
                        <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{t(`orders.step.${step}`, STEP_LABEL[step])}</Text>
                      </View>
                      {i < STEPS.length - 1 && <View style={[styles.line, i < stepIndex && styles.lineDone]} />}
                    </React.Fragment>
                  );
                })}
              </View>
            )}

            {order.status === 'READY_FOR_COLLECTION' && (
              <Text style={styles.readyNote}>{t('orders.readyLong', 'Your order is ready. Show this order number at the pharmacy to collect and pay.')}</Text>
            )}
            {order.status === 'REJECTED' && (
              <Text style={styles.rejectNote}>
                {t('orders.rejected', 'The pharmacy could not fill this order.')}
                {order.rejection_reason ? `\n${t('orders.reason', 'Reason')}: ${order.rejection_reason}` : ''}
              </Text>
            )}
          </View>

          {order.ordered_for_name ? (
            <View style={[styles.card, styles.forCard]}>
              <Ionicons name="people-outline" size={18} color="#175CD3" />
              <Text style={styles.forText}>
                {t('orders.orderedFor', { defaultValue: 'Ordered for {{name}}', name: order.ordered_for_name })}
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{order.pharmacy_name || t('orders.pharmacy', 'Pharmacy')}</Text>
            {order.pharmacy_address ? (
              <Text style={styles.meta}><Ionicons name="location-outline" size={13} /> {order.pharmacy_address}</Text>
            ) : null}
            <View style={styles.contactRow}>
              {order.pharmacy_phone ? (
                <TouchableOpacity style={styles.secondaryButton} onPress={() => Linking.openURL(`tel:${order.pharmacy_phone}`)}>
                  <Ionicons name="call-outline" size={16} color="#007a55" />
                  <Text style={styles.secondaryButtonText}>{t('orders.call', 'Call')}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.secondaryButton} onPress={messagePharmacy} disabled={isOpeningChat}>
                {isOpeningChat ? <ActivityIndicator size="small" color="#007a55" /> : <Ionicons name="chatbubble-outline" size={16} color="#007a55" />}
                <Text style={styles.secondaryButtonText}>{t('orders.message', 'Message')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('orders.items', 'Items')}</Text>
            {items.map((it) => (
              <View key={it.order_item_id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {it.medicine_name}{it.strength ? ` ${it.strength}` : ''} × {it.quantity}
                </Text>
                <Text style={styles.itemPrice}>{formatRwf(it.subtotal)}</Text>
              </View>
            ))}
            <View style={[styles.itemRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.totalLabel}>{t('orders.total', 'Total')}</Text>
              <Text style={styles.totalValue}>{formatRwf(order.total)}</Text>
            </View>
            <Text style={styles.meta}>
              {order.payment_method === 'MOBILE_MONEY'
                ? `${t('orders.mobileMoney', 'Mobile Money')}${order.mobile_money_provider ? ` (${order.mobile_money_provider === 'MTN_MOMO' ? 'MTN MoMo' : 'Airtel Money'})` : ''}`
                : t('orders.payAtPickup', 'Pay at pickup')}
              {' · '}{order.payment_status === 'PAID' ? t('orders.paid', 'Paid') : t('orders.unpaid', 'Not paid yet')}
            </Text>
          </View>

          {(order.prescription_reference || order.has_prescription_image) && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('orders.prescription', 'Prescription sent')}</Text>
              {order.prescription_reference ? (
                <Text style={styles.meta}>{t('orders.rxNumber', 'Number')}: {order.prescription_reference}</Text>
              ) : null}
              {order.has_prescription_image ? (
                <Text style={styles.meta}>{t('orders.rxPhoto', 'Photo attached')}</Text>
              ) : null}
              <Text style={styles.meta}>{t('orders.rxBring', 'Bring the original prescription when you pick up.')}</Text>
            </View>
          )}

          {order.status === 'PENDING' && (
            <TouchableOpacity style={[styles.cancelButton, isCancelling && { opacity: 0.6 }]} onPress={cancel} disabled={isCancelling}>
              {isCancelling ? <ActivityIndicator color="#B42318" /> : <Text style={styles.cancelText}>{t('orders.cancelConfirm', 'Cancel order')}</Text>}
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926' },
  errorText: { color: '#B42318', textAlign: 'center' },

  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EAECF0', gap: 8 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '700' },
  progress: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  step: { alignItems: 'center', width: 64 },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#EAECF0', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: '#007a55' },
  stepLabel: { fontSize: 11, color: '#98A2B3', marginTop: 4, textAlign: 'center' },
  stepLabelDone: { color: '#0F2926', fontWeight: '600' },
  line: { flex: 1, height: 2, backgroundColor: '#EAECF0', marginTop: 10 },
  lineDone: { backgroundColor: '#007a55' },
  readyNote: { marginTop: 8, fontSize: 14, color: '#6941C6', fontWeight: '600' },
  rejectNote: { fontSize: 14, color: '#B42318' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F2926' },
  meta: { fontSize: 13, color: '#667085' },
  forCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF8FF', borderColor: '#B2DDFF' },
  forText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#175CD3' },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, backgroundColor: '#e6f4ef',
  },
  secondaryButtonText: { color: '#007a55', fontWeight: '700' },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F2F4F7' },
  itemName: { flex: 1, fontSize: 14, color: '#0F2926' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#0F2926' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#0F2926' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#007a55' },

  cancelButton: { borderWidth: 1, borderColor: '#FECDCA', backgroundColor: '#FEF3F2', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: '#B42318', fontWeight: '700' },
});
